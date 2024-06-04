export interface PriceDTO {
  cexPrice: number;
  dexPrice: number;
  totalFee: number;
  amountIn: bigint;
  amountOut: bigint;
  baseReserve?: bigint;
  quoteReserve?: bigint;
}
