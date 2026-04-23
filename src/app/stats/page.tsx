'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/components/layout/AuthProvider';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { TrendingDown, Percent, Leaf, AlertTriangle, DollarSign, Trash2 } from 'lucide-react';

interface Stats {
  moneySaved: number;
  moneyWasted: number;
  reductionPct: number;
  itemsRescued: number;
  wasteLog: Array<{ id: string; item_name: string; estimated_price: number | null; wasted_at: string; reason: string }>;
  topWastedItem: string | null;
}

export default function StatsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch('/api/stats').then((r) => r.json()).then(setStats);
  }, [user]);

  if (!stats) return <div className="min-h-screen pt-20 flex items-center justify-center"><div className="animate-pulse text-[var(--ink-faint)]">Loading...</div></div>;

  const cards = [
    { label: 'Money Saved', value: `$${stats.moneySaved.toFixed(2)}`, icon: DollarSign, color: 'var(--pp-accent-safe)' },
    { label: 'Money Wasted', value: `$${stats.moneyWasted.toFixed(2)}`, icon: TrendingDown, color: 'var(--pp-accent-warm)' },
    { label: 'Items Rescued', value: String(stats.itemsRescued), icon: Leaf, color: 'var(--pp-accent-navy)' },
    { label: 'Waste Reduced', value: `${stats.reductionPct}%`, icon: Percent, color: 'var(--pp-accent-gold)' },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>Waste & Savings</h1>
        <p className="text-[var(--ink-muted)]">This month&apos;s overview</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c, i) => { const Icon = c.icon; return (
          <motion.div key={c.label} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-6 text-center">
            <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: c.color }} />
            <p className="text-xs uppercase tracking-wider text-[var(--ink-faint)] mb-1">{c.label}</p>
            <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: c.color }}>{c.value}</p>
          </motion.div>
        ); })}
      </div>

      {stats.topWastedItem && (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6 mb-8 flex items-center gap-4">
          <AlertTriangle className="w-8 h-8 text-[var(--pp-accent-warm)] shrink-0" />
          <div>
            <p className="font-medium" style={{ fontFamily: 'var(--font-display)' }}>Top wasted item</p>
            <p className="text-sm text-[var(--ink-muted)]"><span className="font-semibold text-[var(--pp-accent-warm)]">{stats.topWastedItem}</span> — buy smaller quantities.</p>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card overflow-hidden">
        <div className="p-6 border-b border-[var(--pp-border)]">
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Waste Log</h2>
        </div>
        {stats.wasteLog.length > 0 ? (
          <div className="divide-y divide-[var(--pp-border)]">
            {stats.wasteLog.map((e) => (
              <div key={e.id} className="p-4 flex items-center gap-4">
                <Trash2 className="w-4 h-4 text-[var(--pp-accent-warm)] shrink-0" />
                <div className="flex-1"><p className="text-sm font-medium">{e.item_name}</p><p className="text-xs text-[var(--ink-faint)]">{formatDate(e.wasted_at)} • {e.reason}</p></div>
                {e.estimated_price && <span className="text-sm text-[var(--pp-accent-warm)]">{formatCurrency(e.estimated_price)}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-[var(--ink-faint)]"><Leaf className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No waste this month!</p></div>
        )}
      </motion.div>
    </div>
  );
}
