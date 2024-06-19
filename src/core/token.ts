import { Token as IToken } from 'src/types/pair.model';

export class Token implements IToken {
  readonly name: string;
  readonly symbol: string;
  readonly ex_symbol: string;
  readonly decimals: number;
  readonly address: string;

  constructor(_token: IToken) {
    this.name = _token.name;
    this.symbol = _token.symbol;
    this.ex_symbol = _token.ex_symbol;
    this.decimals = _token.decimals;
    this.address = _token.address;
  }

  getName() {
    return this.name;
  }

  getSymbol() {
    return this.symbol;
  }

  getExSymbol() {
    return this.ex_symbol;
  }

  getDecimals() {
    return this.decimals;
  }

  getAddress() {
    return this.address;
  }
}
