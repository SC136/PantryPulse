import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card-solid p-8 max-w-md text-center">
        <AlertCircle className="w-12 h-12 text-[var(--pp-accent-warm)] mx-auto mb-4" />
        <h1
          className="text-2xl font-semibold mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Authentication Error
        </h1>
        <p className="text-[var(--ink-muted)] mb-6">
          Something went wrong during authentication. The link may have expired or already been used.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center px-6 py-3 rounded-lg bg-[var(--pp-accent-navy)] text-white hover:opacity-90 transition-opacity"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
