import { Test } from '@nestjs/testing';
import { CoreModule } from './core.module';
import { OrderService } from './order.service';
import { OperatorService } from './operator.service';
import { AppModule } from 'src/app.module';
import { Pair } from './pair';
import { Pairs } from 'src/constants/pairs';

describe('OrderService', () => {
  const operatorService = {
    pairs: [new Pair(Pairs[0], 1)],
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
      pair.token0,
      pair.token1,
    );

    console.log(
      `token0Balance: ${token0Balance}, token1Balance: ${token1Balance}`,
    );
    expect(typeof token0Balance).toEqual('number');
    expect(typeof token1Balance).toEqual('number');
  });
});
