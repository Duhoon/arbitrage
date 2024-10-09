import { Module } from '@nestjs/common';
import { BinanceProvider } from './provider';
import { BinanceSigner } from './signer';
import { DBModule } from './db/db.module';
import { Spot } from '@binance/connector-typescript';

export const BinanceSpotClient = 'BinanceClient';

@Module({
  imports: [DBModule],
  providers: [
    {
      provide: BinanceSpotClient,
      useFactory: () => {
        return new Spot(
          process.env.BINANCE_API_KEY,
          process.env.BINANCE_SECRET_KEY,
        );
      },
    },
    BinanceProvider,
    BinanceSigner,
  ],
  exports: [BinanceSpotClient, BinanceProvider, BinanceSigner, DBModule],
})
export class InfraModule {}
