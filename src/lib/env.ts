/**
 * Environment variable validation
 * Ensures all required env vars are configured on app startup
 */

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NVIDIA_API_KEY',
];

const OPTIONAL_ENV_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY', // Required for storage setup, but optional for initial run
];

/**
 * Validates all required environment variables are set
 * Should be called once on app startup
 * @throws Error if any required variables are missing
 */
export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\n` +
      `Please check your .env.local file or deployment configuration.`
    );
  }
}

/**
 * Gets a required environment variable with validation
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable not set: ${key}`);
  }
  return value;
}

/**
 * Gets an optional environment variable
 */
export function getOptionalEnv(key: string): string | undefined {
  return process.env[key];
}
