import { Injectable } from '@angular/core';
import { ApiRole, ApiUser, AuthApiService } from './auth-api.service';

export type DemoRole = 'Super Admin' | 'Owner' | 'Teacher' | 'Student' | 'Parent';

interface StoredSession { role: DemoRole; token: string | null; user: ApiUser | null; }

const SESSION_KEY = 'auth-session';
const ROLES: DemoRole[] = ['Super Admin', 'Owner', 'Teacher', 'Student', 'Parent'];
const API_ROLE_MAP: Record<ApiRole, DemoRole> = { superAdmin: 'Super Admin', admin: 'Owner', teacher: 'Teacher', student: 'Student', parent: 'Parent' };

/**
 * Holds the signed-in session: a real backend session (token + user) or a demo session (role only).
 * The name is kept so existing pages that read `role` keep working.
 */
@Injectable({ providedIn: 'root' })
export class MockAuthService {
  private session: StoredSession | null = this.readSession();

  constructor(private api: AuthApiService) {}

  get role(): DemoRole { return this.session?.role ?? 'Owner'; }
  get token(): string | null { return this.session?.token ?? null; }
  get user(): ApiUser | null { return this.session?.user ?? null; }
  get isAuthenticated(): boolean { return !!this.session; }
  get isDemo(): boolean { return !!this.session && !this.session.token; }

  get landingPath(): string {
    if (this.role === 'Super Admin') return '/super-admin/dashboard';
    if (this.role === 'Student' || this.role === 'Parent') return '/student/dashboard';
    return '/client/dashboard';
  }

  static roleFromApi(role: ApiRole | null): DemoRole { return role ? API_ROLE_MAP[role] ?? 'Student' : 'Student'; }

  /** Session from a successful /auth/login. */
  startSession(user: ApiUser, token: string, remember: boolean): void {
    this.save({ role: MockAuthService.roleFromApi(user.role), token, user }, remember);
  }

  /** Demo session: no backend account, any panel. */
  login(role: DemoRole, remember: boolean): void {
    this.save({ role, token: null, user: null }, remember);
  }

  /** Tells the backend to drop the token (best effort), then clears the local session. */
  logout(): void {
    const token = this.token;
    if (token) this.api.logout(token).subscribe({ error: () => { /* Token may already be expired; local sign-out still happens. */ } });
    this.session = null;
    this.clearStorage();
  }

  private save(session: StoredSession, remember: boolean): void {
    this.session = session;
    this.clearStorage();
    try { (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session)); }
    catch { /* In-memory session still works when browser storage is blocked. */ }
  }

  private readSession(): StoredSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) as StoredSession : null;
      return parsed && ROLES.includes(parsed.role) ? parsed : null;
    } catch { return null; }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('demo-role');
      sessionStorage.removeItem('demo-role');
    } catch { /* Storage is optional. */ }
  }
}
