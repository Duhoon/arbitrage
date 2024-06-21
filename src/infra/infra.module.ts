import { Module } from '@nestjs/common';
import { BinanceClientService } from './binanceClient';
import { EthersProvider } from './provider';
import { SignerService } from './signer';
import { DBModule } from './db/db.module';

@Module({
  imports: [DBModule],
  providers: [BinanceClientService, EthersProvider, SignerService],
  exports: [BinanceClientService, EthersProvider, SignerService, DBModule],
})
export class InfraModule {}
