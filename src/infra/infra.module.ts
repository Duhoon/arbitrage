import { Module } from '@nestjs/common';
import { BinanceClientService } from './binanceClient.service';
import { EthersProvider } from './provider';
import { EthersSigner } from './signer';
import { DBModule } from './db/db.module';

@Module({
  imports: [DBModule],
  providers: [BinanceClientService, EthersProvider, EthersSigner],
  exports: [BinanceClientService, EthersProvider, EthersSigner, DBModule],
})
export class InfraModule {}
