import type { Metadata } from 'next';
import { Cormorant_Garamond, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { Navbar } from '@/components/layout/Navbar';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { createClient } from '@/lib/supabase/server';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PantryPulse — Anti-Waste Kitchen Manager',
  description:
    'AI-powered kitchen management. Track expiry dates, get recipe suggestions from your pantry, reduce food waste, and save money.',
  keywords: ['pantry', 'food waste', 'kitchen', 'recipes', 'meal planning', 'expiry tracker'],
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialUser = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    initialUser = user;
  } catch {
    // No session available — user is not logged in
  }

  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${sourceSerif.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('theme');
                const p = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (t === 'dark' || (!t && p)) document.documentElement.classList.add('dark');
              } catch {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <ErrorBoundary>
          <AuthProvider initialUser={initialUser}>
            <Navbar />
            <main className="flex-1">{children}</main>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
