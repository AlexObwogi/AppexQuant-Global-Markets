const fs = require('fs');
let code = fs.readFileSync('src/views/AccountView.tsx', 'utf8');

const targetStr = `  // Submit Deriv API Token for login
  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiTokenInput.trim()) {
      setErrorMessage('Please provide a valid API Token.');
      return;
    }
    await performTokenLogin(apiTokenInput.trim());
  };    e.preventDefault();
    if (!apiTokenInput.trim()) {
      setErrorMessage('Please provide a valid API Token.');
      return;
    }
    setIsSubmittingToken(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      const res = await apiFetch('/api/auth/deriv/token-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: apiTokenInput.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setMeta(json.data);
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'ONLINE' });
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              title: 'Account Integration Configured',
              message: \`Successfully connected to Deriv account \${json.data.derivAccountId}\`,
              type: 'success',
            },
          });
          setApiTokenInput('');
          setShowTokenInput(false);
          setMessage('Integration connected successfully to DEMO environment.');
          // Hard reload to guarantee WebSocket and API instances use the newly activated token
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setErrorMessage(json.error?.message || 'Token authentication failed.');
        }
      } else {
        setErrorMessage('Failed to validate connection with selected token.');
      }
    } catch {
      setErrorMessage('Failed to integrate with API token.');
    } finally {
      setIsSubmittingToken(false);
    }
  };`;

const replacement = `  // Submit Deriv API Token for login
  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiTokenInput.trim()) {
      setErrorMessage('Please provide a valid API Token.');
      return;
    }
    await performTokenLogin(apiTokenInput.trim());
  };`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/views/AccountView.tsx', code);
  console.log("Fixed syntax");
} else {
  console.log("Could not find the duplicate code");
}
