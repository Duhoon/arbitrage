export interface RFQOrder {
  info: string;
  makerAsset: string;
  takerAsset: string;
  maker: string;
  allowedSender: string;
  makingAmount: string;
  takingAmount: string;
}

export interface OrderParams {
  baseToken: string;
  quoteToken: string;
  amount: string;
  taker: string;
  feeBps: number;
  chainId: number;
}

export interface TokenData {
  address: string;
  symbol: string;
  ex_symbol: string;
  decimals: number;
}

export interface Balance {
  currencyBalance: number;
  baseCurrencyBalance: number;
}

export type OrderBookEntry = [string, string];

export interface OrderBook {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
}

export interface ProfitableLevel {
  price: number;
  quantity: number;
}
