import { Injectable } from '@nestjs/common';
import { Spot } from '@binance/connector-typescript';

@Injectable()
export class BinanceClient {
  client: Spot;

  constructor() {
    this.setClient();

    this.client.userAsset().then((result) => {
      console.log('User balance:');
      result.forEach((balance) =>
        console.log(`${balance.asset} : ${balance.free}`),
      );
    });
  }

  private setClient() {
    this.client = new Spot(
      process.env.BINANCE_API_KEY,
      process.env.BINANCE_SECRET_KEY,
    );
  }

  getClient(): Spot {
    if (this.client!) {
      this.setClient();
    }
    return this.client;
  }
}
