'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/components/layout/AuthProvider';
import { usePantryStore } from '@/store/pantry';
import { PantryItem, getExpiryStatus } from '@/types';
import { getExpiryLabel } from '@/lib/utils/expiry';
import { useToast } from '@/hooks/useToast';
import { Toaster } from '@/components/ui/toaster';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  Leaf,
  ChefHat,
  Plus,
  TrendingUp,
  ShoppingCart,
  Package,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function AnimatedCounter({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <span ref={ref} style={{ fontFamily: 'var(--font-display)' }}>
      {prefix}{typeof value === 'number' && value % 1 !== 0 ? count.toFixed(2) : count}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { items, setItems } = usePantryStore();
  const { toasts, addToast, removeToast } = useToast();
  const [stats, setStats] = useState({ moneySaved: 0, itemsRescued: 0, reductionPct: 0 });
  const [quickAdd, setQuickAdd] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch('/api/items')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setItems(data); })
      .catch(() => addToast('Failed to load pantry items', 'error'));
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {/* stats are non-critical, fail silently */});
  }, [user, setItems, addToast]);

  const criticalItems = items.filter(
    (i) => getExpiryStatus(i.days_until_expiry) === 'critical'
  );
  const warningItems = items.filter(
    (i) => getExpiryStatus(i.days_until_expiry) === 'warning'
  );
  const safeItems = items.filter(
    (i) => getExpiryStatus(i.days_until_expiry) === 'safe' || getExpiryStatus(i.days_until_expiry) === 'unknown'
  );

  const handleQuickAdd = async () => {
    if (!quickAdd.trim()) return;
    setIsAdding(true);
    try {
      const estRes = await fetch('/api/expiry-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName: quickAdd }),
      });
      const { days } = await estRes.json();

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (days || 7));

      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickAdd,
          category: 'pantry',
          expiry_date: expiryDate.toISOString().split('T')[0],
        }),
      });
      if (!res.ok) throw new Error('Failed to add item');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        usePantryStore.getState().addItem(data[0]);
      }
      addToast(`${quickAdd} added to pantry`, 'success');
      setQuickAdd('');
    } catch {
      addToast('Failed to add item. Please try again.', 'error');
    }
    setIsAdding(false);
  };

  const renderItemList = (
    itemList: PantryItem[],
    label: string,
    icon: React.ReactNode,
    colorClass: string,
    pulseClass?: string
  ) => {
    if (itemList.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className={`flex items-center gap-2 text-sm font-medium ${colorClass}`}>
          {icon}
          {label} ({itemList.length})
        </div>
        <div className="space-y-2">
          {itemList.slice(0, 5).map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center justify-between p-3 rounded-lg bg-[var(--canvas-deep)] ${pulseClass || ''}`}
            >
              <div>
                <p className="font-medium text-sm">{item.name}</p>
                <p className={`text-xs ${colorClass}`}>
                  {getExpiryLabel(item.days_until_expiry)}
                </p>
              </div>
              <span className="text-xs text-[var(--ink-faint)]">
                {item.quantity} {item.unit}
              </span>
            </motion.div>
          ))}
          {itemList.length > 5 && (
            <p className="text-xs text-[var(--ink-faint)] text-center">
              +{itemList.length - 5} more
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <div className="relative h-[50vh] min-h-[400px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1600&q=80)',
          }}
        />
        <div className="absolute inset-0 hero-vignette" />

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 pt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-3 italic"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Eat Me First
            </h1>
            <p className="text-white/80 text-lg max-w-md mx-auto">
              {criticalItems.length > 0
                ? `${criticalItems.length} item${criticalItems.length > 1 ? 's' : ''} need your attention today`
                : 'Your kitchen is looking good!'}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="max-w-6xl mx-auto px-4 -mt-24 relative z-20 pb-12">
        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-[var(--ink-faint)] mb-1">
                Saved This Month
              </p>
              <p className="text-3xl font-bold text-[var(--pp-accent-safe)]">
                <AnimatedCounter value={stats.moneySaved} prefix="$" />
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-[var(--ink-faint)] mb-1">
                Items Rescued
              </p>
              <p className="text-3xl font-bold text-[var(--pp-accent-navy)]">
                <AnimatedCounter value={stats.itemsRescued} />
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-[var(--ink-faint)] mb-1">
                Waste Reduced
              </p>
              <p className="text-3xl font-bold text-[var(--pp-accent-gold)]">
                <AnimatedCounter value={stats.reductionPct} />%
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Expiry urgency column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 glass-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-xl font-semibold"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Expiry Tracker
              </h2>
              <Link
                href="/pantry"
                className="text-sm text-[var(--pp-accent-navy)] hover:underline flex items-center gap-1"
              >
                View All <Package className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-6">
              {renderItemList(
                criticalItems,
                'Use Today',
                <AlertTriangle className="w-4 h-4" />,
                'text-[var(--pp-accent-warm)]',
                'pulse-critical'
              )}
              {renderItemList(
                warningItems,
                'This Week',
                <Clock className="w-4 h-4" />,
                'text-[var(--pp-accent-gold)]'
              )}
              {renderItemList(
                safeItems,
                'Still Fresh',
                <Leaf className="w-4 h-4" />,
                'text-[var(--pp-accent-safe)]'
              )}
              {items.length === 0 && (
                <div className="text-center py-8 text-[var(--ink-faint)]">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Your pantry is empty. Add some items to get started!</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Quick add */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6"
            >
              <h3
                className="text-lg font-semibold mb-4"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Quick Add
              </h3>
              <div className="flex gap-2">
                <Input
                  value={quickAdd}
                  onChange={(e) => setQuickAdd(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                  placeholder="Add item..."
                  className="bg-[var(--canvas-deep)] border-[var(--pp-border)]"
                />
                <Button
                  onClick={handleQuickAdd}
                  disabled={isAdding || !quickAdd.trim()}
                  size="icon"
                  className="bg-[var(--pp-accent-navy)] hover:bg-[var(--pp-accent-navy)]/90 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-[var(--ink-faint)] mt-2">
                AI auto-estimates expiry date
              </p>
            </motion.div>

            {/* CTA cards */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Link href="/cook" className="block">
                <div className="glass-card p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group">
                  <ChefHat className="w-8 h-8 text-[var(--pp-accent-warm)] mb-3 group-hover:rotate-12 transition-transform" />
                  <h3
                    className="text-lg font-semibold mb-1"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    What Can I Cook?
                  </h3>
                  <p className="text-sm text-[var(--ink-muted)]">
                    AI recipes from your pantry
                  </p>
                </div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 gap-3"
            >
              <Link href="/grocery">
                <div className="glass-card p-4 text-center hover:shadow-lg transition-all hover:-translate-y-1">
                  <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-[var(--pp-accent-gold)]" />
                  <p className="text-xs font-medium">Grocery List</p>
                </div>
              </Link>
              <Link href="/stats">
                <div className="glass-card p-4 text-center hover:shadow-lg transition-all hover:-translate-y-1">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 text-[var(--pp-accent-safe)]" />
                  <p className="text-xs font-medium">Waste Stats</p>
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
      <Toaster toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
