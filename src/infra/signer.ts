import { Provider } from '@nestjs/common';
import { Wallet, JsonRpcApiProvider } from 'ethers';
import { EthersProviderToken } from './provider';

export const EthersSignerToken = 'EthersSigner';
export const EthersSigner: Provider = {
  provide: EthersSignerToken,
  useFactory: (provider: JsonRpcApiProvider) => {
    return new Wallet(process.env.WALLET_SECRET, provider);
  },
  inject: [EthersProviderToken],
};
