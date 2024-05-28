import { Injectable, Inject } from '@nestjs/common';
import { TokenService } from './token.service';
import { BiswapService } from 'src/contract/biswap.service';
import { baseTokens, quoteTokens } from 'src/constants/tokens';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceHistory } from 'src/entities/priceHistory.entity';
import { Repository } from 'typeorm';
import { BinanceClientService } from 'src/config/binanceClient';
import { INPUT } from 'src/constants/order';
import { parseUnits, formatUnits } from 'ethers';
import {
  calculatePriceImpact,
  getAmountOut,
  getAmountIn,
} from 'src/utils/calculator';
import { TRADE_FEE_RATE } from 'src/constants/order';
import { Timeout } from '@nestjs/schedule';

@Injectable()
export class PriceService {
  private pairIndex = 0; // ['NEAR/BNB', 'SAND/USDT', 'SAND/ETH', 'NEAR/USDT'];

  constructor(
    @Inject(TokenService)
    private readonly tokenService: TokenService,
    @Inject(BiswapService)
    private readonly biswapService: BiswapService,
    @Inject(BinanceClientService)
    private readonly binanceService: BinanceClientService,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
  ) {}

  // @Timeout(1_000)
  async test() {
    console.log(await this.getPrice());
    console.log(await this.getPriceByReserve());
  }

  async getPrice() {
    try {
      const cexPair = this.tokenService.pairs.CEXPairs[this.pairIndex];
      const dexPair = this.tokenService.pairs.DEXPairs[this.pairIndex];
      const [baseToken, quoteToken] = this.tokenService.getTokensInfo(dexPair);
      const pairContract = await this.biswapService.getPair(
        dexPair,
        baseToken.address,
        quoteToken.address,
      );

      const [baseReserve, quoteReserve] =
        await this.biswapService.getReserves(pairContract);

      const [amountIn, amountOut] = await this.biswapService.getAmountOut(
        parseUnits(INPUT.toString(), baseToken.decimals),
        baseToken.address,
        quoteToken.address,
      );

      const dexPrice = Number(amountOut) / Number(amountIn);
      const cexPrice = await this.callCEXPrice(cexPair);
      const currentTime = new Date();

      // cost 계산
      const cexTradeFee = INPUT * TRADE_FEE_RATE;
      const swapGasFee =
        await this.biswapService.estimateGasByswapExactTokensForTokens(
          amountIn,
          amountOut,
          [baseToken.address, quoteToken.address],
        );
      const costByPriceImpact = calculatePriceImpact(
        amountIn,
        amountOut,
        baseReserve,
        quoteReserve,
        baseToken.decimals,
        quoteToken.decimals,
      );

      const totalFee =
        cexTradeFee +
        Number(swapGasFee) / 10 ** baseToken.decimals +
        Math.abs(INPUT * costByPriceImpact);

      const logstr = `${currentTime.toISOString()} ${cexPair} CEX Price: ${cexPrice}, DEX price: ${dexPrice}`;
      console.log(logstr);

      return [cexPrice, dexPrice, totalFee];
    } catch (err) {
      console.log(err);
    }
  }

  async getPriceByReserve() {
    try {
      const currentTime = new Date();

      const cexPair = this.tokenService.pairs.CEXPairs[this.pairIndex];
      const dexPair = this.tokenService.pairs.DEXPairs[this.pairIndex];

      const [baseTokenInfo, quoteTokenInfo] =
        this.tokenService.getTokensInfo(dexPair);

      const pairContract = await this.biswapService.getPair(
        dexPair,
        baseTokenInfo.address,
        quoteTokenInfo.address,
      );

      const [baseReserve, quoteReserve] =
        await this.biswapService.getReserves(pairContract);

      const cexPrice = await this.callCEXPrice(cexPair);

      const amountOut = getAmountOut(
        parseUnits(INPUT.toString(), baseTokenInfo.decimals),
        baseReserve,
        quoteReserve,
      );
      console.log(amountOut);

      const dexPrice =
        Number(formatUnits(amountOut, quoteTokenInfo.decimals)) / INPUT;

      const logstr = `${currentTime.toISOString()} ${cexPair} CEX Price: ${cexPrice}, DEX price: ${dexPrice}`;
      const profit = (dexPrice - cexPrice) * INPUT;

      console.log(logstr);

      return [cexPrice, dexPrice];
    } catch (err) {
      console.log(err);
    }
  }

  async callCEXPrice(pair: string) {
    const [baseTokenSymbol, quoteTokenSymbol] =
      this.tokenService.getSymbol(pair);

    const orderbook = await this.getCEXOrder(
      `${baseTokenSymbol}${quoteTokenSymbol}`,
    );
    const marketStatus = orderbook.bids[0][0];
    return marketStatus;
  }

  async callDEXPrice(pair: string, input: number): Promise<number> {
    const [baseToken, quoteToken] = this.tokenService.getTokensInfo(pair);
    const baseTokenAmount = parseUnits(input.toString(), baseToken.decimals);

    const [amountIn, amountOut] = await this.biswapService.getAmountOut(
      baseTokenAmount,
      baseToken.address,
      quoteToken.address,
    );
    console.log(amountOut);

    return Number(amountOut) / Number(amountIn);
  }

  async getCEXPrice(symbol: string): Promise<any> {
    const result = await this.binanceService.client.currentAveragePrice(symbol);
    const info = { ...result, closeTime: new Date(result.closeTime) };

    return info;
  }

  async getCEXOrder(symbol: string): Promise<any> {
    try {
      const result = await this.binanceService.client.orderBook(symbol, {
        limit: 5,
      });
      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async getAmountOut(input: number) {
    const pair = this.tokenService.pairs.DEXPairs[this.pairIndex];
    const [baseTokenInfo, quoteTokenInfo] =
      this.tokenService.getTokensInfo(pair);

    const [amountIn, amountOut] = await this.biswapService.getAmountOut(
      BigInt(input * 10 ** baseTokenInfo.decimals),
      baseTokenInfo.address,
      quoteTokenInfo.address,
    );

    return Number(amountOut) / 10 ** quoteTokenInfo.decimals;
  }

  async getAmountIn(input: number) {
    const pair = this.tokenService.pairs.DEXPairs[this.pairIndex];
    const [baseTokenInfo, quoteTokenInfo] =
      this.tokenService.getTokensInfo(pair);

    const [amountIn, amountOut] = await this.biswapService.getAmountIn(
      BigInt(input * 10 ** quoteTokenInfo.decimals),
      baseTokenInfo.address,
      quoteTokenInfo.address,
    );

    return Number(amountIn) / 10 ** baseTokenInfo.decimals;
  }

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
}
