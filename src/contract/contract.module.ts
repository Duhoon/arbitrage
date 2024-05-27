import { Module } from '@nestjs/common';
import { BiswapService } from './biswap.service';
import { ProviderService } from 'src/config/provider';
import { SignerService } from 'src/config/signer';
import { TokenContractService } from './tokenContract.service';

@Module({
  providers: [
    BiswapService,
    ProviderService,
    SignerService,
    TokenContractService,
  ],
  exports: [BiswapService],
})
export class ContractModule {}
