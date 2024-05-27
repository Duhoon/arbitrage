import { Injectable } from '@nestjs/common';
import { baseTokens, quoteTokens } from 'src/constants/tokens';
import { TokenMetaData } from 'src/models/token.model';
import { DEXPairs, CEXPairs } from 'src/constants/pairs';

@Injectable()
export class TokenService {
  baseTokens: TokenMetaData[];
  quoteTokens: TokenMetaData[];
  pairs: { DEXPairs: string[]; CEXPairs: string[] };

  constructor() {
    this.setTokens();
    this.setPairs();
  }

  setTokens() {
    this.baseTokens = baseTokens as TokenMetaData[];
    this.quoteTokens = quoteTokens as TokenMetaData[];
  }

  setPairs() {
    this.pairs = { DEXPairs, CEXPairs };
  }

  getSymbol(pair: string): string[] {
    return pair.split('/').slice(0, 2);
  }

  getTokensInfo(pair: string): Array<TokenMetaData> {
    const [baseTokenSym, quoteTokenSym] = this.getSymbol(pair);
    const baseTokenInfo = baseTokens.find(
      (token) =>
        token.ex_symbol === baseTokenSym || token.symbol === baseTokenSym,
    );
    const quoteTokenInfo = quoteTokens.find(
      (token) =>
        token.ex_symbol === quoteTokenSym || token.symbol === quoteTokenSym,
    );

    return [baseTokenInfo, quoteTokenInfo];
  }
}
