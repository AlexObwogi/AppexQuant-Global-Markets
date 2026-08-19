const fs = require('fs');
let code = fs.readFileSync('src/components/auth/AuthGate.tsx', 'utf8');

const target1 = `      localStorage.setItem('deriv_access_token', token);
      localStorage.setItem('deriv_account_id', accountId);`;
const replace1 = `      localStorage.setItem('deriv_access_token', token);
      localStorage.setItem('deriv_account_id', accountId);
      // Ensure we cache this token based on its environment format
      if (accountId.startsWith('VR')) {
        localStorage.setItem('deriv_demo_token', token);
      } else {
        localStorage.setItem('deriv_real_token', token);
      }`;

if (code.includes(target1)) {
  code = code.replace(target1, replace1);
  fs.writeFileSync('src/components/auth/AuthGate.tsx', code);
  console.log("updated AuthGate 1");
}

const target2 = `            await setEncryptedCookie('deriv_oauth_token', result.token);
            await setEncryptedCookie('deriv_account_id', result.accountId);`;
const replace2 = `            await setEncryptedCookie('deriv_oauth_token', result.token);
            await setEncryptedCookie('deriv_account_id', result.accountId);
            if (result.accountId.startsWith('VR')) {
              localStorage.setItem('deriv_demo_token', result.token);
            } else {
              localStorage.setItem('deriv_real_token', result.token);
            }`;

if (code.includes(target2)) {
  code = code.replace(target2, replace2);
  fs.writeFileSync('src/components/auth/AuthGate.tsx', code);
  console.log("updated AuthGate 2");
}
