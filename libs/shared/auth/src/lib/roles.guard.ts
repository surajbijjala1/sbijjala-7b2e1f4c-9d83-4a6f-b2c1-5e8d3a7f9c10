import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@turbomonorepo/shared-data';
import { ROLES_KEY } from './roles.decorator.js';

/**
 * Role hierarchy: Owner > Admin > Viewer.
 * A higher-ranked role inherits access to all lower-ranked routes.
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.Owner]: 3,
  [Role.Admin]: 2,
  [Role.Viewer]: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no @Roles() decorator is present, allow access (auth is still enforced by JwtAuthGuard)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      return false;
    }

    const userRank = ROLE_HIERARCHY[user.role as Role] ?? 0;

    // User passes if their rank is >= the minimum required rank
    const minRequiredRank = Math.min(
      ...requiredRoles.map((r) => ROLE_HIERARCHY[r] ?? Infinity),
    );

    return userRank >= minRequiredRank;
  }
}
