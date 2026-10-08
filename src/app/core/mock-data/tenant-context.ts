import { TenantContext } from '../models/business-type';

/** Static tenant preview used by the UI until a real tenant selector is connected. */
export const MOCK_TENANT_CONTEXT: TenantContext = {
  businessType: 'coaching',
  businessName: 'Northstar Academy'
};
