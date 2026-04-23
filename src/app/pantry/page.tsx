'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/components/layout/AuthProvider';
import { usePantryStore } from '@/store/pantry';
import { PantryItem, getExpiryStatus } from '@/types';
import { getExpiryLabel } from '@/lib/utils/expiry';
import {
  Plus, Camera, Receipt, Trash2, Check, Search,
  Refrigerator, Snowflake, Package,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

const categoryIcons = {
  fridge: Refrigerator,
  freezer: Snowflake,
  pantry: Package,
};

const categoryColors = {
  fridge: 'var(--pp-accent-navy)',
  freezer: 'var(--pp-accent-safe)',
  pantry: 'var(--pp-accent-gold)',
};

export default function PantryPage() {
  const { user } = useAuth();
  const { items, setItems, activeCategory, setActiveCategory, removeItem, updateItem } = usePantryStore();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Add item form
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'fridge' | 'freezer' | 'pantry'>('fridge');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newUnit, setNewUnit] = useState('unit');
  const [newExpiry, setNewExpiry] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scan states
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedItems, setScannedItems] = useState<Array<{ name: string; quantity: number; unit: string; estimatedDaysLeft: number; category: string; selected: boolean }>>([]);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptItems, setReceiptItems] = useState<Array<{ name: string; quantity: number; price: number | null; selected: boolean }>>([]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/items')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setItems(data); });
  }, [user, setItems]);

  const filteredItems = items.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddItem = async () => {
    if (!newName.trim()) return;
    setIsSubmitting(true);

    let expiryDate = newExpiry;
    if (!expiryDate) {
      try {
        const res = await fetch('/api/expiry-estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemName: newName }),
        });
        const { days } = await res.json();
        const d = new Date();
        d.setDate(d.getDate() + (days || 7));
        expiryDate = d.toISOString().split('T')[0];
      } catch { /* fallback */ }
    }

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          category: newCategory,
          quantity: parseFloat(newQuantity) || 1,
          unit: newUnit,
          expiry_date: expiryDate || null,
          price: newPrice ? parseFloat(newPrice) : null,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        usePantryStore.getState().addItem(data[0]);
      }
      setNewName(''); setNewExpiry(''); setNewPrice('');
      setAddOpen(false);
    } catch (e) { console.error(e); }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/items/${id}`, { method: 'DELETE' });
      removeItem(id);
    } catch (e) { console.error(e); }
  };

  const handleMarkUsed = async (id: string) => {
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_used: true }),
      });
      const data = await res.json();
      if (data.id) updateItem(id, { is_used: true });
      removeItem(id);
    } catch (e) { console.error(e); }
  };

  const handleFridgeScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanLoading(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/scan-fridge', { method: 'POST', body: formData });
      const { items: detected } = await res.json();
      setScannedItems((detected || []).map((item: Record<string, unknown>) => ({ ...item, selected: true })));
    } catch (e) { console.error(e); }
    setScanLoading(false);
  };

  const handleConfirmScan = async () => {
    const selected = scannedItems.filter((i) => i.selected);
    if (selected.length === 0) return;
    setIsSubmitting(true);

    const itemsToAdd = selected.map((item) => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + item.estimatedDaysLeft);
      return {
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        expiry_date: expiryDate.toISOString().split('T')[0],
      };
    });

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemsToAdd),
      });
      const data = await res.json();
      if (Array.isArray(data)) data.forEach((item: PantryItem) => usePantryStore.getState().addItem(item));
      setScannedItems([]);
      setScanOpen(false);
    } catch (e) { console.error(e); }
    setIsSubmitting(false);
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptLoading(true);

    try {
      // Client-side OCR with Tesseract
      const { parseReceiptText } = await import('@/lib/ocr/receipt-parser');
      const parsed = await parseReceiptText(file);
      setReceiptItems(parsed.map((item) => ({ ...item, selected: true })));

      // Also upload to storage
      const formData = new FormData();
      formData.append('image', file);
      fetch('/api/scan-receipt', { method: 'POST', body: formData });
    } catch (e) { console.error(e); }
    setReceiptLoading(false);
  };

  const handleConfirmReceipt = async () => {
    const selected = receiptItems.filter((i) => i.selected);
    if (selected.length === 0) return;
    setIsSubmitting(true);

    const itemsToAdd = selected.map((item) => ({
      name: item.name,
      category: 'pantry' as const,
      quantity: item.quantity,
      unit: 'unit',
      price: item.price,
    }));

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemsToAdd),
      });
      const data = await res.json();
      if (Array.isArray(data)) data.forEach((item: PantryItem) => usePantryStore.getState().addItem(item));
      setReceiptItems([]);
      setReceiptOpen(false);
    } catch (e) { console.error(e); }
    setIsSubmitting(false);
  };

  const getStatusClass = (days: number | null) => {
    const status = getExpiryStatus(days);
    if (status === 'critical') return 'expiry-critical';
    if (status === 'warning') return 'expiry-warning';
    if (status === 'safe') return 'expiry-safe';
    return '';
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Your Pantry
        </h1>
        <p className="text-[var(--ink-muted)]">
          {items.length} items tracked • {items.filter((i) => i.days_until_expiry !== null && i.days_until_expiry <= 4).length} expiring soon
        </p>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 mb-6"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-faint)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="pl-10 bg-[var(--canvas-deep)] border-[var(--pp-border)]"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={
              <Button className="bg-[var(--pp-accent-navy)] hover:bg-[var(--pp-accent-navy)]/90">
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            } />
            <DialogContent className="glass-card-solid border-[var(--pp-border)]">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Add Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Spinach" className="bg-[var(--canvas-deep)]" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['fridge', 'freezer', 'pantry'] as const).map((cat) => {
                    const Icon = categoryIcons[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setNewCategory(cat)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                          newCategory === cat
                            ? 'border-[var(--pp-accent-navy)] bg-[var(--canvas-deep)]'
                            : 'border-[var(--pp-border)] hover:bg-[var(--canvas-deep)]'
                        }`}
                      >
                        <Icon className="w-5 h-5" style={{ color: categoryColors[cat] }} />
                        <span className="text-xs capitalize">{cat}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Quantity</Label><Input type="number" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} className="bg-[var(--canvas-deep)]" /></div>
                  <div><Label>Unit</Label><Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="bg-[var(--canvas-deep)]" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Expiry Date <span className="text-[var(--ink-faint)]">(auto if blank)</span></Label><Input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} className="bg-[var(--canvas-deep)]" /></div>
                  <div><Label>Price ($)</Label><Input type="number" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="bg-[var(--canvas-deep)]" /></div>
                </div>
                <Button onClick={handleAddItem} disabled={isSubmitting || !newName.trim()} className="w-full bg-[var(--pp-accent-navy)]">
                  {isSubmitting ? 'Adding...' : 'Add to Pantry'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={scanOpen} onOpenChange={setScanOpen}>
            <DialogTrigger render={
              <Button variant="outline" className="border-[var(--pp-border)]">
                <Camera className="w-4 h-4 mr-1" /> Scan Fridge
              </Button>
            } />
            <DialogContent className="glass-card-solid border-[var(--pp-border)] max-w-lg">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Scan Your Fridge</DialogTitle>
              </DialogHeader>
              {scannedItems.length === 0 ? (
                <div className="text-center py-8">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-[var(--ink-faint)]" />
                  <p className="text-sm text-[var(--ink-muted)] mb-4">Take a photo of your fridge and AI will detect all items</p>
                  <label className="inline-flex items-center px-4 py-2 rounded-lg bg-[var(--pp-accent-navy)] text-white cursor-pointer hover:opacity-90">
                    {scanLoading ? 'Analyzing...' : 'Upload Photo'}
                    <input type="file" accept="image/*" capture="environment" onChange={handleFridgeScan} className="hidden" disabled={scanLoading} />
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--ink-muted)]">Found {scannedItems.length} items. Deselect any you don&apos;t want to add:</p>
                  {scannedItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--canvas-deep)]">
                      <input type="checkbox" checked={item.selected} onChange={() => {
                        const updated = [...scannedItems];
                        updated[i].selected = !updated[i].selected;
                        setScannedItems(updated);
                      }} className="rounded" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-[var(--ink-faint)]">{item.quantity} {item.unit} • ~{item.estimatedDaysLeft}d left</p>
                      </div>
                    </div>
                  ))}
                  <Button onClick={handleConfirmScan} disabled={isSubmitting} className="w-full bg-[var(--pp-accent-navy)]">
                    Add {scannedItems.filter((i) => i.selected).length} Items
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
            <DialogTrigger render={
              <Button variant="outline" className="border-[var(--pp-border)]">
                <Receipt className="w-4 h-4 mr-1" /> Scan Receipt
              </Button>
            } />
            <DialogContent className="glass-card-solid border-[var(--pp-border)] max-w-lg">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Scan Receipt</DialogTitle>
              </DialogHeader>
              {receiptItems.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 mx-auto mb-4 text-[var(--ink-faint)]" />
                  <p className="text-sm text-[var(--ink-muted)] mb-4">Upload a grocery receipt to auto-add items</p>
                  <label className="inline-flex items-center px-4 py-2 rounded-lg bg-[var(--pp-accent-navy)] text-white cursor-pointer hover:opacity-90">
                    {receiptLoading ? 'Processing...' : 'Upload Receipt'}
                    <input type="file" accept="image/*" onChange={handleReceiptScan} className="hidden" disabled={receiptLoading} />
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--ink-muted)]">Parsed {receiptItems.length} items:</p>
                  {receiptItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--canvas-deep)]">
                      <input type="checkbox" checked={item.selected} onChange={() => {
                        const updated = [...receiptItems];
                        updated[i].selected = !updated[i].selected;
                        setReceiptItems(updated);
                      }} className="rounded" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.price && <p className="text-xs text-[var(--ink-faint)]">${item.price.toFixed(2)}</p>}
                      </div>
                    </div>
                  ))}
                  <Button onClick={handleConfirmReceipt} disabled={isSubmitting} className="w-full bg-[var(--pp-accent-navy)]">
                    Add {receiptItems.filter((i) => i.selected).length} Items
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Category tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 mb-6 overflow-x-auto pb-2"
      >
        {(['all', 'fridge', 'freezer', 'pantry'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-[var(--pp-accent-navy)] text-white'
                : 'bg-[var(--canvas-deep)] text-[var(--ink-muted)] hover:bg-[var(--pp-surface)]'
            }`}
          >
            {cat === 'all' ? 'All Items' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">
              {cat === 'all' ? items.length : items.filter((i) => i.category === cat).length}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Items grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ y: -4 }}
              className="glass-card-solid p-4 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{item.name}</h3>
                  <p className="text-xs text-[var(--ink-faint)] mt-0.5">
                    {item.quantity} {item.unit}
                  </p>
                </div>
                <Badge className={`text-xs ${getStatusClass(item.days_until_expiry)}`}>
                  {getExpiryLabel(item.days_until_expiry)}
                </Badge>
              </div>

              <div className="flex items-center gap-1 mt-auto pt-3 border-t border-[var(--pp-border)]">
                <button
                  onClick={() => handleMarkUsed(item.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--pp-accent-safe)] hover:bg-[var(--canvas-deep)] transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Used
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--pp-accent-warm)] hover:bg-[var(--canvas-deep)] transition-colors ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-16 text-[var(--ink-faint)]">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
            {search ? 'No items match your search' : 'No items in this category'}
          </p>
        </div>
      )}
    </div>
  );
}
