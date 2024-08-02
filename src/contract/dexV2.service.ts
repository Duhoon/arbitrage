import { Injectable, Inject } from '@nestjs/common';
import {
  Contract,
  ContractTransactionResponse,
  JsonRpcApiProvider,
  Wallet,
} from 'ethers';
import * as BiswapRouterABI from './abis/UniswapV2Router.json';
import * as BiswapFactoryABI from './abis/UniswapV2Factory.json';
import * as BiswapPairABI from './abis/UniswapV2Pair.json';
import { Token } from 'src/core/token';
import { Pair } from 'src/core/pair';
import { BinanceProviderToken } from 'src/infra/provider';
import { BinanceSignerToken } from 'src/infra/signer';
import BigNumber from 'bignumber.js';
import { DEADLINE_LIMIT } from 'src/constants/contract';
import { SLIPPAGE_TOLERANCE_RATE } from 'src/constants/order';

@Injectable()
export class DEXV2Service {
  router: Contract;
  factory: Contract;

  constructor(
    @Inject(BinanceProviderToken)
    private readonly ethersProvider: JsonRpcApiProvider,
    @Inject(BinanceSignerToken)
    private readonly wallet: Wallet,
    routerAddress: string,
    factoryAddress: string,
  ) {
    this.router = new Contract(
      routerAddress,
      BiswapRouterABI,
      this.ethersProvider,
    );

    this.factory = new Contract(
      factoryAddress,
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

    const pair = new Pair(name, address, input, [token0, token1]);

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
