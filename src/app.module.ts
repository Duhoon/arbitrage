import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CoreModule } from './core/core.module';
import { DBModule } from './config/db';
import { ProviderService } from './config/provider';
import { ContractModule } from './contract/contract.module';
import { BinanceClientService } from './config/binanceClient';
import { SignerService } from './config/signer';
import { PeripheryModule } from './periphery/periphery.module';
import { LoggerService } from './config/logger/logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DBModule,
    ScheduleModule.forRoot(),
    CoreModule,
    PeripheryModule,
    ContractModule,
  ],
  controllers: [],
  providers: [
    ProviderService,
    SignerService,
    BinanceClientService,
    LoggerService,
  ],
  exports: [
    BinanceClientService,
    SignerService,
    ProviderService,
    LoggerService,
  ],
})
export class AppModule {
  constructor() {}
}
