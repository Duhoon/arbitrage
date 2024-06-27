import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BinanceClientService } from 'src/infra/binanceClient.service';
import { TokenContractService } from 'src/contract/tokenContract.service';
import { Side, OrderType, TimeInForce } from '@binance/connector-typescript';
import { formatUnits } from 'ethers';
import { OrderHistory } from 'src/infra/db/entities';
import { Repository } from 'typeorm';
import { SheetsService } from 'src/periphery/sheets.service';
import { LoggerService } from 'src/infra/logger/logger.service';
import { Pair } from './pair';
import { OrderDTO } from './core.dto';
import { Token } from './token';
import { BiswapServiceToken } from 'src/constants/services';
import { DEXV2Service } from 'src/contract/dexV2.service';

@Injectable()
export class OrderService {
  private orderLock = false;

  constructor(
    private readonly logger: LoggerService,
    private readonly binanceClientService: BinanceClientService,
    private readonly tokenContractService: TokenContractService,
    @Inject(BiswapServiceToken)
    private readonly biswapService: DEXV2Service,
    private readonly sheetsService: SheetsService,
    @InjectRepository(OrderHistory)
    private readonly orderHistoryRepository: Repository<OrderHistory>,
  ) {}

  async binanceToDEX(
    pair: Pair,
    { cexPrice, dexPrice, totalCost, amountIn, amountOut }: OrderDTO,
  ) {
    const currentDate = new Date();

    try {
      const profit = (dexPrice - cexPrice) * pair.input;

      if (profit < totalCost || this.orderLock) {
        return;
      }
      if (process.env.NODE_ENV !== 'production') {
        this.logger.error(
          'this is not production. No make order',
          'binanceToDEX',
        );
        return;
      }
      this.orderLock = true;

      // Balance Check
      const [cexBalance] = await this.getBalance(
        pair.getToken0(),
        pair.getToken1(),
      );
      const tokenContract = this.tokenContractService.getContract(
        pair.getToken0().address,
      );
      const dexBalance = formatUnits(
        (await this.tokenContractService.balance(tokenContract)).toString(),
        pair.getToken1().decimals,
      );

      if (Number(cexBalance) < pair.input || Number(dexBalance) < pair.input) {
        return Error(`balance is not enough`);
      }

      // CEX Order
      const orderResult = await this.order(
        `${pair.getToken0().ex_symbol}${pair.getToken1().ex_symbol}`,
        pair.input,
        cexPrice,
        Side.BUY,
      );

      // DEX Swap
      const swapResult = await this.biswapService.swapExactTokensForTokens(
        amountIn,
        amountOut,
        pair.getPathForward(),
      );

      const orderHistory = await this.orderHistoryRepository.save({
        pair: pair.name,
        currentDate,
        profit,
        cost: totalCost,
        orderId: orderResult.clientOrderId,
        swapTxHash: swapResult.hash,
      });

      await this.sheetsService.appendRow({
        date: currentDate,
        pair: pair.name,
        input: pair.input,
        cex_price: cexPrice,
        dex_price: dexPrice,
        cost: totalCost,
        cex_balance: cexBalance,
        dex_balance: dexBalance,
      });

      swapResult.wait().then((result) => {
        this.orderHistoryRepository.update(orderHistory.id, {
          swapSuccess: true,
        });
      });
    } catch (err) {
      this.logger.error(err.message, err.trace);
      throw err;
    } finally {
      this.orderLock = false;
    }
  }

  async DEXToBinance(
    pair: Pair,
    { cexPrice, dexPrice, totalCost, amountIn, amountOut }: OrderDTO,
  ) {
    const currentDate = new Date();

    try {
      const profit = (cexPrice - dexPrice) * pair.input;

      if (profit < totalCost || this.orderLock) {
        return;
      }
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(
          'this is not production. No make order',
          'DEXToBinance',
        );
        return;
      }
      this.orderLock = true;

      const [, cexBalance] = await this.getBalance(
        pair.getToken0(),
        pair.getToken1(),
      );
      const tokenContract = this.tokenContractService.getContract(
        pair.getToken1().address,
      );
      const dexBalance = formatUnits(
        (await this.tokenContractService.balance(tokenContract)).toString(),
        pair.getToken1().decimals,
      );

      if (Number(cexBalance) < pair.input || Number(dexBalance) < pair.input) {
        return Error(`balance is not enough`);
      }

      // CEX Order
      const orderResult = await this.order(
        `${pair.getToken0().ex_symbol}${pair.getToken1().ex_symbol}`,
        pair.input,
        cexPrice,
        Side.SELL,
      );

      // DEX Swap
      const swapResult = await this.biswapService.swapExactTokensForTokens(
        amountIn,
        amountOut,
        pair.getPathReversed(),
      );

      const orderHistory = await this.orderHistoryRepository.save({
        pair: pair.name,
        currentDate,
        profit,
        cost: totalCost,
        orderId: orderResult.clientOrderId,
        swapTxHash: swapResult.hash,
      });

      await this.sheetsService.appendRow({
        date: currentDate,
        pair: pair.name,
        input: pair.input,
        cex_price: cexPrice,
        dex_price: dexPrice,
        cost: totalCost,
        cex_balance: cexBalance,
        dex_balance: dexBalance,
      });

      swapResult.wait().then((result) => {
        this.orderHistoryRepository.update(orderHistory.id, {
          swapSuccess: true,
        });
      });
    } catch (err) {
      console.log(err);
    } finally {
      this.orderLock = false;
    }
  }

  private async order(
    symbol: string,
    output: number,
    CEXPrice: number,
    side: Side,
  ): Promise<any> {
    // input: 코인 개수 (decimal X)
    // CEXPrice: 해당 토큰 가격
    const result = await this.binanceClientService.client.newOrder(
      symbol,
      side,
      OrderType.LIMIT,
      { quantity: output, price: CEXPrice, timeInForce: TimeInForce.GTC },
    );

    return result;
  }

  private async withdraw(
    token: string,
    // to: string,
    amount: number,
    network: string,
  ): Promise<any> {
    const result = await this.binanceClientService.client.withdraw(
      token,
      process.env.WALLET_ADDRESS,
      amount,
      {
        network,
      },
    );

    return result;
  }

  private async deposit(token: string, to: string, amount: number) {
    const tokenContract = this.tokenContractService.getContract(token);
  }

  async cancelOrder(pair: string, orderId: number): Promise<any> {
    const result = await this.binanceClientService.client.cancelOrder(pair, {
      orderId,
    });

    console.log(`[CancelOrder] ${result}`);

    return result;
  }

  async transferERC20(to: string, from: string, amount: number) {}

  async getBalance(tokenIn: Token, tokenOut: Token) {
    const balances = await this.binanceClientService.client.userAsset();

    const balanceOfTokenIn = Object.values(
      balances.find((balance) => balance.asset === tokenIn.ex_symbol) || [0],
    ).reduce((sum, value) => (Number(value) ? sum + Number(value) : sum), 0);
    const balacneOfTokenOut = Object.values(
      balances.find((balance) => balance.asset === tokenOut.ex_symbol) || [0],
    ).reduce((sum, value) => (Number(value) ? sum + Number(value) : sum), 0);

    return [balanceOfTokenIn, balacneOfTokenOut];
  }
}
