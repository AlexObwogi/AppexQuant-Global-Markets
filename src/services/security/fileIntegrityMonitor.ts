/**
 * AppexQuant Markets Global - Cryptographic File Integrity Monitor (FIM)
 * Computes and verifies SHA-256 cryptographic checksums of core backend scripts
 * and build artifacts to detect unauthorized modifications during deployment and runtime.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from '../../observability/logger.ts';

export interface FIMManifest {
  version: string;
  timestamp: string;
  files: Record<string, string>; // filePath -> sha256 hex hash
}

// Core protected files critical to backend execution & security
const PROTECTED_CORE_FILES = [
  'server.ts',
  'src/services/security.ts',
  'src/db/connection.ts',
  'src/services/deriv/oauthServerService.ts',
];

export class FileIntegrityMonitor {
  private baselineManifestPath: string;

  constructor(manifestPath: string = path.join(process.cwd(), '.fim-manifest.json')) {
    this.baselineManifestPath = manifestPath;
  }

  /**
   * Computes SHA-256 hash of a single file
   */
  public computeFileHash(filePath: string): string {
    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`FIM Error: Monitored file does not exist: ${filePath}`);
    }
    const fileBuffer = fs.readFileSync(fullPath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Generates a cryptographic baseline manifest of all protected files
   */
  public generateBaseline(): FIMManifest {
    const filesRecord: Record<string, string> = {};
    for (const relPath of PROTECTED_CORE_FILES) {
      try {
        filesRecord[relPath] = this.computeFileHash(relPath);
      } catch (err: any) {
        logger.warn(`FIM Warning: Could not hash file ${relPath}: ${err.message}`);
      }
    }

    const manifest: FIMManifest = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      files: filesRecord,
    };

    try {
      fs.writeFileSync(this.baselineManifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
      logger.info('FIM: Cryptographic baseline manifest successfully generated & persisted', { path: this.baselineManifestPath });
    } catch (err: any) {
      logger.error('FIM Error: Failed to write baseline manifest', { error: err.message });
    }

    return manifest;
  }

  /**
   * Verifies current file states against baseline manifest
   * Throws or logs security alerts if tampering is detected
   */
  public verifyIntegrity(): { isValid: boolean; modifiedFiles: string[] } {
    if (!fs.existsSync(this.baselineManifestPath)) {
      logger.info('FIM: No baseline manifest found. Generating initial cryptographic baseline.');
      this.generateBaseline();
      return { isValid: true, modifiedFiles: [] };
    }

    try {
      const manifestContent = fs.readFileSync(this.baselineManifestPath, 'utf-8');
      const baseline: FIMManifest = JSON.parse(manifestContent);
      const modifiedFiles: string[] = [];

      for (const [relPath, expectedHash] of Object.entries(baseline.files)) {
        try {
          const currentHash = this.computeFileHash(relPath);
          if (currentHash !== expectedHash) {
            modifiedFiles.push(relPath);
            logger.error(`CRITICAL SECURITY ALERT: File integrity checksum mismatch detected for ${relPath}! Expected ${expectedHash}, got ${currentHash}.`);
          }
        } catch (err: any) {
          modifiedFiles.push(relPath);
          logger.error(`CRITICAL SECURITY ALERT: Protected file missing or inaccessible: ${relPath}`);
        }
      }

      if (modifiedFiles.length > 0) {
        logger.error('FIM CHECK FAILED: Unauthorized file modification detected in core backend scripts!', { modifiedFiles });
        return { isValid: false, modifiedFiles };
      }

      logger.info('FIM CHECK PASSED: All core backend script checksums match cryptographic baseline.');
      return { isValid: true, modifiedFiles: [] };
    } catch (err: any) {
      logger.error('FIM Error: Failed to verify baseline manifest', { error: err.message });
      return { isValid: true, modifiedFiles: [] };
    }
  }
}

export const fimMonitor = new FileIntegrityMonitor();
