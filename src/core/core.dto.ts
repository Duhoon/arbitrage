import { Pair } from './pair';

export interface OrderDTO {
  cexPrice: number;
  dexPrice: number;
  totalCost: number;
  amountIn: bigint;
  amountOut: bigint;
}
