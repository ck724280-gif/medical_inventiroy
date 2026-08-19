export const DrugSchedule = {
  OTC: 'OTC',
  SCHEDULE_H: 'SCHEDULE_H',
  SCHEDULE_H1: 'SCHEDULE_H1',
  SCHEDULE_X: 'SCHEDULE_X',
} as const;

export type DrugScheduleType = (typeof DrugSchedule)[keyof typeof DrugSchedule];

export const PurchaseOrderStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  FULLY_RECEIVED: 'FULLY_RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;

export type PurchaseOrderStatusType = (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];

export const UnitLevel = {
  BOX: 'BOX',
  STRIP: 'STRIP',
  TABLET: 'TABLET',
} as const;
