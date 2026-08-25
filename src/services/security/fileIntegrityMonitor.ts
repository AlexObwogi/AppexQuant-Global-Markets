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
  private inMemoryBaseline: FIMManifest | null = null;

  constructor(manifestPath?: string) {
    // In serverless / Vercel environments or read-only containers, use /tmp or memory
    const defaultPath = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
      ? path.join('/tmp', '.fim-manifest.json')
      : path.join(process.cwd(), '.fim-manifest.json');
    this.baselineManifestPath = manifestPath || defaultPath;
  }

  /**
   * Computes SHA-256 hash of a single file if it exists
   */
  public computeFileHash(filePath: string): string | null {
    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    try {
      const fileBuffer = fs.readFileSync(fullPath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch {
      return null;
    }
  }

  /**
   * Generates a cryptographic baseline manifest of all protected files that exist
   */
  public generateBaseline(): FIMManifest {
    const filesRecord: Record<string, string> = {};
    for (const relPath of PROTECTED_CORE_FILES) {
      const hash = this.computeFileHash(relPath);
      if (hash) {
        filesRecord[relPath] = hash;
      }
    }

    const manifest: FIMManifest = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      files: filesRecord,
    };

    this.inMemoryBaseline = manifest;

    try {
      fs.writeFileSync(this.baselineManifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    } catch {
      // Graceful fallback for read-only environments
    }

    return manifest;
  }

  /**
   * Verifies current file states against baseline manifest
   */
  public verifyIntegrity(): { isValid: boolean; modifiedFiles: string[] } {
    let baseline = this.inMemoryBaseline;

    if (!baseline) {
      if (fs.existsSync(this.baselineManifestPath)) {
        try {
          const manifestContent = fs.readFileSync(this.baselineManifestPath, 'utf-8');
          baseline = JSON.parse(manifestContent);
          this.inMemoryBaseline = baseline;
        } catch {}
      }
    }

    if (!baseline) {
      baseline = this.generateBaseline();
      return { isValid: true, modifiedFiles: [] };
    }

    const modifiedFiles: string[] = [];

    for (const [relPath, expectedHash] of Object.entries(baseline.files)) {
      const currentHash = this.computeFileHash(relPath);
      if (currentHash && currentHash !== expectedHash) {
        modifiedFiles.push(relPath);
        if (process.env.NODE_ENV === 'production') {
          logger.error(`CRITICAL SECURITY ALERT: File integrity checksum mismatch detected for ${relPath}! Expected ${expectedHash}, got ${currentHash}.`);
        }
      }
    }

    if (modifiedFiles.length > 0) {
      if (process.env.NODE_ENV === 'production') {
        logger.error('FIM CHECK FAILED: Unauthorized file modification detected in core backend scripts!', { modifiedFiles });
        return { isValid: false, modifiedFiles };
      } else {
        this.generateBaseline();
        return { isValid: true, modifiedFiles: [] };
      }
    }

    return { isValid: true, modifiedFiles: [] };
  }
}

export const fimMonitor = new FileIntegrityMonitor();
