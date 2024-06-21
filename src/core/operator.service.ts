import { Injectable } from '@nestjs/common';
import { TokenContractService } from 'src/contract/tokenContract.service';
import { BiswapService } from 'src/contract/biswap.service';
import { Pair } from './pair';
import { tokens } from 'src/constants/tokens';
import { Token } from './token';
import { LoggerService } from 'src/infra/logger/logger.service';
import { MaxInt256 } from 'ethers';

const TOKENS = tokens.chain_56;

@Injectable()
export class OperatorService {
  pairs: Pair[];
  pairIndex: 0;

  constructor(
    private tokenContractService: TokenContractService,
    private biswapService: BiswapService,
    private logger: LoggerService,
  ) {}

  async initPair() {
    // 사용 토큰 approve 확인
    const token0 = new Token(TOKENS.NEAR);
    const token1 = new Token(TOKENS.WBNB);
    this.pairs = [await this.biswapService.buildPair(token0, token1)];

    /**
     * pair 가져오기
     */
    const pair = this.pairs[this.pairIndex];

    /**
     * token contract 가져오기
     */
    const baseTokenContract = this.tokenContractService.getContract(
      pair.token0.address,
    );
    const quoteTokenContract = this.tokenContractService.getContract(
      pair.token1.address,
    );

    const routerAddress = await this.biswapService.biswapRouter.getAddress();

    for (const tokenContract of [baseTokenContract, quoteTokenContract]) {
      let allowanceToRouter = await this.tokenContractService.allowance(
        tokenContract,
        routerAddress,
      );

      this.logger.log(
        `[initPair] Allowance to pair: ${allowanceToRouter}`,
        'initPair',
      );

      if (allowanceToRouter <= 0) {
        this.logger.log(`[initPair] Infinite Approve to Pair for ${pair}`);
        await this.tokenContractService.approve(
          tokenContract,
          routerAddress,
          MaxInt256,
        );
        allowanceToRouter = await this.tokenContractService.allowance(
          tokenContract,
          routerAddress,
        );
        this.logger.log(
          `[initPair] Allowance to Router after Approve: ${allowanceToRouter}`,
          'initPair',
        );
      }
    }
  }
}
