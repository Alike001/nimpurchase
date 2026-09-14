export const SUPPORT_STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED'] as const
export type SupportStatus = (typeof SUPPORT_STATUSES)[number]
