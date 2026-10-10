export type BusinessType = 'coaching' | 'college' | 'clothing';

export interface TenantContext {
  businessType: BusinessType;
  businessName: string;
}
