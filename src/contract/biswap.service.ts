import { Injectable, Inject } from '@nestjs/common';
import { Contract, ContractTransactionResponse } from 'ethers';
import { ProviderService } from 'src/config/provider';
import { PairAddress } from 'src/constants/pairs';
import * as BiswapRouterABI from './biswapRouter.json';
import * as BiswapFactoryABI from './biswapFactory.json';
import * as BiswapPairABI from './biswapPair.json';
import { SignerService } from 'src/config/signer';

@Injectable()
export class BiswapService {
  DEADLINE_LIMIT = 5 * 60 * 1000; // 5 minutes

  biswapRouter: Contract;
  biswapFactory: Contract;

  constructor(
    @Inject(ProviderService)
    private readonly providerService: ProviderService,
    @Inject(SignerService)
    private readonly signerService: SignerService,
  ) {
    this.biswapRouter = new Contract(
      '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
      BiswapRouterABI,
      this.providerService.provider,
    );

    this.biswapFactory = new Contract(
      '0x858E3312ed3A876947EA49d572A7C42DE08af7EE',
      BiswapFactoryABI.abi,
      this.providerService.provider,
    );
  }

  async getPair(
    pair: string,
    tokenA: string,
    tokenB: string,
  ): Promise<Contract> {
    let pairAddress: string = PairAddress[pair];
    if (!pairAddress) {
      pairAddress = await this.biswapFactory.getPair(tokenA, tokenB);
      console.log(`[getPair] new pair: ${pairAddress}`);
    }

    const pairContract = new Contract(
      pairAddress,
      BiswapPairABI.abi,
      this.providerService.provider,
    );

    return pairContract;
  }

  async getReserves(pair: Contract) {
    const [token0Reserve, token1Reserve, blockTimestamp] =
      await pair.getReserves();

    return [token0Reserve, token1Reserve, blockTimestamp];
  }

  async swapExactTokensForTokens(
    amountIn: bigint,
    amountOutMin: bigint,
    addresses: string[],
  ): Promise<null | ContractTransactionResponse> {
    const routerWithSigner = this.biswapRouter.connect(
      this.signerService.getWallet(),
    ) as any;

    const result = await routerWithSigner.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      addresses,
      this.signerService.getWallet().address,
      Date.now() + this.DEADLINE_LIMIT,
    );

    return result;
  }

  async swapTokensForExactTokens(
    amountInMax: bigint,
    amountOut: bigint,
    addresses: string[],
  ): Promise<null | ContractTransactionResponse> {
    const routerWithSigner = this.biswapRouter.connect(
      this.signerService.getWallet(),
    ) as any;

    const result = await routerWithSigner.swapTokensForExactTokens(
      amountOut,
      amountInMax,
      addresses,
      this.signerService.getWallet().address,
      Date.now() + this.DEADLINE_LIMIT,
    );

    return result;
  }

  async estimateGasByswapTokensForExactTokens(
    amountIn: bigint,
    amountOut: bigint,
    addresses: string[],
  ): Promise<bigint> {
    const routerWithWithSigner = this.biswapRouter.connect(
      this.signerService.getWallet(),
    ) as any;

    const gasFee =
      await routerWithWithSigner.swapTokensForExactTokens.estimateGas(
        amountOut,
        amountIn,
        addresses,
        this.signerService.getWallet().address,
        Date.now() + this.DEADLINE_LIMIT / 1000,
      );

    return gasFee;
  }

  async estimateGasByswapExactTokensForTokens(
    amountIn: bigint,
    amountOut: bigint,
    addresses: string[],
  ): Promise<bigint> {
    const routerWithWithSigner = this.biswapRouter.connect(
      this.signerService.getWallet(),
    ) as any;

    const gasFee =
      await routerWithWithSigner.swapExactTokensForTokens.estimateGas(
        amountIn,
        amountOut,
        addresses,
        this.signerService.getWallet().address,
        Date.now() + this.DEADLINE_LIMIT / 1000,
      );

    return gasFee;
  }

  async quote(amountA, tokenAReserve, tokenBReserve) {
    const quote = await this.biswapRouter.quote(
      amountA,
      tokenAReserve,
      tokenBReserve,
    );

    return quote;
  }

  async getAmountOut(
    amountIn: number | string | bigint,
    token0Address: string,
    token1Address: string,
  ): Promise<[bigint, bigint]> {
    const amountOut = await this.biswapRouter.getAmountsOut(amountIn, [
      token0Address,
      token1Address,
    ]);

    return amountOut;
  }

  async getAmountIn(
    amountOut: number | string | bigint,
    token0Address: string,
    token1Address: string,
  ): Promise<[bigint, bigint]> {
    const amountIn = await this.biswapRouter.getAmountsIn(amountOut, [
      token0Address,
      token1Address,
    ]);

    return amountIn;
  }
}
