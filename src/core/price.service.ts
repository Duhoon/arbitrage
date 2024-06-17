import { Injectable, Inject } from '@nestjs/common';
import { TokenService } from './token.service';
import { BiswapService } from 'src/contract/biswap.service';
import { baseTokens, quoteTokens } from 'src/constants/tokens';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceHistory } from 'src/entities/priceHistory.entity';
import { Repository } from 'typeorm';
import { BinanceClientService } from 'src/config/binanceClient';
import { INPUT } from 'src/constants/order';
import { parseUnits, formatUnits, formatEther } from 'ethers';
import {
  calculatePriceImpact,
  getAmountOut,
  getAmountIn,
} from 'src/utils/calculator';
import { TRADE_FEE_RATE } from 'src/constants/order';
import { Timeout } from '@nestjs/schedule';
import { PriceDTO } from 'src/types/price.model';
import { Pair } from 'src/types/pair.model';

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

  @Timeout(1_000)
  async test() {
    // console.log(`GetPrice Result: ${await this.getPrice()}`);
    // console.log(`GetPriceByReserve Result: ${await this.getPriceByReserve()}`);
  }

  async getPrice(
    { name, address, token0, token1 }: Pair,
    input: number,
  ): Promise<PriceDTO> {
    const currentTime = new Date();

    try {
      const [amountIn, amountOut] = await this.biswapService.getAmountOut(
        parseUnits(input.toString(), token0.decimals),
        token0.address,
        token1.address,
      );

      const dexPrice = Number(amountOut) / Number(amountIn);
      const cexPrice = await this.getCEXPrice(name);

      // cost 계산
      const cexTradeFee = input * TRADE_FEE_RATE;
      const swapGasFee =
        await this.biswapService.estimateGasByswapExactTokensForTokens(
          amountIn,
          amountOut,
          [token0.address, token1.address],
        );

      console.log(
        `[caluclateCost] TradeFee: ${cexTradeFee}, SwapGasFee: ${swapGasFee}`,
      );
      const totalFee = cexTradeFee + Number(formatUnits(swapGasFee, 9));

      const logstr = `${currentTime.toISOString()} ${name} CEX Price: ${cexPrice}, DEX price: ${dexPrice}`;
      console.log(logstr);

      return {
        cexPrice,
        dexPrice,
        totalFee,
        amountIn,
        amountOut,
      };
    } catch (err) {
      console.log(err);
    }
  }

  async getPriceByReserve(
    { name, address, token0, token1 }: Pair,
    input: number,
  ): Promise<PriceDTO> {
    const currentTime = new Date();

    try {
      const [amountIn, amountOut] = await this.biswapService.getAmountOut(
        parseUnits(input.toString(), token0.decimals),
        token0.address,
        token1.address,
      );

      const dexPrice = Number(amountIn) / Number(amountOut);
      const cexPrice = await this.getCEXPrice(name);

      // cost 계산
      const cexTradeFee = input * TRADE_FEE_RATE;
      const swapGasFee =
        await this.biswapService.estimateGasByswapExactTokensForTokens(
          amountIn,
          amountOut,
          [token0.address, token1.address],
        );

      console.log(
        `[caluclateCost] TradeFee: ${cexTradeFee}, SwapGasFee: ${swapGasFee}`,
      );
      const totalFee = cexTradeFee + Number(formatUnits(swapGasFee, 9));

      const logstr = `${currentTime.toISOString()} ${name} CEX Price: ${cexPrice}, DEX price: ${dexPrice}`;
      console.log(logstr);

      return {
        cexPrice,
        dexPrice,
        totalFee,
        amountIn,
        amountOut,
      };
    } catch (err) {
      console.log(err);
    }
  }

  async getCEXPrice(pair: string) {
    const [baseTokenSymbol, quoteTokenSymbol] =
      this.tokenService.getSymbol(pair);

    const orderbook = await this.getCEXOrder(
      `${baseTokenSymbol}${quoteTokenSymbol}`,
    );
    const marketStatus = orderbook.bids[0][0];
    return marketStatus;
  }

  async getDEXPrice(pair: string, input: number): Promise<number> {
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
}
