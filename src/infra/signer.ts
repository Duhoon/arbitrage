import { Provider } from '@nestjs/common';
import { Wallet, JsonRpcApiProvider } from 'ethers';
import { BinanceProviderToken } from './provider';

export const BinanceSignerToken = 'EthersSigner';
export const BinanceSigner: Provider = {
  provide: BinanceSignerToken,
  useFactory: (provider: JsonRpcApiProvider) => {
    return new Wallet(process.env.WALLET_SECRET, provider);
  },
  inject: [BinanceProviderToken],
};
