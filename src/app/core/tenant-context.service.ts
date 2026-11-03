import { Injectable } from '@angular/core';
import { MOCK_TENANT_CONTEXT } from './mock-data/tenant-context';
import { BusinessType, TenantContext } from './models/business-type';
import { WorkspaceTerms, termsFor } from './workspace-terms';
import { MockAuthService } from './mock-auth.service';

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private context: TenantContext = this.readStoredContext();
  constructor(private auth: MockAuthService) {}
  /** A real account belongs to the work type it was created for, so it always opens that workspace. Demo sessions can switch freely. */
  get lockedType(): BusinessType | null { return this.auth.user?.workType ?? null; }
  get isLocked(): boolean { return !!this.lockedType; }
  get current(): TenantContext {
    const locked = this.lockedType;
    if (locked && this.context.businessType !== locked) this.context = TenantContextService.contextFor(locked);
    return this.context;
  }
  get isSchool(): boolean { return this.current.businessType === 'school'; }
  get terms(): WorkspaceTerms { return termsFor(this.current.businessType); }
  /** Name of the signed-in demo teacher; their attendance and classes are filtered by it. */
  get demoTeacherName(): string { return this.isSchool ? 'Mrs. Neha Iyer' : 'Priya Nair'; }
  setBusinessType(businessType: BusinessType, remember = false): void {
    this.context = TenantContextService.contextFor(this.lockedType ?? businessType);
    try {
      localStorage.removeItem('demo-workspace');
      sessionStorage.removeItem('demo-workspace');
      (remember ? localStorage : sessionStorage).setItem('demo-workspace', this.context.businessType);
    } catch { /* In-memory workspace selection is enough for the current demo session. */ }
  }

  private static contextFor(businessType: BusinessType): TenantContext {
    return { businessType, businessName: businessType === 'coaching' ? 'Northstar Academy' : businessType === 'school' ? 'Greenfield Public School' : 'Atelier & Co.' };
  }

  private readStoredContext(): TenantContext {
    let businessType: string | null = null;
    try {
      businessType = localStorage.getItem('demo-workspace') || sessionStorage.getItem('demo-workspace');
    } catch { /* Fall back to the default demo workspace. */ }
    if (businessType !== 'coaching' && businessType !== 'school' && businessType !== 'clothing') {
      return { ...MOCK_TENANT_CONTEXT };
    }
    return TenantContextService.contextFor(businessType);
  }
}
