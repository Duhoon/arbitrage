import { Test } from '@nestjs/testing';
import { PriceService } from './price.service';
import { AppModule } from 'src/app.module';

describe('PriceService', () => {
  let priceService: PriceService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    priceService = moduleRef.get<PriceService>(PriceService);
  });

  describe('get user balances', () => {});
});
