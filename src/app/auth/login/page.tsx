'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { Leaf, Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      router.push('/');
      router.refresh();
    } else {
      setError(error.message);
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (!error) {
      setMessage('Check your email to confirm your account!');
    } else {
      setError(error.message);
    }
    setIsLoading(false);
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email first');
      return;
    }
    setIsLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (!error) {
      setMessage('Magic link sent! Check your email.');
    } else {
      setError(error.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1600&q=80)',
        }}
      />
      <div className="absolute inset-0 hero-vignette" />

      {/* Auth card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card p-8 sm:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <Leaf className="w-8 h-8 text-[var(--pp-accent-safe)]" />
            </div>
            <h1
              className="text-3xl font-semibold italic"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              PantryPulse
            </h1>
            <p className="text-sm text-[var(--ink-muted)] mt-1">
              Your AI kitchen companion
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-lg bg-[var(--canvas-deep)] p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-[var(--canvas)] shadow-sm text-[var(--ink)]'
                  : 'text-[var(--ink-muted)]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'signup'
                  ? 'bg-[var(--canvas)] shadow-sm text-[var(--ink)]'
                  : 'text-[var(--ink-muted)]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={mode === 'login' ? handleLogin : handleSignup}
              className="space-y-4"
            >
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm text-[var(--ink-muted)]">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-faint)]" />
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="pl-10 bg-[var(--canvas-deep)] border-[var(--pp-border)]"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-[var(--ink-muted)]">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-faint)]" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="pl-10 bg-[var(--canvas-deep)] border-[var(--pp-border)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-[var(--ink-muted)]">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-faint)]" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pl-10 bg-[var(--canvas-deep)] border-[var(--pp-border)]"
                  />
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-[var(--pp-accent-warm)] bg-[color-mix(in_srgb,var(--pp-accent-warm)_10%,transparent)] p-3 rounded-lg"
                >
                  {error}
                </motion.p>
              )}

              {message && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-[var(--pp-accent-safe)] bg-[color-mix(in_srgb,var(--pp-accent-safe)_10%,transparent)] p-3 rounded-lg"
                >
                  {message}
                </motion.p>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[var(--pp-accent-navy)] hover:bg-[var(--pp-accent-navy)]/90 text-white py-5 text-base"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {isLoading ? (
                  <span className="animate-pulse">Please wait...</span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </motion.form>
          </AnimatePresence>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--pp-border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[var(--pp-surface-glass)] px-3 text-xs text-[var(--ink-faint)]">
                or
              </span>
            </div>
          </div>

          {/* Magic link */}
          <Button
            variant="outline"
            onClick={handleMagicLink}
            disabled={isLoading}
            className="w-full border-[var(--pp-border)] hover:bg-[var(--canvas-deep)]"
          >
            <Sparkles className="w-4 h-4 mr-2 text-[var(--pp-accent-gold)]" />
            Continue with Magic Link
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
