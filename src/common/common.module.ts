import { Module, Global } from '@nestjs/common';
import { ErrorHandlerService } from './services';
import { RoleGuard, PermissionGuard, AccessControlGuard } from './guards';

@Global()
@Module({
  providers: [ErrorHandlerService, RoleGuard, PermissionGuard, AccessControlGuard],
  exports: [ErrorHandlerService, RoleGuard, PermissionGuard, AccessControlGuard],
})
export class CommonModule {} 