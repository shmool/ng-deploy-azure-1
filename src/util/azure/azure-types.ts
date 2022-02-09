export type TenantCategory = 'Home' | 'ProjectedBy' | 'ManagedBy';

export interface TenantIdDescription {
  readonly country?: string;
  readonly countryCode?: string;
  readonly defaultDomain?: string;
  readonly displayName?: string;
  readonly domains?: string[];
  readonly id?: string;
  readonly tenantBrandingLogoUrl?: string;
  readonly tenantCategory?: TenantCategory;
  readonly tenantId?: string;
  readonly tenantType?: string;
}

export interface TenantListResult {
  value: TenantIdDescription[];
}

export interface Subscription {
  authorizationSource?: string;
  readonly displayName?: string;
  readonly id?: string;
  managedByTenants?: ManagedByTenant[];
  readonly state?: SubscriptionState;
  readonly subscriptionId?: string;
  subscriptionPolicies?: SubscriptionPolicies;
  tags?: {
    [propertyName: string]: string;
  };
  readonly tenantId?: string;
}

export interface ManagedByTenant {
  readonly tenantId?: string;
}

export type SubscriptionState = 'Enabled' | 'Warned' | 'PastDue' | 'Disabled' | 'Deleted';

export interface SubscriptionPolicies {
  readonly locationPlacementId?: string;
  readonly quotaId?: string;
  readonly spendingLimit?: SpendingLimit;
}

export type SpendingLimit = 'On' | 'Off' | 'CurrentPeriodOff';

export interface SubscriptionListResult {
  nextLink?: string;
  value: Subscription[];
}
