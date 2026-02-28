import { SetMetadata } from '@nestjs/common';
import { Role } from '@turbomonorepo/shared-data';

export const ROLES_KEY = 'roles';

/**
 * Decorator to set the minimum required roles for a route handler.
 * Usage: @Roles(Role.Admin, Role.Owner)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
