import { Injectable, Inject } from '@nestjs/common';
import { BiswapService } from 'src/contract/biswap.service';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceHistory } from 'src/infra/db/entities';
import { Repository } from 'typeorm';
import { BinanceClientService } from 'src/infra/binanceClient.service';
import { parseUnits, formatUnits } from 'ethers';
import { TRADE_FEE_RATE } from 'src/constants/order';
import { Timeout } from '@nestjs/schedule';
import { PriceDTO } from 'src/types/price.model';
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

  @Timeout(1_000)
  async test() {
    // console.log(`GetPrice Result: ${await this.getPrice()}`);
    // console.log(`GetPriceByReserve Result: ${await this.getPriceByReserve()}`);
  }

  async getPrice(pair: Pair, input: number): Promise<PriceDTO> {
    const currentTime = new Date();

    const name = pair.getName();
    const address = pair.getAddress();
    const token0 = pair.getToken0();
    const token1 = pair.getToken1();

    try {
      const [amountIn, amountOut] = await this.biswapService.getAmountOut(
        parseUnits(input.toString(), token0.decimals),
        token0.address,
        token1.address,
      );

      const dexPrice = Number(amountOut) / Number(amountIn);
      const cexPrice = await this.getCEXPrice(pair);

      // cost 계산
      const cexTradeFee = input * TRADE_FEE_RATE;
      const swapGasFee =
        await this.biswapService.estimateGasByswapExactTokensForTokens(
          amountIn,
          amountOut,
          [token0.address, token1.address],
        );

      this.logger.log(
        `TradeFee: ${cexTradeFee}, SwapGasFee: ${swapGasFee}`,
        'getPrice',
      );
      const totalFee = cexTradeFee + Number(formatUnits(swapGasFee, 9));

      const logstr = `${name} CEX Price: ${cexPrice}, DEX price: ${dexPrice}`;
      this.logger.log(logstr, 'getPrice');

      return {
        cexPrice,
        dexPrice,
        totalFee,
        amountIn,
        amountOut,
      };
    } catch (err) {
      this.logger.error(err.message, err.trace);
      throw err;
    }
  }

  async getPriceByReserve(pair: Pair, input: number): Promise<PriceDTO> {
    const currentTime = new Date();

    const name = pair.getName();
    const address = pair.getAddress();
    const token0 = pair.getToken0();
    const token1 = pair.getToken1();

    try {
      const [amountIn, amountOut] = await this.biswapService.getAmountOut(
        parseUnits(input.toString(), token0.decimals),
        token0.address,
        token1.address,
      );

      const dexPrice = Number(amountIn) / Number(amountOut);
      const cexPrice = await this.getCEXPrice(pair);

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
      throw err;
    }
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
    const [baseToken] = pair.getBinanceSymbol();

    const { price } = await this.getCEXOrderTicker(baseToken);
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
