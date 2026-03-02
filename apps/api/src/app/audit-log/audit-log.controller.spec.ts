import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '@turbomonorepo/shared-data';

describe('AuditLogController', () => {
  let controller: AuditLogController;
  let mockAuditLogService: { getAuditLog: jest.Mock };

  beforeEach(async () => {
    mockAuditLogService = {
      getAuditLog: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [
        { provide: AuditLogService, useValue: mockAuditLogService },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditLogController>(AuditLogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── GET /audit-log ─────────────────────────────────────

  describe('getAuditLog', () => {
    it('should return the audit log content', () => {
      const logContent =
        '[2026-03-01T10:00:00.000Z] [AUDIT] User [u1] created Task [t1] in Org [o1]\n';
      mockAuditLogService.getAuditLog.mockReturnValue(logContent);

      const result = controller.getAuditLog();

      expect(result).toBe(logContent);
      expect(mockAuditLogService.getAuditLog).toHaveBeenCalledTimes(1);
    });

    it('should return empty string when no logs exist', () => {
      mockAuditLogService.getAuditLog.mockReturnValue('');

      const result = controller.getAuditLog();

      expect(result).toBe('');
    });
  });

  // ── RBAC metadata ──────────────────────────────────────

  describe('RBAC decorators', () => {
    it('should have @Roles(Owner, Admin) on getAuditLog', () => {
      const reflector = new Reflector();
      const roles = reflector.get<Role[]>('roles', AuditLogController.prototype.getAuditLog);

      expect(roles).toBeDefined();
      expect(roles).toContain(Role.Owner);
      expect(roles).toContain(Role.Admin);
      expect(roles).not.toContain(Role.Viewer);
    });
  });
});
