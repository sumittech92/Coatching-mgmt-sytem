import { Injectable } from '@angular/core';
import { MOCK_TENANT_CONTEXT } from './mock-data/tenant-context';
import { BusinessType, TenantContext } from './models/business-type';
import { WorkspaceTerms, termsFor } from './workspace-terms';

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private context: TenantContext = this.readStoredContext();
  get current(): TenantContext { return this.context; }
  get isSchool(): boolean { return this.context.businessType === 'school'; }
  get terms(): WorkspaceTerms { return termsFor(this.context.businessType); }
  /** Name of the signed-in demo teacher; their attendance and classes are filtered by it. */
  get demoTeacherName(): string { return this.isSchool ? 'Mrs. Neha Iyer' : 'Priya Nair'; }
  setBusinessType(businessType: BusinessType, remember = false): void {
    this.context = { ...this.context, businessType };
    this.context.businessName = businessType === 'coaching' ? 'Northstar Academy' : businessType === 'school' ? 'Greenfield Public School' : 'Atelier & Co.';
    try {
      localStorage.removeItem('demo-workspace');
      sessionStorage.removeItem('demo-workspace');
      (remember ? localStorage : sessionStorage).setItem('demo-workspace', businessType);
    } catch { /* In-memory workspace selection is enough for the current demo session. */ }
  }

  private readStoredContext(): TenantContext {
    let businessType: string | null = null;
    try {
      businessType = localStorage.getItem('demo-workspace') || sessionStorage.getItem('demo-workspace');
    } catch { /* Fall back to the default demo workspace. */ }
    if (businessType !== 'coaching' && businessType !== 'school' && businessType !== 'clothing') {
      return { ...MOCK_TENANT_CONTEXT };
    }
    return {
      businessType,
      businessName: businessType === 'coaching' ? 'Northstar Academy' : businessType === 'school' ? 'Greenfield Public School' : 'Atelier & Co.'
    };
  }
}
