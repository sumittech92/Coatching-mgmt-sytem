import { Injectable, isDevMode } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { MockAuthService } from './mock-auth.service';

@Injectable({ providedIn: 'root' })
export class RoleAccessGuard implements CanActivate {
  constructor(private auth: MockAuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    // Development demo: let testers open every panel from the same sign-in.
    if (isDevMode()) return true;
    const roles = route.data['roles'] as string[] | undefined;
    if (!roles || roles.includes(this.auth.role)) return true;
    this.router.navigateByUrl(this.auth.landingPath);
    return false;
  }
}
