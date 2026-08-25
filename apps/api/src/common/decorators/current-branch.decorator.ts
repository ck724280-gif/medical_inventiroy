import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentBranch = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const branchFromHeader = request.headers?.['x-branch-id'];
    const branchFromQuery = request.query?.branchId;
    const branchFromBody = request.body?.branchId;
    const branchFromUser = request.user?.branchId;

    const branch = branchFromHeader || branchFromQuery || branchFromBody || branchFromUser;
    return typeof branch === 'string' && branch.trim() ? branch.trim() : undefined;
  }
);
