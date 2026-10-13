import { Injectable } from '@angular/core';
import { CanActivate, Router, RouterStateSnapshot, UrlTree, ActivatedRouteSnapshot } from '@angular/router';
import { MockAuthService } from './mock-auth.service';

/** Sends visitors without a session (or with an expired backend token) to /login, remembering where they were going. */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: MockAuthService, private router: Router) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (this.auth.isAuthenticated && !AuthGuard.isExpired(this.auth.token)) return true;
    if (this.auth.isAuthenticated) this.auth.logout();
    return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  private static isExpired(token: string | null): boolean {
    if (!token) return false; // demo session
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
    } catch { return true; }
  }
}
