import { Injectable, Inject } from '@nestjs/common';
import { ethers, Contract } from 'ethers';
import { ProviderService } from 'src/config/provider';
import * as BEP20ABI from './IERC20.json';
import { SignerService } from 'src/config/signer';

@Injectable()
export class TokenContractService {
  constructor(
    @Inject(ProviderService)
    private readonly providerService: ProviderService,
    @Inject(SignerService)
    private readonly signerService: SignerService,
  ) {}

  getContract(tokenAddress: string) {
    return new ethers.Contract(
      tokenAddress,
      BEP20ABI.abi,
      this.providerService.provider,
    );
  }

  async approve(tokenContract: Contract, to: string, amount: bigint) {
    const tokenContractWithSigner = tokenContract.connect(
      this.signerService.getWallet(),
    ) as any;

    const result = await tokenContractWithSigner.approve(to, amount);

    return result;
  }

  async transfer(tokenContract: Contract, to: string, amount: number) {
    const result = await tokenContract.transfer(to, amount);

    return result;
  }

  async allowance(tokenContract: Contract, spender: string): Promise<bigint> {
    const result = await tokenContract.allowance(
      process.env.WALLET_ADDRESS,
      spender,
    );

    return result;
  }
}
