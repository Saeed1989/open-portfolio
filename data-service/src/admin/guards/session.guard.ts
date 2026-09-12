import { CanActivate, Injectable } from '@nestjs/common';

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(): boolean {
    // TODO: require a valid session cookie (FR-AUTH-3) and attach the tenant
    // scope that @Tenant() reads (FR-TEN-4).
    return true;
  }
}
