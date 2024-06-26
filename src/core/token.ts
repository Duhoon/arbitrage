export class Token {
  readonly name: string;
  readonly symbol: string;
  readonly ex_symbol: string;
  readonly decimals: number;
  readonly address: string;
  binancePrice: number;

  constructor(_token: any) {
    this.name = _token.name;
    this.symbol = _token.symbol;
    this.ex_symbol = _token.ex_symbol;
    this.decimals = _token.decimals;
    this.address = _token.address;
    if (_token.ex_symbol === 'USDT') {
      this.binancePrice = 1;
    } else {
      this.binancePrice = -1;
    }
  }

  setBinancePrice(price: number) {
    this.binancePrice = price;
  }
}
