import { Module, Provider } from '@nestjs/common';
import { TokenContractService } from './tokenContract.service';
import { InfraModule } from 'src/infra/infra.module';
import {
  BiswapServiceToken,
  PancakeswapServiceToken,
} from 'src/constants/services';
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
        return new DEXService(
          ethersProvider,
          ethersSigner,
          '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
          '0x858E3312ed3A876947EA49d572A7C42DE08af7EE',
        );
      },
      inject: [EthersProviderToken, EthersSignerToken],
    },
    {
      provide: PancakeswapServiceToken,
      useFactory: (
        ethersProvider: JsonRpcApiProvider,
        ethersSigner: Wallet,
      ) => {
        return new DEXService(
          ethersProvider,
          ethersSigner,
          '0x10ED43C718714eb63d5aA57B78B54704E256024E',
          '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
        );
      },
      inject: [EthersProviderToken, EthersSignerToken],
    },
    TokenContractService,
  ],
  exports: [BiswapServiceToken, TokenContractService],
})
export class ContractModule {}
