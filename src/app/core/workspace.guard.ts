import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { MockAuthService } from './mock-auth.service';
import { TenantContextService } from './tenant-context.service';

/** Keeps a real coaching or school account out of the clothing-shop workspace; demo sessions can still preview it. */
@Injectable({ providedIn: 'root' })
export class ShopWorkspaceGuard implements CanActivate {
  constructor(private tenant: TenantContextService, private auth: MockAuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    return this.tenant.isLocked ? this.router.parseUrl(this.auth.landingPath) : true;
  }
}
