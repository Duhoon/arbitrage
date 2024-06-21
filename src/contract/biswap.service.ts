import { Injectable, Inject } from '@nestjs/common';
import {
  Contract,
  ContractTransactionResponse,
  JsonRpcApiProvider,
  Wallet,
} from 'ethers';
import { EthersProviderToken } from 'src/infra/provider';
import * as BiswapRouterABI from './abis/biswapRouter.json';
import * as BiswapFactoryABI from './abis/biswapFactory.json';
import * as BiswapPairABI from './abis/biswapPair.json';
import { EthersSignerToken } from 'src/infra/signer';
import { SLIPPAGE_TOLERANCE_RATE } from 'src/constants/order';
import BigNumber from 'bignumber.js';

@Injectable()
export class BiswapService {
  DEADLINE_LIMIT = 5 * 60 * 1000; // 5 minutes

  biswapRouter: Contract;
  biswapFactory: Contract;

  constructor(
    @Inject(EthersProviderToken)
    private readonly ethersProvider: JsonRpcApiProvider,
    @Inject(EthersSignerToken)
    private readonly wallet: Wallet,
  ) {
    this.biswapRouter = new Contract(
      '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
      BiswapRouterABI,
      this.ethersProvider,
    );

    this.biswapFactory = new Contract(
      '0x858E3312ed3A876947EA49d572A7C42DE08af7EE',
      BiswapFactoryABI.abi,
      this.ethersProvider,
    );
  }

  async getPair(
    pairAddress: string,
    tokenA: string,
    tokenB: string,
  ): Promise<Contract> {
    // let pairAddress: string = PairAddress[pair];
    // if (!pairAddress) {
    //   pairAddress = await this.biswapFactory.getPair(tokenA, tokenB);
    //   console.log(`[getPair] new pair: ${pairAddress}`);
    // }

    const pairContract = new Contract(
      pairAddress,
      BiswapPairABI.abi,
      this.ethersProvider,
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
    const routerWithSigner = this.biswapRouter.connect(this.wallet) as any;

    const result = await routerWithSigner.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      addresses,
      this.wallet.address,
      Date.now() + this.DEADLINE_LIMIT,
    );

    return result;
  }

  async swapTokensForExactTokens(
    amountInMax: bigint,
    amountOut: bigint,
    addresses: string[],
  ): Promise<null | ContractTransactionResponse> {
    const routerWithSigner = this.biswapRouter.connect(this.wallet) as any;

    const result = await routerWithSigner.swapTokensForExactTokens(
      amountOut,
      amountInMax,
      addresses,
      this.wallet.address,
      Date.now() + this.DEADLINE_LIMIT,
    );

    return result;
  }

  async estimateGasByswapTokensForExactTokens(
    amountIn: bigint,
    amountOut: bigint,
    addresses: string[],
  ): Promise<bigint> {
    const routerWithWithSigner = this.biswapRouter.connect(this.wallet) as any;

    const gasFee =
      await routerWithWithSigner.swapTokensForExactTokens.estimateGas(
        amountOut,
        amountIn,
        addresses,
        this.wallet.address,
        Date.now() + this.DEADLINE_LIMIT / 1000,
      );

    return gasFee;
  }

  async estimateGasByswapExactTokensForTokens(
    amountIn: bigint,
    amountOut: bigint,
    addresses: string[],
  ): Promise<bigint> {
    const routerWithWithSigner = this.biswapRouter.connect(this.wallet) as any;

    const gasFee =
      await routerWithWithSigner.swapExactTokensForTokens.estimateGas(
        amountIn,
        amountOut,
        addresses,
        this.wallet.address,
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
    input: number | string | bigint,
    token0Address: string,
    token1Address: string,
  ): Promise<[bigint, bigint]> {
    const [amountIn, amountOut] = (await this.biswapRouter.getAmountsOut(
      input,
      [token0Address, token1Address],
    )) as [bigint, bigint];

    return [
      amountIn,
      // amountOut,
      BigInt(
        BigNumber(amountOut.toString())
          .times(1 - SLIPPAGE_TOLERANCE_RATE)
          .toFixed(0),
      ),
    ];
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
