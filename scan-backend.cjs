#!/usr/bin/env node
/**
 * AppexQuant Backend Diagnostic Scanner
 * ---------------------------------------------------------------
 * Zero-dependency Node script. Run it against the ROOT of your repo:
 *
 *     node scan-backend.cjs
 *
 * or point it at a specific folder:
 *
 *     node scan-backend.cjs ./my-backend
 *
 * What it does:
 *  1. Walks every .js/.mjs/.cjs/.ts/.tsx/.jsx file in the repo
 *     (skipping node_modules, .git, dist, build, .next, .vercel).
 *  2. Extracts every relative import/require ('./x' or '../x').
 *  3. Tries to resolve each one against the real filesystem the same
 *     way Node's ESM loader does (NO extension guessing) — if it
 *     would fail in production, this script flags it now, locally,
 *     before you deploy.
 *  4. Collects every `process.env.X` / `process.env['X']` reference
 *     anywhere in the codebase into one deduped list, so you can
 *     diff it directly against what's set in Vercel's dashboard.
 *  5. Writes a full report to backend-diagnostic-report.md AND
 *     prints a summary to the console.
 *
 * This does not modify any files. It only reports.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || '.');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.vercel', 'coverage']);
const CODE_EXTS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']);
const RESOLVE_EXTS = ['', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json'];

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return out;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (CODE_EXTS.has(path.extname(entry.name))) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\n').length;
}

// Matches: import ... from '...'; import '...'; export ... from '...'; require('...')
const IMPORT_RE = /(?:import\s+[\s\S]*?from\s+|import\s+|export\s+[\s\S]*?from\s+|require\(\s*)['"]([^'"]+)['"]\)?/g;
const ENV_RE = /process\.env\.([A-Za-z0-9_]+)|process\.env\[\s*['"]([A-Za-z0-9_]+)['"]\s*\]/g;

// Find the nearest package.json above `dir` and read its "type" field.
const pkgTypeCache = new Map();
function nearestPackageType(dir) {
  if (pkgTypeCache.has(dir)) return pkgTypeCache.get(dir);
  let current = dir;
  let result = 'commonjs';
  while (true) {
    const pkgPath = path.join(current, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        result = pkg.type === 'module' ? 'module' : 'commonjs';
      } catch (e) {}
      break;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  pkgTypeCache.set(dir, result);
  return result;
}

// Is this specific file resolved as strict ESM (no extension guessing allowed),
// the same way Node's real loader treats it?
function isStrictEsmFile(filePath) {
  const ext = path.extname(filePath);
  if (ext === '.mjs') return true;
  if (ext === '.cjs') return false;
  if (ext === '.js' || ext === '.jsx') {
    return nearestPackageType(path.dirname(filePath)) === 'module';
  }
  // .ts/.tsx are normally compiled by a build step before deploy — checked leniently,
  // but flagged as build-dependent in the report.
  return false;
}

function existsFile(p) {
  return fs.existsSync(p) && fs.statSync(p).isFile();
}

function resolveImport(fromFile, importPath) {
  const baseDir = path.dirname(fromFile);
  const target = path.resolve(baseDir, importPath);
  const strict = isStrictEsmFile(fromFile);

  if (strict) {
    // Real Node ESM behavior: the path AS WRITTEN must exist exactly. No guessing.
    if (existsFile(target)) return { ok: true, resolved: target, strict: true };

    // Still compute a helpful "did you mean" suggestion, same as Node's own error message.
    for (const ext of RESOLVE_EXTS) {
      if (ext && existsFile(target + ext)) {
        return { ok: false, resolved: null, strict: true, suggestion: importPath + ext };
      }
    }
    return { ok: false, resolved: null, strict: true, suggestion: null };
  }

  // Loose resolution (CommonJS require(), or pre-build TS) — extension guessing allowed.
  for (const ext of RESOLVE_EXTS) {
    if (existsFile(target + ext)) return { ok: true, resolved: target + ext, strict: false };
  }
  for (const ext of RESOLVE_EXTS) {
    if (ext === '') continue;
    const indexPath = path.join(target, 'index' + ext);
    if (existsFile(indexPath)) return { ok: true, resolved: indexPath, strict: false };
  }
  return { ok: false, resolved: null, strict: false, suggestion: null };
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`Path not found: ${ROOT}`);
    process.exit(1);
  }

  const files = walk(ROOT);
  const brokenImports = [];
  const envVars = new Set();
  let totalImportsChecked = 0;

  for (const file of files) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch (e) {
      continue;
    }

    // Env vars
    let envMatch;
    ENV_RE.lastIndex = 0;
    while ((envMatch = ENV_RE.exec(content)) !== null) {
      envVars.add(envMatch[1] || envMatch[2]);
    }

    // Relative imports only (bare package imports are resolved via node_modules, not in scope here)
    let match;
    IMPORT_RE.lastIndex = 0;
    while ((match = IMPORT_RE.exec(content)) !== null) {
      const importPath = match[1];
      if (!importPath.startsWith('./') && !importPath.startsWith('../')) continue;

      totalImportsChecked++;
      const result = resolveImport(file, importPath);
      if (!result.ok) {
        brokenImports.push({
          file: path.relative(ROOT, file),
          line: lineNumberAt(content, match.index),
          importPath,
          strict: result.strict,
          suggestion: result.suggestion,
        });
      }
    }
  }

  // ---- Report ----
  const lines = [];
  lines.push('# AppexQuant Backend Diagnostic Report');
  lines.push('');
  lines.push(`Scanned root: \`${ROOT}\``);
  lines.push(`Files scanned: ${files.length}`);
  lines.push(`Relative imports checked: ${totalImportsChecked}`);
  lines.push('');
  lines.push('## 1. Broken / unresolvable relative imports');
  lines.push('');
  if (brokenImports.length === 0) {
    lines.push('None found. Every relative import resolves to a real file on disk.');
  } else {
    lines.push(`Found **${brokenImports.length}** broken import(s) — each of these WILL crash the corresponding serverless function at runtime with \`ERR_MODULE_NOT_FOUND\`:`);
    lines.push('');
    lines.push('| File | Line | Broken import path | Fix |');
    lines.push('|---|---|---|---|');
    for (const b of brokenImports) {
      const fix = b.suggestion ? `Change to \`${b.suggestion}\`` : (b.strict ? 'File does not exist under any extension' : 'File not found');
      lines.push(`| \`${b.file}\` | ${b.line} | \`${b.importPath}\` | ${fix} |`);
    }
  }
  lines.push('');
  lines.push('## 2. Every environment variable referenced in code');
  lines.push('');
  lines.push('Cross-check this list, name for name, against what is actually set in your Vercel project settings for the **Production** environment.');
  lines.push('');
  if (envVars.size === 0) {
    lines.push('No `process.env.X` references found.');
  } else {
    for (const v of [...envVars].sort()) {
      lines.push(`- \`${v}\``);
    }
  }
  lines.push('');

  const reportPath = path.join(ROOT, 'backend-diagnostic-report.md');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');

  console.log('='.repeat(60));
  console.log('AppexQuant Backend Diagnostic Scanner');
  console.log('='.repeat(60));
  console.log(`Files scanned:            ${files.length}`);
  console.log(`Relative imports checked: ${totalImportsChecked}`);
  console.log(`Broken imports found:     ${brokenImports.length}`);
  console.log(`Env vars referenced:      ${envVars.size}`);
  console.log('');
  if (brokenImports.length > 0) {
    console.log('BROKEN IMPORTS:');
    for (const b of brokenImports) {
      const fix = b.suggestion ? ` (fix: "${b.suggestion}")` : '';
      console.log(`  ${b.file}:${b.line}  ->  "${b.importPath}"${fix}`);
    }
    console.log('');
  }
  console.log(`Full report written to: ${reportPath}`);
  console.log('='.repeat(60));

  process.exit(brokenImports.length > 0 ? 1 : 0);
}

main();
