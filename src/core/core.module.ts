import { Module } from '@nestjs/common';
import { PriceService } from './price.service';
import { ContractModule } from 'src/contract/contract.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceHistory } from 'src/entities/priceHistory.entity';
import { BinanceClientService } from 'src/config/binanceClient';
import { OrderService } from './order.service';
import { ProviderService } from 'src/config/provider';
import { TokenContractService } from 'src/contract/tokenContract.service';
import { SignerService } from 'src/config/signer';
import { OrderHistory } from 'src/entities/orderHistory.entity';
import { SheetsService } from 'src/periphery/sheets.service';
import { LoggerService } from 'src/config/logger/logger.service';

@Module({
  imports: [
    ContractModule,
    TypeOrmModule.forFeature([PriceHistory, OrderHistory]),
  ],
  providers: [
    PriceService,
    TokenContractService,
    BinanceClientService,
    OrderService,
    ProviderService,
    SignerService,
    SheetsService,
    LoggerService,
  ],
})
export class CoreModule {}
