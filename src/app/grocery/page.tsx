'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/components/layout/AuthProvider';
import { usePantryStore } from '@/store/pantry';
import { GroceryItem } from '@/types';
import {
  ShoppingCart, Plus, Check, Trash2, Package,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function GroceryPage() {
  const { user } = useAuth();
  const { groceryList, setGroceryList, addGroceryItem, toggleGroceryItem, removeGroceryItem } = usePantryStore();
  const [newItem, setNewItem] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch('/api/grocery')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setGroceryList(data); });
  }, [user, setGroceryList]);

  const handleAdd = async () => {
    if (!newItem.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItem,
          quantity: parseFloat(newQty) || 1,
          unit: 'unit',
        }),
      });
      const data = await res.json();
      if (Array.isArray(data) && data[0]) addGroceryItem(data[0]);
      setNewItem('');
      setNewQty('1');
    } catch (e) { console.error(e); }
    setIsAdding(false);
  };

  const handleToggle = async (id: string, currentState: boolean) => {
    toggleGroceryItem(id);
    try {
      await fetch(`/api/grocery/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_purchased: !currentState }),
      });
    } catch (e) {
      toggleGroceryItem(id); // revert
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    removeGroceryItem(id);
    try {
      await fetch(`/api/grocery/${id}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
  };

  const pendingItems = groceryList.filter((i) => !i.is_purchased);
  const purchasedItems = groceryList.filter((i) => i.is_purchased);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Grocery List
        </h1>
        <p className="text-[var(--ink-muted)]">
          {pendingItems.length} items to buy • {purchasedItems.length} purchased
        </p>
      </motion.div>

      {/* Add item */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 mb-6"
      >
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add item to list..."
            className="bg-[var(--canvas-deep)] border-[var(--pp-border)] flex-1"
          />
          <Input
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            type="number"
            min="1"
            className="bg-[var(--canvas-deep)] border-[var(--pp-border)] w-16"
          />
          <Button
            onClick={handleAdd}
            disabled={isAdding || !newItem.trim()}
            className="bg-[var(--pp-accent-navy)] hover:bg-[var(--pp-accent-navy)]/90"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Pending items */}
      <div className="space-y-2 mb-8">
        <AnimatePresence>
          {pendingItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card-solid p-4 flex items-center gap-3"
            >
              <button
                onClick={() => handleToggle(item.id, item.is_purchased)}
                className="w-6 h-6 rounded-full border-2 border-[var(--ink-faint)] hover:border-[var(--pp-accent-safe)] transition-colors shrink-0 flex items-center justify-center"
              >
              </button>
              <div className="flex-1">
                <p className="font-medium text-sm">{item.name}</p>
              </div>
              <span className="text-xs text-[var(--ink-faint)]">
                ×{item.quantity}
              </span>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-1 rounded hover:bg-[var(--canvas-deep)] text-[var(--ink-faint)] hover:text-[var(--pp-accent-warm)] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Purchased section */}
      {purchasedItems.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[var(--ink-faint)] uppercase tracking-wider mb-3">
            Purchased ({purchasedItems.length})
          </h3>
          <div className="space-y-2">
            {purchasedItems.map((item) => (
              <motion.div
                key={item.id}
                className="glass-card-solid p-4 flex items-center gap-3 opacity-60"
              >
                <button
                  onClick={() => handleToggle(item.id, item.is_purchased)}
                  className="w-6 h-6 rounded-full bg-[var(--pp-accent-safe)] shrink-0 flex items-center justify-center"
                >
                  <Check className="w-3.5 h-3.5 text-white" />
                </button>
                <p className="flex-1 text-sm line-through text-[var(--ink-muted)]">
                  {item.name}
                </p>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 rounded hover:bg-[var(--canvas-deep)] text-[var(--ink-faint)]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {groceryList.length === 0 && (
        <div className="text-center py-16 text-[var(--ink-faint)]">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
            Your grocery list is empty
          </p>
          <p className="text-sm mt-1">Add items you need to buy</p>
        </div>
      )}
    </div>
  );
}
