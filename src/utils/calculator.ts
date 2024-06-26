import { formatUnits } from 'ethers';
import BigNumber from 'bignumber.js';

export function getAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): bigint {
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;

  const amountInWithFeeBG = BigNumber(amountIn.toString()).times(997);
  const numeratorBG = amountInWithFeeBG.times(BigNumber(reserveOut.toString()));
  const denominatorBG = BigNumber(reserveIn.toString())
    .times(1000)
    .plus(amountInWithFeeBG);

  console.log(numerator / denominator);
  console.log(numeratorBG.div(denominatorBG).toString());

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
  const actualPrice = BigNumber(amountOut.toString()).div(
    BigNumber(amountIn.toString()),
  );

  const idealPrice = BigNumber(
    formatUnits(reserveOut.toString(), decimalIn),
  ).div(BigNumber(formatUnits(reserveIn.toString(), decimalOut)));
  return Math.abs(actualPrice.div(idealPrice).toNumber() - 1);
}

export function toPercentage(value: number): number {
  return Number((value * 100).toFixed(3));
}
