import { Injectable } from '@nestjs/common';
import { OperatorService } from './operator.service';
import { BinanceClientService } from 'src/infra/binanceClient.service';
import { LoggerService } from 'src/infra/logger/logger.service';
import { Interval } from '@nestjs/schedule';

interface BinancePriceResponse {
  symbol: string;
  price: string;
}

/**
 * @todo 가격 피드해서 token 인스턴스에 주기적으로 가격 세팅 하는 서비스 만들기
 */
@Injectable()
export class FeedService {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly operatorService: OperatorService,
    private readonly binanceClientService: BinanceClientService,
  ) {}

  @Interval(1_000)
  async feedTokenPriceByUSDT() {
    const tokens = this.operatorService.tokens;

    const prices = (await this.binanceClientService.client.symbolPriceTicker({
      symbols: JSON.stringify(
        tokens
          .filter((token) => token.ex_symbol !== 'USDT')
          .map((token) => token.ex_symbol + 'USDT'),
      ),
    })) as BinancePriceResponse[];

    prices.forEach((price) => {
      const tokenEntry = tokens.find(
        (token) => token.ex_symbol + 'USDT' === price.symbol,
      );
      if (tokenEntry) {
        this.loggerService.debug(
          `${tokenEntry.ex_symbol} / USDT ${price.price}`,
          'feedTokenPriceByUSDT',
        );
        tokenEntry.setBinancePrice(Number(price.price));
      }
    });

    this.loggerService.debug(`Feed Token Price end`, 'feedTokenPriceByUSDT');
  }
}
