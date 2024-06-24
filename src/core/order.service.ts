import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BinanceClientService } from 'src/infra/binanceClient.service';
import { TokenContractService } from 'src/contract/tokenContract.service';
import { Side, OrderType, TimeInForce } from '@binance/connector-typescript';
import { BiswapService } from 'src/contract/biswap.service';
import { PriceService } from './price.service';
import { MaxInt256, formatUnits } from 'ethers';
import { OrderHistory, PriceHistory } from 'src/infra/db/entities';
import { Repository } from 'typeorm';
import { SheetsService } from 'src/periphery/sheets.service';
import { LoggerService } from 'src/infra/logger/logger.service';
import { Pair } from './pair';
import { OrderDTO } from './core.dto';

@Injectable()
export class OrderService {
  private orderLock = false;

  constructor(
    private readonly logger: LoggerService,
    @Inject(PriceService)
    private readonly priceService: PriceService,
    private readonly binanceClientService: BinanceClientService,
    @Inject(TokenContractService)
    private readonly tokenContractService: TokenContractService,
    @Inject(BiswapService)
    private readonly biswapService: BiswapService,
    @Inject(SheetsService)
    private readonly sheetsService: SheetsService,
    @InjectRepository(OrderHistory)
    private readonly orderHistoryRepository: Repository<OrderHistory>,
  ) {}

  async binanceToDEX(
    pair: Pair,
    input: number,
    { cexPrice, dexPrice, totalCost, amountIn, amountOut }: OrderDTO,
  ) {
    const currentDate = new Date();

    try {
      const profit = (dexPrice - cexPrice) * input;

      if (profit < totalCost || this.orderLock) {
        return;
      }
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(
          'this is not production. No make order',
          'binanceToDEX',
        );
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
        input,
        cexPrice,
      );

      // DEX Swap
      const swapResult = await this.biswapService.swapExactTokensForTokens(
        amountIn,
        amountOut,
        [pair.token0.address, pair.token1.address],
      );

      const orderHistory = await this.orderHistoryRepository.save({
        pair: pair.name,
        currentDate,
        profit,
        cost: totalCost,
        orderId: orderResult.clientOrderId,
        swapTxHash: swapResult.hash,
      });

      await this.sheetsService.appendRow({
        date: currentDate,
        pair: pair.name,
        input: input,
        cex_price: cexPrice,
        dex_price: dexPrice,
        cost: totalCost,
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
      throw err;
    } finally {
      this.orderLock = false;
    }
  }

  // async DEXToBinance() {
  //   const currentDate = new Date();
  //   const pairObj = {
  //     ...this.pairs[this.pairIndex],
  //   };

  //   const temp = pairObj.token0;
  //   pairObj.token0 = pairObj.token1;
  //   pairObj.token1 = temp;

  //   const pair = new Pair(pairObj);

  //   try {
  //     console.time(`[DEXToBinance] getPrice time ${currentDate.getTime()}`);
  //     const { cexPrice, dexPrice, totalCost, amountIn, amountOut } =
  //       await this.priceService.getPriceByReserve(pair, TOKEN_B_INPUT);
  //     console.timeEnd(`[DEXToBinance] getPrice time ${currentDate.getTime()}`);

  //     const profit = (cexPrice - dexPrice) * TOKEN_B_INPUT;
  //     const profitRate = cexPrice / dexPrice - 1;

  //     console.log(
  //       `[DEXToBinance] profit: ${profit}, cost: ${totalCost}, profit - cost: ${profit - totalCost} profitRate: ${profitRate}`,
  //     );

  //     const priceHistory = await this.priceHistoryRepository.save({
  //       pair: pair.name,
  //       currentDate,
  //       input: INPUT,
  //       dexPrice,
  //       cexPrice,
  //       profit: profit,
  //       cost: totalCost,
  //       chance: profit > totalCost,
  //     });

  //     if (profit < totalCost || this.orderLock) {
  //       return;
  //     }
  //     if (process.env.NODE_ENV !== 'production') {
  //       this.logger.log(
  //         'this is not production. No make order',
  //         'DEXToBinance',
  //       );
  //       return;
  //     }
  //   } catch (err) {
  //     console.error(err);
  //   }
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
  //     cost: totalCost,
  //     orderId: orderResult.clientOrderId,
  //     swapTxHash: swapResult.hash,
  //   });

  //   await this.sheetsService.appendRow({
  //     date: currentDate,
  //     pair: pair.name,
  //     input: INPUT,
  //     cex_price: cexPrice,
  //     dex_price: dexPrice,
  //     cost: totalCost,
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
  // }

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
