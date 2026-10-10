import { Injectable } from '@angular/core';
import { MOCK_TENANT_CONTEXT } from './mock-data/tenant-context';
import { BusinessType, TenantContext } from './models/business-type';

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private context: TenantContext = this.readStoredContext();
  get current(): TenantContext { return this.context; }
  setBusinessType(businessType: BusinessType, remember = false): void {
    this.context = { ...this.context, businessType };
    this.context.businessName = businessType === 'coaching' ? 'Northstar Academy' : businessType === 'college' ? 'Greenfield College' : 'Atelier & Co.';
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
    if (businessType !== 'coaching' && businessType !== 'college' && businessType !== 'clothing') {
      return { ...MOCK_TENANT_CONTEXT };
    }
    return {
      businessType,
      businessName: businessType === 'coaching' ? 'Northstar Academy' : businessType === 'college' ? 'Greenfield College' : 'Atelier & Co.'
    };
  }
}
