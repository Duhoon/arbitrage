import { Module } from '@nestjs/common';
import { BinanceClientService } from './binanceClient.service';
import { BinanceProvider } from './provider';
import { BinanceSigner } from './signer';
import { DBModule } from './db/db.module';

@Module({
  imports: [DBModule],
  providers: [BinanceClientService, BinanceProvider, BinanceSigner],
  exports: [BinanceClientService, BinanceProvider, BinanceSigner, DBModule],
})
export class InfraModule {}
