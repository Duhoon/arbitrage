import { Module } from '@nestjs/common';
import { PriceService } from './price.service';
import { TokenService } from './token.service';
import { ContractModule } from 'src/contract/contract.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceHistory } from 'src/entities/priceHistory.entity';
import { BinanceClientService } from 'src/config/binanceClient';
import { OrderService } from './order.service';
import { ProviderService } from 'src/config/provider';
import { TokenContractService } from 'src/contract/tokenContract.service';
import { SignerService } from 'src/config/signer';
import { OrderHistory } from 'src/entities/orderHistory.entity';

@Module({
  imports: [
    ContractModule,
    TypeOrmModule.forFeature([PriceHistory, OrderHistory]),
  ],
  providers: [
    PriceService,
    TokenContractService,
    TokenService,
    BinanceClientService,
    OrderService,
    ProviderService,
    SignerService,
  ],
})
export class CoreModule {}
