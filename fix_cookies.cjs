const fs = require('fs');
let code = fs.readFileSync('src/views/AccountView.tsx', 'utf8');

const targetStr = `          // Save tokens for active WebSocket and persistence
          localStorage.setItem('deriv_oauth_token', tokenStr);
          localStorage.setItem('deriv_access_token', tokenStr);
          localStorage.setItem(accType === 'demo' ? 'deriv_demo_token' : 'deriv_real_token', tokenStr);`;

const replacement = `          // Save tokens for active WebSocket and persistence
          localStorage.setItem('deriv_oauth_token', tokenStr);
          localStorage.setItem('deriv_access_token', tokenStr);
          localStorage.setItem(accType === 'demo' ? 'deriv_demo_token' : 'deriv_real_token', tokenStr);
          await setEncryptedCookie('deriv_oauth_token', tokenStr);
          await setEncryptedCookie('deriv_account_id', json.data.derivAccountId || 'unknown');`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/views/AccountView.tsx', code);
  console.log("Fixed performTokenLogin cookies");
} else {
  console.log("Could not find the target string");
}
