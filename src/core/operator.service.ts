import { Injectable, Inject } from '@nestjs/common';
import { TokenContractService } from 'src/contract/tokenContract.service';
import { BiswapServiceToken } from 'src/constants/services';
import { Pair } from './pair';
import { tokens } from 'src/constants/tokens';
import { Token } from './token';
import { LoggerService } from 'src/infra/logger/logger.service';
import { MaxInt256 } from 'ethers';
import { Timeout } from '@nestjs/schedule';
import { OrderService } from './order.service';
import { PriceService } from './price.service';
import { DEXService } from 'src/contract/dex.service';

const TOKENS = tokens.chain_56;

@Injectable()
export class OperatorService {
  tokens: Token[];
  pairs: Pair[];

  constructor(
    private orderService: OrderService,
    private priceService: PriceService,
    private tokenContractService: TokenContractService,
    @Inject(BiswapServiceToken)
    private biswapService: DEXService,
    private logger: LoggerService,
  ) {}

  @Timeout(0)
  async initPair() {
    // 사용 토큰 approve 확인

    /**
     * @todo 추후 토큰은 파라미터화
     */
    const token0 = new Token(TOKENS.NEAR);
    const token1 = new Token(TOKENS.WBNB);
    const token2 = new Token(TOKENS.SAND);
    const token3 = new Token(TOKENS.USDT);
    this.tokens = [token0, token1, token2, token3];
    this.pairs = [
      await this.biswapService.buildPair(token0, token1, 1),
      await this.biswapService.buildPair(token2, token3, 100),
    ];

    for (const pair of this.pairs) {
      // token contract 가져오기
      const baseTokenContract = this.tokenContractService.getContract(
        pair.token0.address,
      );
      const quoteTokenContract = this.tokenContractService.getContract(
        pair.token1.address,
      );

      const routerAddress = await this.biswapService.router.getAddress();

      for (const tokenContract of [baseTokenContract, quoteTokenContract]) {
        let allowanceToRouter = await this.tokenContractService.allowance(
          tokenContract,
          routerAddress,
        );

        this.logger.log(
          `[initPair] Allowance to pair ${await tokenContract.getAddress()}: ${allowanceToRouter}`,
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
    try {
      for (const pair of this.pairs) {
        const { cexPrice, dexPrice, totalCost, amountIn, amountOut } =
          await this.priceService.getPrice(pair);
        await this.orderService.binanceToDEX(pair, {
          cexPrice,
          dexPrice,
          totalCost,
          amountIn,
          amountOut,
        });

        const price = await this.priceService.getPrice(pair, true);
        await this.orderService.DEXToBinance(pair, price);
      }
    } catch (err) {
      this.logger.error(err.message, err.trace, 'operator-runner');
    } finally {
      setTimeout(() => this.runner(), 1_000);
    }
  }
}
