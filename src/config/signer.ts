import { Injectable, Inject } from '@nestjs/common';
import { ethers, Wallet } from 'ethers';
import { ProviderService } from './provider';

@Injectable()
export class SignerService {
  private wallet: Wallet;

  constructor(
    @Inject(ProviderService)
    private readonly providerService: ProviderService,
  ) {}

  private setWallet() {
    this.wallet = new Wallet(
      process.env.WALLET_SECRET,
      this.providerService.provider,
    );
  }

  getWallet() {
    if (!this.wallet) {
      this.setWallet();
    }
    return this.wallet;
  }
}
