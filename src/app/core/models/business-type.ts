export type BusinessType = 'coaching' | 'school' | 'clothing';

export interface TenantContext {
  businessType: BusinessType;
  businessName: string;
}
