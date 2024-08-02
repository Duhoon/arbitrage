import { Provider as Service } from '@nestjs/common';
import { ethers } from 'ethers';

export const BinanceProviderToken = 'BinanceProvider';
export const BinanceProvider: Service = {
  provide: 'BinanceProvider',
  useFactory: () => {
    return new ethers.JsonRpcProvider(process.env.BSC_PROVIDER_URL, {
      name: 'binance',
      chainId: 56,
    });
  },
};
