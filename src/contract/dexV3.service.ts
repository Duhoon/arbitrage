import { Injectable, Inject } from '@nestjs/common';
import { Contract, JsonRpcApiProvider, Wallet } from 'ethers';
import { BinanceProviderToken } from 'src/infra/provider';
import { BinanceSignerToken } from 'src/infra/signer';
import * as UniswapV3Router from './abis/UniswapV3SwapRouter.json';
import * as UniswapV3Factory from './abis/UniswapV3Factory.json';
import * as UniswapV3Pool from './abis/UniswapV3Pool.json';

/**
 * @todo DEX V3 Factory
 */

@Injectable()
export class DEXV3Service {
  router: Contract;
  factory: Contract;

  constructor(
    @Inject(BinanceProviderToken)
    private ethersProvider: JsonRpcApiProvider,
    @Inject(BinanceSignerToken)
    private ethersSigner: Wallet,
    routerAddress: string,
    factoryAddress: string,
  ) {
    this.router = new Contract(
      routerAddress,
      UniswapV3Router.abi,
      this.ethersProvider,
    );
    this.factory = new Contract(
      factoryAddress,
      UniswapV3Factory.abi,
      this.ethersProvider,
    );
  }
}
