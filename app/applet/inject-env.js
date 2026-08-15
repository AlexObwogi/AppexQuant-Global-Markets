// inject-env.js
import fs from 'fs';
import path from 'path';

// Define the mapping from shortform keys to fallback keys to ensure full compatibility
const envMapping = {
  CLIENT_ID: ['CLIENT_ID', 'DERIV_CLIENT_ID'],
  REDIRECT_URI: ['REDIRECT_URI', 'DERIV_OAUTH_REDIRECT_URI'],
  SESSION_SECRET: ['SESSION_SECRET'],
  OAUTH_SIM: ['OAUTH_SIM', 'ENABLE_OAUTH_SIMULATION'],
  DATABASE_URL: ['DATABASE_URL'],
  SUPABASE_URL: ['SUPABASE_URL'],
  SUPABASE_KEY: ['SUPABASE_KEY', 'SUPABASE_ANON_KEY']
};

export function injectEnvironment() {
  const injected = {};

  for (const [targetKey, aliases] of Object.entries(envMapping)) {
    let foundValue = null;
    
    // Find the first available value from any of the alias names
    for (const alias of aliases) {
      if (process.env[alias]) {
        foundValue = process.env[alias];
        break;
      }
    }

    if (foundValue) {
      // Inject standard shortform name across process.env
      process.env[targetKey] = foundValue;
      
      // Also inject the long-form aliases backwards to ensure full compatibility with the rest of the codebase
      aliases.forEach(alias => {
        if (!process.env[alias]) {
          process.env[alias] = foundValue;
        }
      });

      injected[targetKey] = 'Loaded successfully';
    } else {
      console.warn(`⚠️ Warning: Missing environment variable mapping for ${targetKey}`);
    }
  }

  console.log('✅ Environment injection complete:', injected);
}

// Auto-run if executed directly via node
if (process.argv[1] === import.meta.filename) {
  injectEnvironment();
}
