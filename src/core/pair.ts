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
  input: number;

  constructor(
    _name: string,
    _address: string,
    _input: number,
    _tokens: Token[],
  ) {
    this.name = _name;
    this.address = _address;
    this.input = _input;
    this.tokens = _tokens;
  }

  getSymbol() {
    return this.name.split('/').slice(0, 2);
  }

  getBinanceSymbol() {
    return this.name.split('/').slice(0, 2).join('');
  }

  getPathForward() {
    return this.tokens.map((token: Token) => token.address);
  }

  getPathReversed() {
    return this.tokens.reverse().map((token: Token) => token.address);
  }

  getToken0() {
    return this.tokens[0];
  }

  getToken1() {
    return this.tokens[this.tokens.length - 1];
  }
}
