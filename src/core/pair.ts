import { Pair as IPair } from 'src/types/pair.model';
import { Token } from './token';

export class Pair implements IPair {
  readonly name: string;
  readonly address: string;
  readonly token0: Token;
  readonly token1: Token;

  constructor(_pair: IPair) {
    this.name = _pair.name;
    this.address = _pair.address;
    this.token0 = new Token(_pair.token0);
    this.token1 = new Token(_pair.token1);
  }

  getName() {
    return this.name;
  }

  getSymbol() {
    return this.name.split('/').slice(0, 2);
  }

  getBinanceSymbol() {
    return this.name.split('/').slice(0, 2).join();
  }

  getAddress() {
    return this.address;
  }

  getToken0() {
    return this.token0;
  }

  getToken1() {
    return this.token1;
  }
}
