import { CanActivate, Injectable } from '@nestjs/common';

@Injectable()
export class SlugGuard implements CanActivate {
  canActivate(): boolean {
    // TODO: reject a malformed or reserved slug with the same 404
    // an unknown slug gets, so neither is distinguishable.
    return true;
  }
}
