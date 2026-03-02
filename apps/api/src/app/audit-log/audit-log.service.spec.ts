import { Test, TestingModule } from '@nestjs/testing';
import * as nodeFs from 'node:fs';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let existsSpy: jest.SpyInstance;
  let readSpy: jest.SpyInstance;

  beforeEach(async () => {
    existsSpy = jest.spyOn(nodeFs, 'existsSync');
    readSpy = jest.spyOn(nodeFs, 'readFileSync');

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogService],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => {
    existsSpy.mockRestore();
    readSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty string when audit.log does not exist', () => {
    existsSpy.mockReturnValue(false);

    const result = service.getAuditLog();

    expect(result).toBe('');
    expect(readSpy).not.toHaveBeenCalled();
  });

  it('should return the file contents when audit.log exists', () => {
    const logContent =
      '[2026-02-28T10:00:00.000Z] [AUDIT] User [u1] created Task [t1] in Org [o1]\n' +
      '[2026-02-28T10:01:00.000Z] [AUDIT] User [u1] updated Task [t1] in Org [o1]\n';

    existsSpy.mockReturnValue(true);
    readSpy.mockReturnValue(logContent);

    const result = service.getAuditLog();

    expect(result).toBe(logContent);
    expect(readSpy).toHaveBeenCalledWith(
      expect.stringContaining('audit.log'),
      'utf-8',
    );
  });

  it('should read from the correct audit.log path', () => {
    existsSpy.mockReturnValue(true);
    readSpy.mockReturnValue('');

    service.getAuditLog();

    const calledPath = existsSpy.mock.calls[0][0] as string;
    expect(calledPath).toMatch(/audit\.log$/);
  });
});
