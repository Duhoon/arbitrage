import { Injectable, LoggerService as ILoggerService } from '@nestjs/common';
import { logger } from './winston.config';

@Injectable()
export class LoggerService implements ILoggerService {
  log(message: any, context?: string) {
    logger.info(message, { context });
  }

  error(message: string, trace: string, context?: string) {
    logger.error(message, { context, trace });
  }

  warn(message: string, context?: string) {
    logger.error(message, { context });
  }

  debug(message: string, context?: string) {
    logger.debug(message, { context });
  }
}
