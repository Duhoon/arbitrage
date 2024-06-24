export interface PriceDTO {
  cexPrice: number;
  dexPrice: number;
  totalCost: number;
  amountIn: bigint;
  amountOut: bigint;
  baseReserve?: bigint;
  quoteReserve?: bigint;
}
