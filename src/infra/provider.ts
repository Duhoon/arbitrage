import { Provider as Service } from '@nestjs/common';
import { ethers } from 'ethers';

export const EthersProviderToken = 'EtherProvider';
export const EthersProvider: Service = {
  provide: 'EtherProvider',
  useFactory: () => {
    return new ethers.JsonRpcProvider(process.env.BSC_PROVIDER_URL, {
      name: 'binance',
      chainId: 56,
    });
  },
};
