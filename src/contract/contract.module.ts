import { Module } from '@nestjs/common';
import { BiswapService } from './biswap.service';
import { SignerService } from 'src/infra/signer';
import { TokenContractService } from './tokenContract.service';
import { buildProvider } from 'src/infra/provider';
import { InfraModule } from 'src/infra/infra.module';

@Module({
  imports: [InfraModule],
  providers: [
    buildProvider,
    BiswapService,
    SignerService,
    TokenContractService,
  ],
  exports: [BiswapService],
})
export class ContractModule {}
