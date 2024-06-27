import { Token } from './token';

/**
 * Pair 관련 데이터 클래스
 */
export class Pair {
  readonly name: string;
  readonly address: string;
  /**
   *  path 순서로 Token 인스턴스 정렬해서 넣자
   */
  readonly tokens: Token[];
  readonly token0: Token;
  readonly token1: Token;
  input: number;

  constructor(_pair: any, _input: number, tokens: Token[]) {
    this.name = _pair.name;
    this.address = _pair.address;
    this.token0 = _pair.token0;
    this.token1 = _pair.token1;
    this.input = _input;
  }

  getSymbol() {
    return this.name.split('/').slice(0, 2);
  }

  getBinanceSymbol() {
    return this.name.split('/').slice(0, 2).join('');
  }

  getPathForward() {
    return this.tokens;
  }

  getPathReversed() {
    return this.tokens.reverse();
  }
}
