const fs = require('fs');
const file = 'src/services/security.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  `  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {`,
  `  // Allow unauthenticated routes to bypass CSRF\n  const bypassPaths = ['/api/auth/login', '/api/auth/register'];\n  if (bypassPaths.includes(req.path)) {\n    return next();\n  }\n\n  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {`
);
fs.writeFileSync(file, code);
console.log('CSRF bypassed for login/register');
