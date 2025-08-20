import { Module, Global } from '@nestjs/common';
import { ErrorHandlerService } from './services';

@Global()
@Module({
  providers: [ErrorHandlerService],
  exports: [ErrorHandlerService],
})
export class CommonModule {} 