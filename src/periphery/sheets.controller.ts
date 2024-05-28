import { Controller, Get, Query, Inject } from '@nestjs/common';
import { SheetsService } from './sheets.service';

@Controller()
export class SheetsController {
  constructor(
    @Inject(SheetsService)
    private readonly sheetService: SheetsService,
  ) {}

  @Get('auth')
  async auth(@Query('code') code: any) {
    console.log(code);
  }
}
