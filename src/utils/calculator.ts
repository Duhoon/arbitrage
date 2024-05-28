import { formatUnits } from 'ethers';

export function getAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): bigint {
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;

  return numerator / denominator;
}

export function getAmountIn(
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): bigint {
  const numerator = reserveIn * amountOut * 1000n;
  const denominator = (reserveOut - amountOut) * 997n;
  return numerator / denominator + 1n;
}

export function calculatePriceImpact(
  amountIn: bigint,
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  decimalIn: number,
  decimalOut: number,
) {
  const actualPrice = Number(amountOut) / Number(amountIn);

  const idealPrice =
    Number(formatUnits(reserveOut.toString(), decimalIn)) /
    Number(formatUnits(reserveIn.toString(), decimalOut));

  return Math.abs(actualPrice / idealPrice - 1);
}
