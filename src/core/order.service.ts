import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BinanceClientService } from 'src/config/binanceClient';
import { ProviderService } from 'src/config/provider';
import { TokenContractService } from 'src/contract/tokenContract.service';
import { Side, OrderType, TimeInForce } from '@binance/connector-typescript';
import { BiswapService } from 'src/contract/biswap.service';
import { Interval, Timeout } from '@nestjs/schedule';
import { PriceService } from './price.service';
import { calculatePriceImpact } from 'src/utils/calculator';
import { parseUnits, MaxInt256, formatUnits } from 'ethers';
import { PriceHistory } from 'src/entities/priceHistory.entity';
import { Repository } from 'typeorm';
import { PairAddress, Pairs } from 'src/constants/pairs';
import { INPUT, TOKEN_B_INPUT, TRADE_FEE_RATE } from 'src/constants/order';
import { OrderHistory } from 'src/entities/orderHistory.entity';
import { SheetsService } from 'src/periphery/sheets.service';
import { LoggerService } from 'src/config/logger/logger.service';
import { Pair } from './pair';

@Injectable()
export class OrderService {
  /**
   * 페어 인덱스
   */
  private pairIndex = 0; // ['NEAR/BNB', 'SAND/USDT', 'SAND/ETH', 'NEAR/USDT'];
  private orderLock = false;

  constructor(
    @Inject(LoggerService)
    private readonly logger: LoggerService,
    @Inject(PriceService)
    private readonly priceService: PriceService,
    @Inject(ProviderService)
    private readonly providerService: ProviderService,
    @Inject(BinanceClientService)
    private readonly binanceClientService: BinanceClientService,
    @Inject(TokenContractService)
    private readonly tokenContractService: TokenContractService,
    @Inject(BiswapService)
    private readonly biswapService: BiswapService,
    @Inject(SheetsService)
    private readonly sheetsService: SheetsService,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
    @InjectRepository(OrderHistory)
    private readonly orderHistoryRepository: Repository<OrderHistory>,
  ) {}

  test() {
    try {
      // this.order('NEARBNB', 1, 0.013700);
      // this.withdraw('BNB', 0.04, 'BSC');
      // this.withdraw('NEAR', 0.04, 'BSC');
    } catch (err) {
      console.log(err);
    }
  }

  @Timeout(0)
  async initPair() {
    const pair = Pairs[this.pairIndex];

    const baseTokenContract = this.tokenContractService.getContract(
      pair.token0.address,
    );
    const quoteTokenContract = this.tokenContractService.getContract(
      pair.token1.address,
    );

    const routerAddress = await this.biswapService.biswapRouter.getAddress();

    for (const tokenContract of [baseTokenContract, quoteTokenContract]) {
      let allowanceToRouter = await this.tokenContractService.allowance(
        tokenContract,
        routerAddress,
      );

      this.logger.log(`[initPair] Allowance to pair: ${allowanceToRouter}`);

      if (allowanceToRouter <= 0) {
        this.logger.log(`[initPair] Infinite Approve to Pair for ${pair}`);
        await this.tokenContractService.approve(
          tokenContract,
          routerAddress,
          MaxInt256,
        );
        allowanceToRouter = await this.tokenContractService.allowance(
          tokenContract,
          routerAddress,
        );
        this.logger.log(
          `[initPair] Allowance to Router after Approve: ${allowanceToRouter}`,
        );
      }
    }
  }

  @Timeout(2_000)
  async runner() {
    // const { cexPrice, dexPrice, totalFee, amountIn, amountOut } =
    //   await this.priceService.getPrice(Pairs[this.pairIndex], INPUT);

    await this.binanceToDEX();
    // await this.DEXToBinance();

    setTimeout(() => this.runner(), 2_000);
  }

  async binanceToDEX() {
    const currentDate = new Date();
    const pair = new Pair(Pairs[this.pairIndex]);

    try {
      console.time(`[binanceToDEX] getPrice time ${currentDate.getTime()}`);
      const { cexPrice, dexPrice, totalFee, amountIn, amountOut } =
        await this.priceService.getPrice(pair, INPUT);
      console.timeEnd(`[binanceToDEX] getPrice time ${currentDate.getTime()}`);

      const profit = (dexPrice - cexPrice) * INPUT;
      const profitRate = dexPrice / cexPrice - 1;

      this.logger.log(
        `${pair.getName()} profit: ${profit}, cost: ${totalFee}, profit - cost: ${profit - totalFee} profitRate: ${profitRate}`,
        'binanceToDEX',
      );

      const priceHistory = await this.priceHistoryRepository.save({
        pair: pair.name,
        currentDate,
        input: INPUT,
        dexPrice,
        cexPrice,
        profit: profit,
        cost: totalFee,
        chance: profit > totalFee,
      });

      if (profit < totalFee || this.orderLock) {
        return;
      }
      this.orderLock = true;

      const binanceAccountInfo =
        await this.binanceClientService.client.userAsset();
      const cexBalance = binanceAccountInfo.find(
        (balance) =>
          balance.asset === pair.token1.symbol ||
          balance.asset === pair.token1.ex_symbol,
      ).free;

      const tokenContract = this.tokenContractService.getContract(
        pair.token0.address,
      );
      const dexBalance = formatUnits(
        (await this.tokenContractService.balance(tokenContract)).toString(),
        pair.token1.decimals,
      );

      // CEX Order
      const orderResult = await this.order(
        `${pair.token0.ex_symbol}${pair.token1.ex_symbol}`,
        INPUT,
        cexPrice,
      );

      // DEX Swap
      const swapResult = await this.biswapService.swapExactTokensForTokens(
        amountIn,
        amountOut,
        [pair.token0.address, pair.token1.address],
      );

      const orderHistory = await this.orderHistoryRepository.save({
        priceId: priceHistory.id,
        pair: pair.name,
        currentDate,
        profit,
        cost: totalFee,
        orderId: orderResult.clientOrderId,
        swapTxHash: swapResult.hash,
      });

      await this.sheetsService.appendRow({
        date: currentDate,
        pair: pair.name,
        input: INPUT,
        cex_price: cexPrice,
        dex_price: dexPrice,
        cost: totalFee,
        cex_balance: cexBalance,
        dex_balance: dexBalance,
      });

      swapResult.wait().then((result) => {
        this.orderHistoryRepository.update(orderHistory.id, {
          swapSuccess: true,
        });
      });
    } catch (err) {
      this.logger.error(err.message, err.trace);
    } finally {
      this.orderLock = false;
    }
  }

  async DEXToBinance() {
    const currentDate = new Date();
    const pairObj = {
      ...Pairs[this.pairIndex],
    };

    const temp = pairObj.token0;
    pairObj.token0 = pairObj.token1;
    pairObj.token1 = temp;

    const pair = new Pair(pairObj);

    try {
      console.time(`[DEXToBinance] getPrice time ${currentDate.getTime()}`);
      const { cexPrice, dexPrice, totalFee, amountIn, amountOut } =
        await this.priceService.getPriceByReserve(pair, TOKEN_B_INPUT);
      console.timeEnd(`[DEXToBinance] getPrice time ${currentDate.getTime()}`);

      const profit = (cexPrice - dexPrice) * TOKEN_B_INPUT;
      const profitRate = cexPrice / dexPrice - 1;

      console.log(
        `[DEXToBinance] profit: ${profit}, cost: ${totalFee}, profit - cost: ${profit - totalFee} profitRate: ${profitRate}`,
      );

      const priceHistory = await this.priceHistoryRepository.save({
        pair: pair.name,
        currentDate,
        input: INPUT,
        dexPrice,
        cexPrice,
        profit: profit,
        cost: totalFee,
        chance: profit > totalFee,
      });

      if (profit < totalFee || this.orderLock) {
        return;
      }
    } catch (err) {
      console.error(err);
    }
    //   this.orderLock = true;

    //   const binanceAccountInfo =
    //     await this.binanceClientService.client.userAsset();
    //   const cexBalance = binanceAccountInfo.find(
    //     (balance) =>
    //       balance.asset === pair.token1.symbol ||
    //       balance.asset === pair.token1.ex_symbol,
    //   ).free;

    //   const tokenContract = this.tokenContractService.getContract(
    //     pair.token1.address,
    //   );
    //   const dexBalance = formatUnits(
    //     (await this.tokenContractService.balance(tokenContract)).toString(),
    //     pair.token1.decimals,
    //   );

    //   // CEX Order
    //   const orderResult = await this.order(
    //     `${pair.token0.ex_symbol}${pair.token1.ex_symbol}`,
    //     INPUT,
    //     cexPrice,
    //   );

    //   // DEX Swap
    //   const swapResult = await this.biswapService.swapExactTokensForTokens(
    //     amountIn,
    //     amountOut,
    //     [pair.token0.address, pair.token1.address],
    //   );

    //   const orderHistory = await this.orderHistoryRepository.save({
    //     priceId: priceHistory.id,
    //     pair: pair.name,
    //     currentDate,
    //     profit,
    //     cost: totalFee,
    //     orderId: orderResult.clientOrderId,
    //     swapTxHash: swapResult.hash,
    //   });

    //   await this.sheetsService.appendRow({
    //     date: currentDate,
    //     pair: pair.name,
    //     input: INPUT,
    //     cex_price: cexPrice,
    //     dex_price: dexPrice,
    //     cost: totalFee,
    //     cex_balance: cexBalance,
    //     dex_balance: dexBalance,
    //   });

    //   swapResult.wait().then((result) => {
    //     this.orderHistoryRepository.update(orderHistory.id, {
    //       swapSuccess: true,
    //     });
    //   });
    // } catch (err) {
    //   console.log(err);
    // } finally {
    //   this.orderLock = false;
    // }
  }

  private async order(
    symbol: string,
    output: number,
    CEXPrice: number,
  ): Promise<any> {
    // input: 코인 개수 (decimal X)
    // CEXPrice: 해당 토큰 가격
    const result = await this.binanceClientService.client.newOrder(
      symbol,
      Side.BUY,
      OrderType.LIMIT,
      { quantity: output, price: CEXPrice, timeInForce: TimeInForce.GTC },
    );

    return result;
  }

  private async withdraw(
    token: string,
    // to: string,
    amount: number,
    network: string,
  ): Promise<any> {
    const result = await this.binanceClientService.client.withdraw(
      token,
      process.env.WALLET_ADDRESS,
      amount,
      {
        network,
      },
    );

    return result;
  }

  private async deposit(token: string, to: string, amount: number) {
    const tokenContract = this.tokenContractService.getContract(token);
  }

  async cancelOrder(pair: string, orderId: number): Promise<any> {
    const result = await this.binanceClientService.client.cancelOrder(pair, {
      orderId,
    });

    console.log(`[CancelOrder] ${result}`);

    return result;
  }

  async transferERC20(to: string, from: string, amount: number) {}

  async getCEXBalance(tokenSymbol: string) {}
}
