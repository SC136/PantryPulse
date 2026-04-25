'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/layout/AuthProvider';
import { useHouseholdStore } from '@/store/household';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

function JoinInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying invite...');

  const token = searchParams.get('token');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?next=/join?token=${token}`);
      return;
    }
    if (!token) {
      setStatus('error');
      setMessage('No invite token provided.');
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/households/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (res.ok || data.household_id) {
          setStatus('success');
          setMessage('You have joined the household!');

          const hRes = await fetch('/api/households');
          const households = await hRes.json();
          if (Array.isArray(households)) {
            useHouseholdStore.getState().setHouseholds(households);
          }
          if (data.household_id) {
            useHouseholdStore.getState().setActiveHouseholdId(data.household_id);
          }

          setTimeout(() => router.push('/pantry'), 1500);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to join household.');
        }
      } catch {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    })();
  }, [user, authLoading, token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card-solid p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-[var(--pp-accent-navy)]" />
            <p className="text-[var(--ink-muted)]">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-[var(--pp-accent-safe)]" />
            <h2
              className="text-xl font-bold mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Welcome!
            </h2>
            <p className="text-[var(--ink-muted)]">{message}</p>
            <p className="text-sm text-[var(--ink-faint)] mt-2">Redirecting to pantry...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 mx-auto mb-4 text-[var(--pp-accent-warm)]" />
            <h2
              className="text-xl font-bold mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Invite Error
            </h2>
            <p className="text-[var(--ink-muted)]">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--pp-accent-navy)]" />
        </div>
      }
    >
      <JoinInner />
    </Suspense>
  );
}
