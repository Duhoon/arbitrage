import { Module } from '@nestjs/common';
import { BiswapService } from './biswap.service';
import { TokenContractService } from './tokenContract.service';
import { InfraModule } from 'src/infra/infra.module';

@Module({
  imports: [InfraModule],
  providers: [BiswapService, TokenContractService],
  exports: [BiswapService, TokenContractService],
})
export class ContractModule {}
