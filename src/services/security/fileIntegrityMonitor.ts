/**
 * AppexQuant Markets Global - Cryptographic File Integrity Monitor (FIM)
 * Computes and verifies SHA-256 cryptographic checksums of core backend scripts
 * and build artifacts to detect unauthorized modifications during deployment and runtime.
 */

import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { logger } from '../../observability/logger.ts';

export interface FIMManifest {
  version: string;
  timestamp: string;
  files: Record<string, string>; // filePath -> sha256 hex hash
}

// Core protected files critical to backend execution & security
const CANDIDATE_PROTECTED_FILES = [
  'dist/server.cjs',
  'server.ts',
  'src/services/security.ts',
  'src/db/connection.ts',
  'src/services/deriv/pkce.ts',
  'src/services/deriv/oauthServerService.ts',
];

export class FileIntegrityMonitor {
  private baselineManifestPath: string;
  private inMemoryBaseline: FIMManifest | null = null;

  constructor(manifestPath?: string) {
    // In serverless / Vercel environments (/var/task) or read-only containers, use os.tmpdir() to avoid EROFS errors
    const defaultPath = path.join(os.tmpdir(), '.fim-manifest.json');
    this.baselineManifestPath = manifestPath || defaultPath;
  }

  /**
   * Returns list of protected core files that actually exist on disk in the current environment
   */
  private getExistingProtectedFiles(): string[] {
    return CANDIDATE_PROTECTED_FILES.filter((relPath) => {
      const fullPath = path.resolve(process.cwd(), relPath);
      return fs.existsSync(fullPath);
    });
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
    const existingFiles = this.getExistingProtectedFiles();

    for (const relPath of existingFiles) {
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
      // Graceful handling for read-only environments (/var/task or serverless containers)
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
      const fullPath = path.resolve(process.cwd(), relPath);
      if (!fs.existsSync(fullPath)) {
        // Skip files that do not exist (e.g. source files in a compiled deployment bundle)
        continue;
      }
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
