import { Injectable } from '@nestjs/common';
import { TokenContractService } from 'src/contract/tokenContract.service';
import { BiswapService } from 'src/contract/biswap.service';
import { Pair } from './pair';
import { tokens } from 'src/constants/tokens';
import { Token } from './token';
import { LoggerService } from 'src/infra/logger/logger.service';
import { MaxInt256 } from 'ethers';
import { Timeout } from '@nestjs/schedule';
import { OrderService } from './order.service';
import { PriceService } from './price.service';
import { TOKEN_A_INPUT } from 'src/constants/order';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceHistory } from 'src/infra/db/entities';
import { Repository } from 'typeorm';

const TOKENS = tokens.chain_56;

@Injectable()
export class OperatorService {
  tokens: Token[];
  pairs: Pair[];
  private pairIndex = 0; // ['NEAR/BNB', 'SAND/USDT', 'SAND/ETH', 'NEAR/USDT'];

  constructor(
    private orderService: OrderService,
    private priceService: PriceService,
    private tokenContractService: TokenContractService,
    private biswapService: BiswapService,
    private logger: LoggerService,
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
  ) {}

  @Timeout(0)
  async initPair() {
    // 사용 토큰 approve 확인

    /**
     * @todo 추후 토큰은 파라미터화
     */
    const token0 = new Token(TOKENS.NEAR);
    const token1 = new Token(TOKENS.WBNB);
    this.tokens = [token0, token1];
    this.pairs = [await this.biswapService.buildPair(token0, token1)];

    for (const pair of this.pairs) {
      // token contract 가져오기
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

  @Timeout(2_000)
  async runner() {
    const currentDate = new Date();

    try {
      const pair = this.pairs[this.pairIndex];
      const { cexPrice, dexPrice, totalCost, amountIn, amountOut } =
        await this.priceService.getPrice(pair, TOKEN_A_INPUT);
      await this.orderService.binanceToDEX(pair, {
        cexPrice,
        dexPrice,
        totalCost,
        amountIn,
        amountOut,
      });
    } catch (err) {
      this.logger.error(err.message, err.trace, 'operator-runner');
    } finally {
      setTimeout(() => this.runner(), 1_000);
    }
  }
}
