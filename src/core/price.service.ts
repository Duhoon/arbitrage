import { Injectable, Inject } from '@nestjs/common';
import { BiswapService } from 'src/contract/biswap.service';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceHistory } from 'src/infra/db/entities';
import { Repository } from 'typeorm';
import { BinanceClientService } from 'src/infra/binanceClient.service';
import { parseUnits, formatUnits } from 'ethers';
import { TRADE_FEE_RATE } from 'src/constants/order';
import { PriceDTO } from 'src/types/price.dto';
import { Pair } from './pair';
import { LoggerService } from 'src/infra/logger/logger.service';
import { Token } from './token';

@Injectable()
export class PriceService {
  private pairIndex = 0; // ['NEAR/BNB', 'SAND/USDT', 'SAND/ETH', 'NEAR/USDT'];

  constructor(
    @Inject(BiswapService)
    private readonly biswapService: BiswapService,
    @Inject(BinanceClientService)
    private readonly binanceService: BinanceClientService,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
    private readonly logger: LoggerService,
  ) {}

  async getPrice(
    pair: Pair,
    input: number,
    reverse: boolean = false,
  ): Promise<PriceDTO> {
    const currentTime = new Date();

    const name = pair.name;
    const address = pair.address;

    let tokenIn: Token, tokenOut: Token;
    if (!reverse) {
      tokenIn = pair.token0;
      tokenOut = pair.token1;
    } else {
      tokenIn = pair.token1;
      tokenOut = pair.token0;
    }

    const [amountIn, amountOut] = await this.biswapService.getAmountOut(
      parseUnits(input.toString(), tokenIn.decimals),
      tokenIn.address,
      tokenOut.address,
    );

    const dexPrice = !reverse
      ? Number(amountOut) / Number(amountIn)
      : Number(amountIn) / Number(amountOut);

    const cexPrice = pair.token0.binancePrice / pair.token1.binancePrice;

    // cost 계산
    const cexTradeFee = cexPrice * input * TRADE_FEE_RATE;
    const swapGasFee =
      await this.biswapService.estimateGasByswapExactTokensForTokens(
        amountIn,
        amountOut,
        [tokenIn.address, tokenOut.address],
      );

    this.logger.log(
      `TradeFee: ${cexTradeFee}, SwapGasFee: ${swapGasFee}`,
      'getPrice',
    );
    const totalCost = cexTradeFee + Number(formatUnits(swapGasFee, 9));

    this.logger.log(
      `${name} CEX Price: ${cexPrice}, DEX price: ${dexPrice} ${reverse ? 'reverse: true' : ''}`,
      'getPrice',
    );

    const profit = !reverse
      ? (dexPrice - cexPrice) * input
      : (cexPrice - dexPrice) * input;
    const profitRate = !reverse
      ? dexPrice / cexPrice - 1
      : cexPrice / dexPrice - 1;

    this.logger.log(
      `${pair.name} profit: ${profit}, cost: ${totalCost}, operating profit: ${profit - totalCost} profitRate: ${profitRate}`,
      'binanceToDEX',
    );

    await this.priceHistoryRepository.save({
      pair: pair.name,
      input,
      dexPrice,
      cexPrice,
      profit: profit,
      cost: totalCost,
      chance: profit > totalCost,
    });

    return {
      cexPrice,
      dexPrice,
      totalCost,
      amountIn,
      amountOut,
    };
  }

  async getCEXPrice(pair: Pair) {
    const symbol = pair.getBinanceSymbol();

    const orderbook = await this.getCEXOrder(symbol);
    const marketStatus = orderbook.bids[0][0];
    return marketStatus;
  }

  async getUSDPricefromCEX(token: Token) {
    const symbol = token.name + 'USDT';
    const { price } = await this.getCEXOrderTicker(symbol);

    token.setBinancePrice(price);
    return price;
  }

  async getCEXPriceByTicker(pair: Pair) {
    const symbol = pair.getBinanceSymbol();

    const { price } = await this.getCEXOrderTicker(symbol);
    return price;
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

  async getCEXOrderTicker(symbol: string): Promise<any> {
    try {
      const result = await this.binanceService.client.symbolPriceTicker({
        symbol,
      });
      return result;
    } catch (err) {
      throw err;
    }
  }
}
