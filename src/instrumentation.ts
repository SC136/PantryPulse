/**
 * Next.js Instrumentation Hook
 * Runs once on server startup before any requests are handled
 * Use this for initialization logic like environment validation
 */

import { validateEnv } from '@/lib/env';

export async function register() {
  // Validate environment variables once on server startup
  try {
    validateEnv();
  } catch (error) {
    console.error('Fatal: Environment validation failed:', error);
    throw error; // Prevent server from starting with invalid configuration
  }
}
