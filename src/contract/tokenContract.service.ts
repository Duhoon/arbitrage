import { Injectable, Inject } from '@nestjs/common';
import { ethers, Contract, JsonRpcApiProvider, Wallet } from 'ethers';
import { EthersProviderToken } from 'src/infra/provider';
import * as BEP20ABI from './abis/IERC20.json';
import { EthersSignerToken } from 'src/infra/signer';

@Injectable()
export class TokenContractService {
  constructor(
    @Inject(EthersProviderToken)
    private readonly providerService: JsonRpcApiProvider,
    @Inject(EthersSignerToken)
    private readonly wallet: Wallet,
  ) {}

  getContract(tokenAddress: string) {
    return new ethers.Contract(
      tokenAddress,
      BEP20ABI.abi,
      this.providerService.provider,
    );
  }

  async balance(tokenContract: Contract): Promise<bigint> {
    const result = await tokenContract.balanceOf(this.wallet.address);
    return result;
  }

  async approve(tokenContract: Contract, to: string, amount: bigint) {
    const tokenContractWithSigner = tokenContract.connect(this.wallet) as any;

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
