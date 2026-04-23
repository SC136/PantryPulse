import { create } from 'zustand';
import { PantryItem, GroceryItem, ChatMessage } from '@/types';

interface PantryStore {
  items: PantryItem[];
  groceryList: GroceryItem[];
  chatHistory: ChatMessage[];
  isLoading: boolean;
  activeCategory: 'fridge' | 'freezer' | 'pantry' | 'all';
  setItems: (items: PantryItem[]) => void;
  addItem: (item: PantryItem) => void;
  updateItem: (id: string, updates: Partial<PantryItem>) => void;
  removeItem: (id: string) => void;
  setGroceryList: (items: GroceryItem[]) => void;
  addGroceryItem: (item: GroceryItem) => void;
  toggleGroceryItem: (id: string) => void;
  removeGroceryItem: (id: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  setLoading: (loading: boolean) => void;
  setActiveCategory: (cat: PantryStore['activeCategory']) => void;
}

export const usePantryStore = create<PantryStore>((set) => ({
  items: [],
  groceryList: [],
  chatHistory: [],
  isLoading: false,
  activeCategory: 'all',

  setItems: (items) => set({ items }),
  addItem: (item) => set((s) => ({ items: [item, ...s.items] })),
  updateItem: (id, updates) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),
  removeItem: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  setGroceryList: (groceryList) => set({ groceryList }),
  addGroceryItem: (item) =>
    set((s) => ({ groceryList: [item, ...s.groceryList] })),
  toggleGroceryItem: (id) =>
    set((s) => ({
      groceryList: s.groceryList.map((i) =>
        i.id === id ? { ...i, is_purchased: !i.is_purchased } : i
      ),
    })),
  removeGroceryItem: (id) =>
    set((s) => ({ groceryList: s.groceryList.filter((i) => i.id !== id) })),

  addChatMessage: (msg) =>
    set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
  clearChat: () => set({ chatHistory: [] }),

  setLoading: (isLoading) => set({ isLoading }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
}));
