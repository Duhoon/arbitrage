import { Injectable, Inject } from '@nestjs/common';
import { ethers, Wallet, JsonRpcApiProvider } from 'ethers';
import { EthersProviderToken } from './provider';

@Injectable()
export class SignerService {
  private wallet: Wallet;

  constructor(
    @Inject(EthersProviderToken)
    private readonly provider: JsonRpcApiProvider,
  ) {}

  private setWallet() {
    this.wallet = new Wallet(process.env.WALLET_SECRET, this.provider);
  }

  getWallet() {
    if (!this.wallet) {
      this.setWallet();
    }
    return this.wallet;
  }
}
