export interface Pair {
  name: string;
  address: string;
  token0: Token;
  token1: Token;
}

export interface Token {
  name: string;
  symbol: string;
  ex_symbol: string;
  decimals: number;
  address: string;
  binancePrice?: number;
}
