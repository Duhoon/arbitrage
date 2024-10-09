import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceHistory } from 'src/infra/db/entities';
import { Repository } from 'typeorm';
import { parseUnits, formatUnits } from 'ethers';
import { TRADE_FEE_RATE } from 'src/constants/order';
import { PriceDTO } from 'src/types/price.dto';
import { Pair } from './pair';
import { LoggerService } from 'src/infra/logger/logger.service';
import { Token } from './token';
import { toPercentage } from 'src/utils/calculator';
import { BiswapServiceToken } from 'src/constants/services';
import { DEXV2Service } from 'src/contract/dexV2.service';
import { BinanceSpotClient } from 'src/infra/infra.module';
import { Spot } from '@binance/connector-typescript';

@Injectable()
export class PriceService {
  private bnbPrice: number;

  constructor(
    @Inject(BiswapServiceToken)
    private readonly biswapService: DEXV2Service,
    @Inject(BinanceSpotClient)
    private readonly binanceService: Spot,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
    private readonly logger: LoggerService,
  ) {}

  async getPrice(pair: Pair, reverse: boolean = false): Promise<PriceDTO> {
    const name = pair.name;
    const address = pair.address;

    let tokenIn: Token, tokenOut: Token;
    if (!reverse) {
      tokenIn = pair.getToken0();
      tokenOut = pair.getToken1();
    } else {
      tokenIn = pair.getToken1();
      tokenOut = pair.getToken0();
    }

    let amountIn: bigint, amountOut: bigint;
    if (!reverse) {
      [amountIn, amountOut] = await this.biswapService.getAmountOut(
        parseUnits(pair.input.toString(), tokenIn.decimals),
        tokenIn.address,
        tokenOut.address,
      );
    } else {
      [amountIn, amountOut] = await this.biswapService.getAmountIn(
        parseUnits(pair.input.toString(), tokenOut.decimals),
        tokenIn.address,
        tokenOut.address,
      );
    }

    const dexPrice = !reverse
      ? Number(amountOut) / Number(amountIn)
      : Number(amountIn) / Number(amountOut);

    const cexPrice =
      pair.getToken0().binancePrice / pair.getToken1().binancePrice;

    // cost 계산
    const cexTradeFee =
      pair.getToken0().binancePrice * pair.input * TRADE_FEE_RATE;
    const swapGasFee = Number(formatUnits(300_000, 9)) * this.bnbPrice;
    // 자산이 없을 시 아래 가스비 예측은 불가능
    // await this.biswapService.estimateGasByswapExactTokensForTokens(
    //   amountIn,
    //   amountOut,
    //   [tokenIn.address, tokenOut.address],
    // );

    const totalCost = cexTradeFee + swapGasFee;

    this.logger.debug(
      `cexTradeFee : ${cexTradeFee} GasFee : ${swapGasFee}`,
      'getPrice',
    );

    this.logger.log(
      `${name} CEX Price: $ ${cexPrice}, DEX price: $ ${dexPrice} ${reverse ? 'reverse: true' : ''}`,
      'getPrice',
    );

    const profit =
      (!reverse ? dexPrice - cexPrice : cexPrice - dexPrice) *
      pair.getToken1().binancePrice *
      pair.input;
    const profitRate = !reverse
      ? dexPrice / cexPrice - 1
      : cexPrice / dexPrice - 1;

    this.logger.log(
      `${pair.name} profit: $ ${profit}, cost: $ ${totalCost}, operating profit: $ ${profit - totalCost}, profitRate: ${toPercentage(profitRate)} %`,
      'getPrice',
    );

    await this.priceHistoryRepository.save({
      pair: pair.name,
      input: pair.input,
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
      const result = await this.binanceService.orderBook(symbol, {
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
      const result = await this.binanceService.symbolPriceTicker({
        symbol,
      });
      return result;
    } catch (err) {
      throw err;
    }
  }

  setBNBPrice(price: number) {
    this.logger.debug(`bnb Price : ${price}`, 'PriceService');
    this.bnbPrice = price;
  }
}
