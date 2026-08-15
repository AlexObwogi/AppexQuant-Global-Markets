

const schema = {
  // Core Security & Sessions
  SESSION_SECRET: { required: true, minLength: 16, description: 'Cryptographic secret for secure session tokens' },

  // Deriv OAuth & App Configuration
  CLIENT_ID: { required: true, description: 'Deriv Application / Client ID' },
  REDIRECT_URI: { required: true, isUrl: true, description: 'Deriv OAuth Callback URI' },

  // Database & Infrastructure
  APP_ENV: { required: false, allowed: ['development', 'production', 'test'], description: 'Runtime Environment' },
  DATABASE_URL: { required: false, description: 'PostgreSQL Database Connection String' },
  
  // Supabase Persistence
  SUPABASE_URL: { required: false, isUrl: true, description: 'Supabase Project URL' },
  SUPABASE_SERVICE_ROLE_KEY: { required: false, description: 'Supabase Service Role Key' },

  // Third-party Integrations
  OAUTH_SIM: { required: false, allowed: ['true', 'false'], description: 'Developer toggle for offline OAuth' },
};

console.log('=========================================');
console.log('AppexQuant Environment Schema Validation');
console.log('=========================================');

let hasErrors = false;
const errors = [];

for (const [key, rule] of Object.entries(schema)) {
  const value = process.env[key];

  if (!value) {
    if (rule.required) {
      errors.push(`[MISSING] ${key} is required. (${rule.description})`);
      hasErrors = true;
    }
    continue;
  }

  if (rule.minLength && value.length < rule.minLength) {
    errors.push(`[WEAK] ${key} must be at least ${rule.minLength} characters long for cryptographic security.`);
    hasErrors = true;
  }

  if (rule.pattern && !rule.pattern.test(value)) {
    errors.push(`[FORMAT] ${key} format is invalid. Expected pattern: ${rule.pattern}`);
    hasErrors = true;
  }

  if (rule.allowed && !rule.allowed.includes(value)) {
    errors.push(`[ENUM] ${key} must be one of: ${rule.allowed.join(', ')}.`);
    hasErrors = true;  
  }

  if (rule.isUrl) {
    try {
      new URL(value);
    } catch (e) {
      errors.push(`[URL] ${key} must be a valid URL. (Received: ${value})`);
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.error('\n❌ CRITICAL: Boot sequence halted. Environment schema validation failed:');
  errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
}

console.log('✅ Strict environment schema validated successfully. All required runtime secrets are present.\n');
