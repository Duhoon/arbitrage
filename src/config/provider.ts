import { Injectable } from '@nestjs/common';
import { Provider, ethers } from 'ethers';

@Injectable()
export class ProviderService {
  provider: Provider;

  constructor() {
    this.setProvider();
  }

  async setProvider() {
    this.provider = new ethers.JsonRpcProvider(process.env.BSC_PROVIDER_URL, {
      name: 'binance',
      chainId: 56,
    });
  }

  async getCurrentBlockNumber() {
    console.log(await this.provider.getBlockNumber());
  }
}
