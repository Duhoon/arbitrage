import { Module } from '@nestjs/common';
import { PriceService } from './price.service';
import { ContractModule } from 'src/contract/contract.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderHistory, PriceHistory } from 'src/infra/db/entities';
import { BinanceClientService } from 'src/infra/binanceClient';
import { OrderService } from './order.service';
import { TokenContractService } from 'src/contract/tokenContract.service';
import { SheetsService } from 'src/periphery/sheets.service';
import { LoggerService } from 'src/infra/logger/logger.service';
import { InfraModule } from 'src/infra/infra.module';

@Module({
  imports: [
    InfraModule,
    ContractModule,
    TypeOrmModule.forFeature([PriceHistory, OrderHistory]),
  ],
  providers: [
    PriceService,
    TokenContractService,
    BinanceClientService,
    OrderService,
    SheetsService,
    LoggerService,
  ],
})
export class CoreModule {}
