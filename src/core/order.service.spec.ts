import { Test } from '@nestjs/testing';
import { CoreModule } from './core.module';
import { OrderService } from './order.service';
import { OperatorService } from './operator.service';
import { AppModule } from 'src/app.module';
import { Pair } from './pair';
import { Pairs } from 'src/constants/pairs';
import { Token } from './token';
import { tokens } from 'src/constants/tokens';

const TOKENS = tokens.chain_56;

describe('OrderService', () => {
  const NEAR = new Token(TOKENS.NEAR);
  const BNB = new Token(TOKENS.WBNB);

  const operatorService = {
    tokens: [NEAR, BNB],
    pairs: [
      new Pair('NEAR/BNB', '0xe0E9FDd2F0BcdBcaF55661B6Fa1efc0Ce181504b', 1, [
        NEAR,
        BNB,
      ]),
    ],
  };
  let orderService: OrderService;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OperatorService)
      .useValue(operatorService)
      .compile();

    orderService = moduleRef.get<OrderService>(OrderService);
  });

  it('get asset balance', async () => {
    const pairs = operatorService.pairs;
    const pair = pairs[0];

    const [token0Balance, token1Balance] = await orderService.getBalance(
      pair.getToken0(),
      pair.getToken1(),
    );

    console.log(
      `token0Balance: ${token0Balance}, token1Balance: ${token1Balance}`,
    );
    expect(typeof token0Balance).toEqual('number');
    expect(typeof token1Balance).toEqual('number');
  });
});
