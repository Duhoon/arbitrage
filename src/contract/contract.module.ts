import { Module } from '@nestjs/common';
import { BiswapService } from './biswap.service';
import { SignerService } from 'src/infra/signer';
import { TokenContractService } from './tokenContract.service';
import { InfraModule } from 'src/infra/infra.module';

@Module({
  imports: [InfraModule],
  providers: [BiswapService, SignerService, TokenContractService],
  exports: [BiswapService],
})
export class ContractModule {}
