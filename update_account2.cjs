const fs = require('fs');
let code = fs.readFileSync('src/views/AccountView.tsx', 'utf8');

const target1 = `  // Submit Deriv API Token for login
  const handleTokenSubmit = async (e: React.FormEvent) => {`;

const replace1 = `  // Handle environment toggling
  const handleEnvToggle = async (targetEnv: 'demo' | 'real') => {
    // Determine the expected token key based on environment
    const tokenKey = targetEnv === 'demo' ? 'deriv_demo_token' : 'deriv_real_token';
    const savedToken = localStorage.getItem(tokenKey);
    
    // Update global state immediately for UI consistency
    dispatch({ type: 'SET_EXECUTION_ENVIRONMENT', payload: targetEnv === 'demo' ? 'DEMO' : 'LIVE' });

    if (savedToken) {
       // Silently switch using the stored token for this environment
       setApiTokenInput(savedToken);
       await performTokenLogin(savedToken);
    } else {
       // Ask user to provide token if we don't have it
       setMeta(null);
       setShowTokenInput(true);
       setApiTokenInput('');
       setMessage(\`Please provide your Deriv \${targetEnv.toUpperCase()} API token to switch environments.\`);
    }
  };

  const performTokenLogin = async (tokenStr: string) => {
    setIsSubmittingToken(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      const res = await apiFetch('/api/auth/deriv/token-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: tokenStr }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const accType = json.data.accountType || 'demo';
          // Save tokens for active WebSocket and persistence
          localStorage.setItem('deriv_oauth_token', tokenStr);
          localStorage.setItem('deriv_access_token', tokenStr);
          localStorage.setItem(accType === 'demo' ? 'deriv_demo_token' : 'deriv_real_token', tokenStr);
          
          setMeta(json.data);
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'ONLINE' });
          dispatch({ type: 'SET_EXECUTION_ENVIRONMENT', payload: accType === 'demo' ? 'DEMO' : 'LIVE' });
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              title: 'Environment Switched',
              message: \`Successfully connected to \${accType.toUpperCase()} account \${json.data.derivAccountId}\`,
              type: 'success',
            },
          });
          setApiTokenInput('');
          setShowTokenInput(false);
          setMessage(\`Integration connected successfully to \${accType.toUpperCase()} environment.\`);
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
  };

  // Submit Deriv API Token for login
  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiTokenInput.trim()) {
      setErrorMessage('Please provide a valid API Token.');
      return;
    }
    await performTokenLogin(apiTokenInput.trim());
  };`;

const t2_start = code.indexOf(`              </h3>`);
const t2_end = code.indexOf(`            {isLoading ? (`);
const target2 = code.substring(t2_start, t2_end);

const replace2 = `              </h3>
              
              {/* Environment Toggle Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-bg-secondary border border-border-color rounded-lg">
                <button
                  onClick={() => handleEnvToggle('demo')}
                  className={\`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded transition-all \${
                    (meta?.accountType === 'demo' || state.executionEnvironment === 'DEMO') 
                      ? 'bg-accent-primary text-white shadow-sm' 
                      : 'text-text-secondary hover:text-text-primary'
                  }\`}
                >
                  Demo
                </button>
                <button
                  onClick={() => handleEnvToggle('real')}
                  className={\`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded transition-all \${
                    (meta?.accountType === 'real' || state.executionEnvironment === 'LIVE')
                      ? 'bg-danger text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }\`}
                >
                  Real
                </button>
              </div>
            </div>
`;

if (code.includes(target1) && t2_start !== -1) {
  code = code.replace(target1, replace1);
  code = code.replace(target2, replace2);
  fs.writeFileSync('src/views/AccountView.tsx', code);
  console.log("Successfully updated AccountView.tsx");
} else {
  console.log("Failed to find targets");
}
