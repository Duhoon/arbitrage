import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BinanceClientService } from 'src/config/binanceClient';
import { ProviderService } from 'src/config/provider';
import { TokenContractService } from 'src/contract/tokenContract.service';
import { Side, OrderType, TimeInForce } from '@binance/connector-typescript';
import { BiswapService } from 'src/contract/biswap.service';
import { TokenService } from './token.service';
import { Interval, Timeout } from '@nestjs/schedule';
import { PriceService } from './price.service';
import { calculatePriceImpact } from 'src/utils/calculator';
import { parseUnits, MaxInt256, formatUnits } from 'ethers';
import { PriceHistory } from 'src/entities/priceHistory.entity';
import { Repository } from 'typeorm';
import { PairAddress } from 'src/constants/pairs';
import { INPUT, TRADE_FEE_RATE } from 'src/constants/order';
import { OrderHistory } from 'src/entities/orderHistory.entity';
import { SheetsService } from 'src/periphery/sheets.service';

@Injectable()
export class OrderService {
  private pairIndex = 0; // ['NEAR/BNB', 'SAND/USDT', 'SAND/ETH', 'NEAR/USDT'];
  private orderLock = false;

  constructor(
    @Inject(PriceService)
    private readonly priceService: PriceService,
    @Inject(ProviderService)
    private readonly providerService: ProviderService,
    @Inject(TokenService)
    private readonly tokenService: TokenService,
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
    const pair = this.tokenService.pairs.CEXPairs[this.pairIndex];
    const [baseTokenInfo, quoteTokenInfo] =
      this.tokenService.getTokensInfo(pair);

    const baseTokenContract = this.tokenContractService.getContract(
      baseTokenInfo.address,
    );

    // const pairAddress = PairAddress[pair];
    const routerAddress = await this.biswapService.biswapRouter.getAddress();

    let allowanceToRouter = await this.tokenContractService.allowance(
      baseTokenContract,
      routerAddress,
    );

    console.log(`[initPair] Allowance to pair: ${allowanceToRouter}`);

    if (allowanceToRouter <= 0) {
      console.log(`[initPair] Infinite Approve to Pair for ${pair}`);
      await this.tokenContractService.approve(
        baseTokenContract,
        routerAddress,
        MaxInt256,
      );
      allowanceToRouter = await this.tokenContractService.allowance(
        baseTokenContract,
        routerAddress,
      );
      console.log(
        `[initPair] Allowance to Router after Approve: ${allowanceToRouter}`,
      );
    }
  }

  @Interval(2_000)
  async binanceToDEX() {
    const currentDate = new Date();
    const CEXPair = this.tokenService.pairs.CEXPairs[this.pairIndex];
    const [baseTokenInfo, quoteTokenInfo] =
      this.tokenService.getTokensInfo(CEXPair);

    try {
      console.time('[binanceToDEX] getPrice time');
      const [CEXPrice, DEXPrice, cost] = await this.priceService.getPrice();
      console.timeEnd('[binanceToDEX] getPrice time');

      const profit = (DEXPrice - CEXPrice) * INPUT;
      const profitRate = DEXPrice / CEXPrice - 1;

      console.log(
        `[BinanceToDEX] profit: ${profit}, cost: ${cost}, profit - cost: ${profit - cost} profitRate: ${profitRate}`,
      );

      const priceHistory = await this.priceHistoryRepository.save({
        pair: CEXPair,
        currentDate,
        input: INPUT,
        dexPrice: DEXPrice,
        cexPrice: CEXPrice,
        profit: profit,
        cost: cost,
        chance: profit > cost,
      });

      if (profit < cost || this.orderLock) {
        return;
      }
      this.orderLock = true;

      const binanceAccountInfo =
        await this.binanceClientService.client.userAsset();
      const cexBalance = binanceAccountInfo.find(
        (balance) =>
          balance.asset === quoteTokenInfo.symbol ||
          balance.asset === quoteTokenInfo.ex_symbol,
      ).free;

      const tokenContract = this.tokenContractService.getContract(
        quoteTokenInfo.address,
      );
      const dexBalance = formatUnits(
        (await this.tokenContractService.balance(tokenContract)).toString(),
        quoteTokenInfo.decimals,
      );

      // CEX Order
      const orderResult = await this.order(
        `${baseTokenInfo.ex_symbol}${quoteTokenInfo.ex_symbol}`,
        INPUT,
        CEXPrice,
      );

      // DEX Swap
      const [amountIn, amountOut] = await this.biswapService.getAmountOut(
        parseUnits(INPUT.toString(), baseTokenInfo.decimals),
        baseTokenInfo.address,
        quoteTokenInfo.address,
      );

      const swapResult = await this.biswapService.swapExactTokensForTokens(
        amountIn,
        amountOut,
        [baseTokenInfo.address, quoteTokenInfo.address],
      );

      const orderHistory = await this.orderHistoryRepository.save({
        priceId: priceHistory.id,
        pair: CEXPair,
        currentDate,
        profit,
        cost,
        orderId: orderResult.clientOrderId,
        swapTxHash: swapResult.hash,
      });

      await this.sheetsService.appendRow({
        date: currentDate,
        pair: CEXPair,
        input: INPUT,
        cex_price: CEXPrice,
        dex_price: DEXPrice,
        cost: cost,
        cex_balance: cexBalance,
        dex_balance: dexBalance,
      });

      swapResult.wait().then((result) => {
        this.orderHistoryRepository.update(orderHistory.id, {
          swapSuccess: true,
        });
      });
    } catch (err) {
      console.log(err);
    } finally {
      this.orderLock = false;
    }
  }

  async DEXToBinance(symbol: string, input: number, price: number) {}

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

  async calculateCostByBaseToken(pair: string, input: number): Promise<number> {
    const [baseTokenInfo, quoteTokenInfo] =
      this.tokenService.getTokensInfo(pair);
    const pairContract = await this.biswapService.getPair(
      pair,
      baseTokenInfo.address,
      quoteTokenInfo.address,
    );

    const inputWithDecimal = parseUnits(
      input.toString(),
      baseTokenInfo.decimals,
    );
    const [baseReserve, quoteReserve] =
      await this.biswapService.getReserves(pairContract);

    // 1. CEX 거래 수수료
    const cexTradeFee = input * TRADE_FEE_RATE;
    // 2. DEX swap 가스비
    const [amountIn, amountOut] = await this.biswapService.getAmountOut(
      inputWithDecimal,
      baseTokenInfo.address,
      quoteTokenInfo.address,
    );

    const swapGasFee =
      await this.biswapService.estimateGasByswapExactTokensForTokens(
        amountIn,
        amountOut,
        [baseTokenInfo.address, quoteTokenInfo.address],
      );
    console.log(formatUnits(swapGasFee, 18));

    // 3. Price Impact
    const costByPriceImpact = calculatePriceImpact(
      amountIn,
      amountOut,
      baseReserve,
      quoteReserve,
      baseTokenInfo.decimals,
      quoteTokenInfo.decimals,
    );

    console.log(
      `[CostByBaseToken] CEX Trade Fee: ${cexTradeFee}, Swap Fee: ${Number(swapGasFee) / 10 ** baseTokenInfo.decimals}, PI : ${input * costByPriceImpact}`,
    );

    const totalFee =
      cexTradeFee +
      Number(swapGasFee) / 10 ** baseTokenInfo.decimals +
      input * costByPriceImpact;

    return totalFee;
  }

  async calculateCostByQuoteToken(
    pair: string,
    input: number,
  ): Promise<number> {
    const [baseTokenInfo, quoteTokenInfo] =
      this.tokenService.getTokensInfo(pair);
    const pairContract = await this.biswapService.getPair(
      pair,
      baseTokenInfo.address,
      quoteTokenInfo.address,
    );

    const inputWithDecimal = parseUnits(
      input.toString(),
      quoteTokenInfo.decimals,
    );
    const [baseReserve, quoteReserve] =
      await this.biswapService.getReserves(pairContract);

    // 1. CEX 거래 수수료
    const cexTradeFee = input * TRADE_FEE_RATE;
    // 2. DEX swap 가스비
    const [amountIn, amountOut] = await this.biswapService.getAmountIn(
      inputWithDecimal,
      baseTokenInfo.address,
      quoteTokenInfo.address,
    );

    const swapGasFee =
      await this.biswapService.estimateGasByswapTokensForExactTokens(
        amountIn,
        amountOut,
        [baseTokenInfo.address, quoteTokenInfo.address],
      );

    console.log(formatUnits(swapGasFee, 18));

    // 3. Price Impact
    const costByPriceImpact = calculatePriceImpact(
      amountOut,
      amountIn,
      baseReserve,
      quoteReserve,
      baseTokenInfo.decimals,
      quoteTokenInfo.decimals,
    );

    const totalFee =
      cexTradeFee +
      Number(swapGasFee) / 10 ** baseTokenInfo.decimals +
      Math.abs(input * costByPriceImpact);

    return totalFee;
  }

  async getCEXBalance(tokenSymbol: string) {}
}
