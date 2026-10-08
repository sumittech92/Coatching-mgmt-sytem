export type BusinessType = 'coaching' | 'clothing';

export interface TenantContext {
  businessType: BusinessType;
  businessName: string;
}
