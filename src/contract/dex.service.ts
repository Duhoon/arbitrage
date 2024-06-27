import { Injectable, Inject } from '@nestjs/common';
import {
  Contract,
  ContractTransactionResponse,
  JsonRpcApiProvider,
  Wallet,
} from 'ethers';
import * as BiswapRouterABI from './abis/UniswapRouter.json';
import * as BiswapFactoryABI from './abis/UniswapFactory.json';
import * as BiswapPairABI from './abis/UniswapPair.json';
import { Token } from 'src/core/token';
import { Pair } from 'src/core/pair';
import { EthersProviderToken } from 'src/infra/provider';
import { EthersSignerToken } from 'src/infra/signer';
import BigNumber from 'bignumber.js';
import { DEADLINE_LIMIT } from 'src/constants/contract';
import { SLIPPAGE_TOLERANCE_RATE } from 'src/constants/order';

@Injectable()
export class DEXService {
  router: Contract;
  factory: Contract;

  constructor(
    @Inject(EthersProviderToken)
    private readonly ethersProvider: JsonRpcApiProvider,
    @Inject(EthersSignerToken)
    private readonly wallet: Wallet,
  ) {
    this.router = new Contract(
      '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
      BiswapRouterABI,
      this.ethersProvider,
    );

    this.factory = new Contract(
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
    //   pairAddress = await this.factory.getPair(tokenA, tokenB);
    //   console.log(`[getPair] new pair: ${pairAddress}`);
    // }

    const pairContract = new Contract(
      pairAddress,
      BiswapPairABI.abi,
      this.ethersProvider,
    );

    return pairContract;
  }

  async buildPair(token0: Token, token1: Token, input: number): Promise<Pair> {
    const name = `${token0.ex_symbol}/${token1.ex_symbol}`;
    const address = await this.factory.getPair(token0.address, token1.address);

    const pair = new Pair(
      {
        name,
        address,
        token0,
        token1,
      },
      input,
      [token0, token1],
    );

    return pair;
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
    const routerWithSigner = this.router.connect(this.wallet) as any;

    const result = await routerWithSigner.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      addresses,
      this.wallet.address,
      Date.now() + DEADLINE_LIMIT,
    );

    return result;
  }

  async swapTokensForExactTokens(
    amountInMax: bigint,
    amountOut: bigint,
    addresses: string[],
  ): Promise<null | ContractTransactionResponse> {
    const routerWithSigner = this.router.connect(this.wallet) as any;

    const result = await routerWithSigner.swapTokensForExactTokens(
      amountOut,
      amountInMax,
      addresses,
      this.wallet.address,
      Date.now() + DEADLINE_LIMIT,
    );

    return result;
  }

  async estimateGasByswapTokensForExactTokens(
    amountIn: bigint,
    amountOut: bigint,
    addresses: string[],
  ): Promise<bigint> {
    const routerWithWithSigner = this.router.connect(this.wallet) as any;

    const gasFee =
      await routerWithWithSigner.swapTokensForExactTokens.estimateGas(
        amountOut,
        amountIn,
        addresses,
        this.wallet.address,
        Date.now() + DEADLINE_LIMIT / 1000,
      );

    return gasFee;
  }

  async estimateGasByswapExactTokensForTokens(
    amountIn: bigint,
    amountOut: bigint,
    addresses: string[],
  ): Promise<bigint> {
    const routerWithWithSigner = this.router.connect(this.wallet) as any;

    const gasFee =
      await routerWithWithSigner.swapExactTokensForTokens.estimateGas(
        amountIn,
        amountOut,
        addresses,
        this.wallet.address,
        Date.now() + DEADLINE_LIMIT / 1000,
      );

    return gasFee;
  }

  async quote(amountA, tokenAReserve, tokenBReserve) {
    const quote = await this.router.quote(
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
    const [amountIn, amountOut] = (await this.router.getAmountsOut(input, [
      token0Address,
      token1Address,
    ])) as [bigint, bigint];

    return [
      amountIn,
      BigInt(
        BigNumber(amountOut.toString())
          .times(1 - SLIPPAGE_TOLERANCE_RATE)
          .toFixed(0),
      ),
    ];
  }

  async getAmountIn(
    input: number | string | bigint,
    token0Address: string,
    token1Address: string,
  ): Promise<[bigint, bigint]> {
    const [amountIn, amountOut] = await this.router.getAmountsIn(input, [
      token0Address,
      token1Address,
    ]);

    return [
      BigInt(
        BigNumber(amountIn.toString())
          .times(1 + SLIPPAGE_TOLERANCE_RATE)
          .toFixed(0),
      ),
      amountOut,
    ];
  }
}
