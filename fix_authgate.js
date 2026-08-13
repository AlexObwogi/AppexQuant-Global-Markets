const fs = require('fs');
let code = fs.readFileSync('src/components/auth/AuthGate.tsx', 'utf8');
code = code.replace(/dispatch\(\{ type: 'SET_AUTHENTICATED', payload: true \}\);/g, '');
fs.writeFileSync('src/components/auth/AuthGate.tsx', code);
