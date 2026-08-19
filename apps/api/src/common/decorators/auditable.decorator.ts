import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';
export const AUDIT_ENTITY_KEY = 'auditEntity';

export const Auditable = (action: string, entity: string) => {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    SetMetadata(AUDIT_ACTION_KEY, action)(target, key, descriptor);
    SetMetadata(AUDIT_ENTITY_KEY, entity)(target, key, descriptor);
  };
};
