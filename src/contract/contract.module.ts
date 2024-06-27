import { Module, Provider } from '@nestjs/common';
import { TokenContractService } from './tokenContract.service';
import { InfraModule } from 'src/infra/infra.module';
import { BiswapServiceToken } from 'src/constants/services';
import { DEXService } from './dex.service';
import { EthersProvider, EthersProviderToken } from 'src/infra/provider';
import { EthersSignerToken, EthersSigner } from 'src/infra/signer';
import { JsonRpcApiProvider, Wallet } from 'ethers';

@Module({
  imports: [InfraModule],
  providers: [
    {
      provide: BiswapServiceToken,
      useFactory: (
        ethersProvider: JsonRpcApiProvider,
        ethersSigner: Wallet,
      ) => {
        return new DEXService(ethersProvider, ethersSigner);
      },
      inject: [EthersProviderToken, EthersSignerToken],
    },
    TokenContractService,
  ],
  exports: [BiswapServiceToken, TokenContractService],
})
export class ContractModule {}
