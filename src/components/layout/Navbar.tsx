'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Package,
  ChefHat,
  ShoppingCart,
  BarChart3,
  User,
  LogOut,
  Menu,
  X,
  Leaf,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from './AuthProvider';
import { createClient } from '@/lib/supabase/client';

const navLinks = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pantry', label: 'Pantry', icon: Package },
  { href: '/cook', label: 'Cook', icon: ChefHat },
  { href: '/grocery', label: 'Grocery', icon: ShoppingCart },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/profile', label: 'Profile', icon: User },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (!user) return null;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass-card rounded-none border-x-0 border-t-0'
            : 'bg-gradient-to-b from-black/60 to-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <Leaf className="w-6 h-6 text-[var(--pp-accent-safe)] transition-transform group-hover:rotate-12" />
              <span
                className={`text-xl font-semibold italic tracking-tight transition-colors duration-300 ${
                  scrolled ? 'text-[var(--ink)]' : 'text-white'
                }`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                PantryPulse
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? scrolled
                          ? 'bg-[var(--pp-surface)] text-[var(--ink)]'
                          : 'bg-white/20 text-white backdrop-blur-md'
                        : scrolled
                          ? 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--pp-surface-glass)]'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
                  scrolled
                    ? 'text-[var(--ink-muted)] hover:text-[var(--pp-accent-warm)]'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={`md:hidden p-2 rounded-lg transition-colors duration-300 ${
                  scrolled ? 'hover:bg-[var(--pp-surface)]' : 'text-white hover:bg-white/10'
                }`}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-16 z-40 p-4 md:hidden"
          >
            <div className="glass-card p-4 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[var(--pp-surface)] text-[var(--ink)]'
                        : 'text-[var(--ink-muted)] hover:bg-[var(--pp-surface-glass)]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-[var(--pp-accent-warm)] w-full"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
