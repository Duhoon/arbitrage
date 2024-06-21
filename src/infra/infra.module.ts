import { Module } from '@nestjs/common';
import { BinanceClientService } from './binanceClient';
import { EthersProviderToken, buildProvider } from './provider';
import { SignerService } from './signer';
import { DBModule } from './db/db.module';

@Module({
  imports: [DBModule],
  providers: [BinanceClientService, buildProvider, SignerService],
  exports: [BinanceClientService, EthersProviderToken, SignerService, DBModule],
})
export class InfraModule {}
