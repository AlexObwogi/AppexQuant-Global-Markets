const fs = require('fs');
let code = fs.readFileSync('src/views/AccountView.tsx', 'utf8');

const t = `          setMessage(\`Integration connected successfully to \${accType.toUpperCase()} environment.\`);
        } else {`;

const r = `          setMessage(\`Integration connected successfully to \${accType.toUpperCase()} environment.\`);
          // Hard reload to guarantee WebSocket and API instances use the newly activated token
          setTimeout(() => window.location.reload(), 1500);
        } else {`;

if (code.includes(t)) {
  code = code.replace(t, r);
  fs.writeFileSync('src/views/AccountView.tsx', code);
  console.log("updated");
}
