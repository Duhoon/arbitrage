import { Module } from '@nestjs/common';
import { PriceService } from './price.service';
import { ContractModule } from 'src/contract/contract.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderHistory, PriceHistory } from 'src/infra/db/entities';
import { OrderService } from './order.service';
import { SheetsService } from 'src/periphery/sheets.service';
import { InfraModule } from 'src/infra/infra.module';
import { OperatorService } from './operator.service';
import { LoggerService } from 'src/infra/logger/logger.service';

@Module({
  imports: [
    InfraModule,
    ContractModule,
    TypeOrmModule.forFeature([PriceHistory, OrderHistory]),
  ],
  providers: [
    PriceService,
    OrderService,
    OperatorService,
    SheetsService,
    LoggerService,
  ],
})
export class CoreModule {}
