import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '@turbomonorepo/shared-auth';
import { Role } from '@turbomonorepo/shared-data';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(Role.Owner, Role.Admin)
  getAuditLog(): string {
    return this.auditLogService.getAuditLog();
  }
}
