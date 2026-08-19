const fs = require('fs');
let code = fs.readFileSync('src/components/auth/AuthGate.tsx', 'utf8');

const targetStr = `      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'ONLINE' });
      dispatch({`;

const replacement = `      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'ONLINE' });
      dispatch({ type: 'SET_EXECUTION_ENVIRONMENT', payload: isDemo ? 'DEMO' : 'LIVE' });
      dispatch({`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/components/auth/AuthGate.tsx', code);
  console.log("Fixed establishUserSession");
} else {
  console.log("Could not find the target string");
}
