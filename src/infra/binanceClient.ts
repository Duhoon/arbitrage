import { Injectable } from '@nestjs/common';
import { Spot } from '@binance/connector-typescript';

@Injectable()
export class BinanceClientService {
  client: Spot;

  constructor() {
    this.setClient();

    this.client.userAsset().then((result) => {
      console.log(result);
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
