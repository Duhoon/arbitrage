import { Injectable, Inject } from '@nestjs/common';
import { TokenService } from './token.service';
import { BiswapService } from 'src/contract/biswap.service';
import { baseTokens, quoteTokens } from 'src/constants/tokens';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceHistory } from 'src/entities/priceHistory.entity';
import { Repository } from 'typeorm';
import { BinanceClientService } from 'src/config/binanceClient';
import { INPUT } from 'src/constants/order';
import { parseUnits } from 'ethers';

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

  // @Interval(1_000)
  async getPrice() {
    try {
      const cexPair = this.tokenService.pairs.CEXPairs[this.pairIndex];
      const dexPair = this.tokenService.pairs.DEXPairs[this.pairIndex];

      const dexPrice = await this.callDEXPrice(dexPair, INPUT);
      const cexPrice = await this.callCEXPrice(cexPair);
      const currentTime = new Date();

      const logstr = `${currentTime.toISOString()} ${cexPair} CEX Price: ${cexPrice}, DEX price: ${dexPrice}`;
      const profit = (dexPrice - cexPrice) * INPUT;
      const chance = profit > 0 ? true : false;

      console.log(logstr);
      console.log(`profit: ${profit}`);

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
}
