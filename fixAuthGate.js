const fs = require('fs');
let content = fs.readFileSync('src/components/auth/AuthGate.tsx', 'utf8');

content = content.replace(/const Layers = Orbit;/g, '');
content = content.replace(/<Layers className="w-12 h-12 text-amber-400" \/>/g, '<Orbit className="w-12 h-12 text-amber-400" />');
content = content.replace(/dispatch\(\{ type: 'SET_AUTHENTICATED', payload: true \}\);/g, '');

fs.writeFileSync('src/components/auth/AuthGate.tsx', content);
