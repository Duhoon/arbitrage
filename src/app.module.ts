import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CoreModule } from './core/core.module';
import { EthersProviderToken, buildProvider } from './infra/provider';
import { ContractModule } from './contract/contract.module';
import { BinanceClientService } from './infra/binanceClient';
import { SignerService } from './infra/signer';
import { PeripheryModule } from './periphery/periphery.module';
import { LoggerService } from './infra/logger/logger.service';
import { InfraModule } from './infra/infra.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    CoreModule,
    PeripheryModule,
    ContractModule,
    InfraModule,
  ],
  controllers: [],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class AppModule {
  constructor() {}
}
