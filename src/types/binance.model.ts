export interface CoinInfo {
  priceSize: string;
  qtySize: string;
}

export interface SymbolInfo {
  status: string;
  contractStatus: string;
  baseAsset: string;
  quoteAsset: string;
  filters: Array<{ filterType: string; tickSize?: string; stepSize?: string }>;
  contractType: string;
}

export interface ExchangeInfoResponse {
  symbols: SymbolInfo[];
}

export interface BalanceInfo {
  available: number;
  use: number;
  total: number;
}

export interface OrderbookMessage {
  data: {
    bids: [string, string][];
    asks: [string, string][];
  };
  stream: string;
}
