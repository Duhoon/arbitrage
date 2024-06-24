export interface OrderHistoryDTO {
  date: Date;
  pair: string;
  input: number;
  cex_price: number;
  dex_price: number;
  cost: number;
  cex_balance: number | string;
  dex_balance: number | string;
  memo?: string;
}
