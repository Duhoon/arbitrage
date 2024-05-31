import { Pair } from 'src/models/pair.model';

export const CEXPairs = ['NEAR/BNB', 'SAND/USDT', 'SAND/ETH', 'NEAR/USDT'];
export const DEXPairs = ['NEAR/WBNB', 'SAND/USDT', 'SAND/ETH', 'NEAR/USDT'];

export const PairAddress = {
  'NEAR/WBNB': '0xe0E9FDd2F0BcdBcaF55661B6Fa1efc0Ce181504b',
};

export const PairCEXTradeFee = {
  'NEAR/BNB': 0,
};

export const Pairs: Pair[] = [
  {
    name: 'NEAR/BNB',
    address: '0xe0E9FDd2F0BcdBcaF55661B6Fa1efc0Ce181504b',
    token0: {
      name: 'Near Token',
      symbol: 'NEAR',
      ex_symbol: 'NEAR',
      decimals: 18,
      address: '0x1fa4a73a3f0133f0025378af00236f3abdee5d63',
    },
    token1: {
      name: 'Wrapped BNB',
      symbol: 'WBNB',
      ex_symbol: 'BNB',
      decimals: 18,
      address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    },
  },
];
