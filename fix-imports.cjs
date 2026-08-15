const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.vercel', 'coverage']);
const CODE_EXTS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']);
const RESOLVE_EXTS = ['.ts', '.tsx', '.json', '.js', '.jsx'];

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

const IMPORT_RE = /((?:import\s+[\s\S]*?from\s+|import\s+|export\s+[\s\S]*?from\s+|require\(\s*)['"])([^'"]+)(['"]\)?)/g;

function main() {
  const files = [...walk('src'), ...walk('api'), 'server.ts'];
  
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    const newContent = content.replace(IMPORT_RE, (match, prefix, importPath, suffix) => {
      if (!importPath.startsWith('./') && !importPath.startsWith('../')) return match;
      
      const baseDir = path.dirname(file);
      let targetPath = path.resolve(baseDir, importPath);
      
      // If it ends with .js, let's see what the actual file on disk is.
      if (importPath.endsWith('.js')) {
        const withoutExt = targetPath.slice(0, -3);
        let foundExt = null;
        for (const ext of RESOLVE_EXTS) {
          if (fs.existsSync(withoutExt + ext) && fs.statSync(withoutExt + ext).isFile()) {
            foundExt = ext;
            break;
          }
        }
        if (foundExt) {
          modified = true;
          return prefix + importPath.slice(0, -3) + foundExt + suffix;
        }
      }
      
      // If it has no extension or is broken, let's try to fix it.
      const extName = path.extname(targetPath);
      if (!CODE_EXTS.has(extName)) { // extensionless
         let foundExt = null;
         for (const ext of RESOLVE_EXTS) {
           if (fs.existsSync(targetPath + ext) && fs.statSync(targetPath + ext).isFile()) {
             foundExt = ext;
             break;
           }
         }
         if (foundExt) {
           modified = true;
           return prefix + importPath + foundExt + suffix;
         } else {
           // Maybe it's a directory (index.ts)
           for (const ext of RESOLVE_EXTS) {
             const indexPath = path.join(targetPath, 'index' + ext);
             if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
               modified = true;
               return prefix + importPath + '/index' + ext + suffix;
             }
           }
         }
      }

      return match;
    });
    
    if (modified) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`Fixed imports in ${file}`);
    }
  }
}
main();
