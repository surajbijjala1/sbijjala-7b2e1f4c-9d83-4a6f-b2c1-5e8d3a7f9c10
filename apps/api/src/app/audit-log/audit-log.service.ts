import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import { resolve } from 'node:path';

const AUDIT_LOG_PATH = resolve(process.cwd(), 'audit.log');

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  /**
   * Read and return the full contents of the audit.log file.
   * Returns an empty string if the file doesn't exist yet.
   */
  getAuditLog(): string {
    if (!fs.existsSync(AUDIT_LOG_PATH)) {
      this.logger.warn('audit.log not found – returning empty log');
      return '';
    }
    return fs.readFileSync(AUDIT_LOG_PATH, 'utf-8');
  }
}
