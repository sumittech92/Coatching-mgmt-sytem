import { Injectable } from '@angular/core';
import { MOCK_TENANT_CONTEXT } from './mock-data/tenant-context';
import { BusinessType, TenantContext } from './models/business-type';

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private context: TenantContext = { ...MOCK_TENANT_CONTEXT };
  get current(): TenantContext { return this.context; }
  setBusinessType(businessType: BusinessType): void {
    this.context = { ...this.context, businessType };
    this.context.businessName = businessType === 'coaching' ? 'Northstar Academy' : 'Atelier & Co.';
  }
}
