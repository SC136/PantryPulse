'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/components/layout/AuthProvider';
import { usePantryStore } from '@/store/pantry';
import { ChatMessage, Recipe, UserProfile, getExpiryStatus } from '@/types';
import { generateId } from '@/lib/utils/formatting';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';
import { Toaster } from '@/components/ui/toaster';
import {
  Send, ChefHat, Clock, Users, Lightbulb, AlertTriangle,
  Bookmark, BookmarkCheck, Sparkles, Trash2, X, ShoppingCart,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const SUGGESTED_PROMPTS = [
  '🍝 Quick weeknight dinner under 30 mins',
  '🥗 Something healthy with what\'s expiring',
  '🍲 Comfort food for a cold evening',
  '🥘 Use up everything expiring this week',
];

const BLINKIT_LINKS: Record<string, string> = {
  'lettuce': 'https://blinkit.com/prn/iceberg-lettuce/prid/168706',
  'iceberg': 'https://blinkit.com/prn/iceberg-lettuce/prid/168706',
  'onion': 'https://blinkit.com/prn/onion-kanda/prid/391306',
  'coriander': 'https://blinkit.com/prn/coriander-bunch-kothimbir/prid/3889',
  'dhaniya': 'https://blinkit.com/prn/coriander-bunch-kothimbir/prid/3889',
  'chilli': 'https://blinkit.com/prn/green-chilli-hiravi-mirchi/prid/423735',
  'potato': 'https://blinkit.com/prn/potato-new-crop-batata/prid/199435',
  'lemon': 'https://blinkit.com/prn/lemon-limbu/prid/229627',
  'ginger': 'https://blinkit.com/prn/ginger-aale/prid/95032',
  'cucumber': 'https://blinkit.com/prn/green-cucumber-hiravi-kakdi/prid/10088',
  'tomato': 'https://blinkit.com/prn/organically-grown-tomato-hybrid/prid/602590',
  'capsicum': 'https://blinkit.com/prn/green-capsicum-hiravi-shimla-mirchi/prid/3888',
  'bell pepper': 'https://blinkit.com/prn/green-capsicum-hiravi-shimla-mirchi/prid/3888',
  'salt': 'https://blinkit.com/prn/tata-salt-vacuum-evaporated-iodised/prid/105',
  'sugar': 'https://blinkit.com/prn/madhur-pure-hygienic-sulphurless-sugar/prid/11006',
  'egg': 'https://blinkit.com/prn/table-white-eggs-6-pcs/prid/487729',
  'milk': 'https://blinkit.com/prn/amul-taaza-toned-milk/prid/19512',
};

interface SavedRecipe extends Recipe {
  id: string;
  generated_at: string;
  instructions?: string;
}

// Helper function to get Blinkit link for missing ingredients
function getBlinkitLink(ingredient: string): string | null {
  const normalized = ingredient.toLowerCase().trim();
  return BLINKIT_LINKS[normalized] || null;
}

export default function CookPage() {
  const { user } = useAuth();
  const { items, setItems, chatHistory, addChatMessage } = usePantryStore();
  const { toasts, addToast, removeToast } = useToast();
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [savedMsgIds, setSavedMsgIds] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Fetch pantry items if store is empty (e.g. direct navigation / page refresh)
  useEffect(() => {
    if (items.length === 0 && user) {
      fetch('/api/items')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setItems(data);
        })
        .catch(console.error);
    }
  }, [user, items.length, setItems]);

  // Fetch saved recipes and user profile in parallel
  useEffect(() => {
    if (!user) return;
    fetch('/api/recipes')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSavedRecipes(data); })
      .catch(console.error);

    const supabase = createClient();
    supabase
      .from('profiles')
      .select('dietary_preferences,cuisine_preferences,cooking_skill')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }
        if (data) setUserProfile(data as unknown as UserProfile);
      });
  }, [user]);

  const pantryNames = items.map((i) => i.name);
  const expiringNames = items
    .filter((i) => {
      const status = getExpiryStatus(i.days_until_expiry);
      return status === 'critical' || status === 'warning';
    })
    .map((i) => i.name);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSaveRecipe = async (recipe: Recipe, msgId: string) => {
    setSavingRecipeId(msgId);
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      });
      if (res.ok) {
        const saved = await res.json();
        setSavedRecipes((prev) => [saved, ...prev]);
        setSavedMsgIds((prev) => new Set(prev).add(msgId));
        addToast('Recipe saved!', 'success');
      } else {
        throw new Error('Save failed');
      }
    } catch {
      addToast('Failed to save recipe. Please try again.', 'error');
    }
    setSavingRecipeId(null);
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
      addToast('Recipe removed', 'info');
    } catch {
      addToast('Failed to remove recipe. Please try again.', 'error');
    }
  };

  const handleSend = async (message?: string) => {
    const text = message || input;
    if (!text.trim() || isStreaming) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    addChatMessage(userMsg);

    setIsStreaming(true);

    try {
      const res = await fetch('/api/cook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          pantryItems: pantryNames,
          expiringItems: expiringNames,
          dietaryPrefs: userProfile?.dietary_preferences ?? [],
          cuisinePrefs: userProfile?.cuisine_preferences ?? [],
          cookingSkill: userProfile?.cooking_skill ?? 'intermediate',
        }),
      });

      if (!res.ok) throw new Error('Failed to generate recipe');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      addChatMessage(assistantMsg);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          fullText += chunk;

          // Split reasoning (text before the JSON block) from the JSON itself
          const jsonStart = fullText.indexOf('{');
          const reasoning = jsonStart > 0 ? fullText.slice(0, jsonStart).trim() : '';
          const jsonPart = jsonStart >= 0 ? fullText.slice(jsonStart) : '';

          usePantryStore.setState((s) => ({
            chatHistory: s.chatHistory.map((msg) =>
              msg.id === assistantMsg.id
                ? { ...msg, content: jsonPart, reasoning }
                : msg
            ),
          }));
        }
      }

      // Try to parse the final recipe JSON
      try {
        const jsonStart = fullText.indexOf('{');
        if (jsonStart >= 0) {
          const recipe = JSON.parse(fullText.slice(jsonStart)) as Recipe;
          usePantryStore.setState((s) => ({
            chatHistory: s.chatHistory.map((msg) =>
              msg.id === assistantMsg.id ? { ...msg, recipe } : msg
            ),
          }));
        }
      } catch {
        // Not valid JSON yet or no recipe — display as plain text
      }
    } catch (error) {
      console.error(error);
      addToast('Failed to generate recipe. Please try again.', 'error');
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I had trouble generating a recipe. Please try again.',
        timestamp: new Date(),
      };
      addChatMessage(errorMsg);
    }

    setIsStreaming(false);
  };

  const RecipeCard = ({ recipe, msgId }: { recipe: Recipe; msgId?: string }) => {
    const isSaved = msgId ? savedMsgIds.has(msgId) : false;

    const getBlinkitLink = (itemName: string) => {
      const lower = itemName.toLowerCase();
      const match = Object.keys(BLINKIT_LINKS).find(key => lower.includes(key));
      return match ? BLINKIT_LINKS[match] : null;
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-card-solid p-5 mt-3"
      >
        <div className="flex items-start justify-between mb-3">
          <h3
            className="text-lg font-semibold"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {recipe.title}
          </h3>
          <div className="flex gap-1">
            {msgId && (
              <button
                onClick={() => !isSaved && handleSaveRecipe(recipe, msgId)}
                disabled={savingRecipeId === msgId || isSaved}
                className={`p-1.5 rounded hover:bg-[var(--canvas-deep)] transition-colors ${
                  isSaved ? 'text-[var(--pp-accent-safe)]' : 'text-[var(--pp-accent-gold)]'
                }`}
                title={isSaved ? 'Saved!' : 'Save recipe'}
              >
                {isSaved ? (
                  <BookmarkCheck className="w-4 h-4" />
                ) : savingRecipeId === msgId ? (
                  <Sparkles className="w-4 h-4 animate-pulse" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {recipe.description && (
          <p className="text-sm text-[var(--ink-muted)] italic mb-3">{recipe.description}</p>
        )}

        <div className="flex gap-4 mb-4 text-xs text-[var(--ink-faint)]">
          {recipe.cookTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {recipe.cookTime} min
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {recipe.servings} servings
            </span>
          )}
        </div>

        {recipe.expiringUsed && recipe.expiringUsed.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-[var(--pp-accent-warm)] font-medium mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Using expiring items:
            </p>
            <div className="flex flex-wrap gap-1">
              {recipe.expiringUsed.map((item, i) => (
                <Badge key={i} className="expiry-warning text-xs">{item}</Badge>
              ))}
            </div>
          </div>
        )}

        {recipe.ingredients && (
          <div className="mb-3">
            <p className="text-xs font-medium text-[var(--ink-muted)] uppercase tracking-wider mb-2">Ingredients</p>
            <ul className="space-y-1">
              {recipe.ingredients.map((ing, i) => {
                const isMissing = !pantryNames.some(p => ing.item.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(ing.item.toLowerCase()));
                const blinkitLink = isMissing ? getBlinkitLink(ing.item) : null;
                
                return (
                  <li key={i} className="text-sm flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${isMissing ? 'bg-[var(--pp-accent-warm)]' : 'bg-[var(--pp-accent-safe)]'}`} />
                      <span className={isMissing ? 'text-[var(--ink-muted)] italic' : ''}>
                        {ing.amount} {ing.item}
                      </span>
                    </div>
                    {blinkitLink && (
                      <a 
                        href={blinkitLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--pp-accent-gold)]/10 text-[var(--pp-accent-gold)] hover:bg-[var(--pp-accent-gold)]/20 transition-colors border border-[var(--pp-accent-gold)]/20"
                      >
                        <ShoppingCart className="w-2.5 h-2.5" /> Buy on Blinkit
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {recipe.steps && (
          <div className="mb-3">
            <p className="text-xs font-medium text-[var(--ink-muted)] uppercase tracking-wider mb-2">Steps</p>
            <ol className="space-y-2">
              {recipe.steps.map((step, i) => (
                <li key={i} className="text-sm flex gap-3">
                  <span className="font-semibold text-[var(--pp-accent-navy)] shrink-0">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {recipe.tip && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--canvas-deep)] mt-3">
            <Lightbulb className="w-4 h-4 text-[var(--pp-accent-gold)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--ink-muted)]">{recipe.tip}</p>
          </div>
        )}
      </motion.div>
    );
  };

  const SavedRecipeCard = ({ recipe }: { recipe: SavedRecipe }) => {
    const recipeForCard: Recipe = {
      ...recipe,
      cookTime: recipe.cook_time_minutes || recipe.cookTime,
      steps: recipe.instructions ? recipe.instructions.split('\n').filter(Boolean) : recipe.steps,
      expiringUsed: recipe.tags || [],
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="glass-card-solid p-5 relative"
      >
        <button
          onClick={() => handleDeleteRecipe(recipe.id)}
          className="absolute top-3 right-3 p-1.5 rounded hover:bg-[var(--canvas-deep)] text-[var(--ink-faint)] hover:text-[var(--pp-accent-warm)] transition-colors"
          title="Remove from saved"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <h3
          className="text-lg font-semibold mb-1 pr-8"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {recipeForCard.title}
        </h3>

        {recipeForCard.description && (
          <p className="text-sm text-[var(--ink-muted)] italic mb-3">{recipeForCard.description}</p>
        )}

        <div className="flex gap-4 mb-4 text-xs text-[var(--ink-faint)]">
          {recipeForCard.cookTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {recipeForCard.cookTime} min
            </span>
          )}
          {recipeForCard.servings && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {recipeForCard.servings} servings
            </span>
          )}
          <span className="text-[var(--ink-faint)]">
            Saved {new Date(recipe.generated_at).toLocaleDateString()}
          </span>
        </div>

        {recipeForCard.ingredients && (
          <div className="mb-3">
            <p className="text-xs font-medium text-[var(--ink-muted)] uppercase tracking-wider mb-2">Ingredients</p>
            <ul className="space-y-1">
              {recipeForCard.ingredients.map((ing, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--pp-accent-safe)]" />
                  {ing.amount} {ing.item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recipeForCard.steps && (
          <div className="mb-3">
            <p className="text-xs font-medium text-[var(--ink-muted)] uppercase tracking-wider mb-2">Steps</p>
            <ol className="space-y-2">
              {recipeForCard.steps.map((step, i) => (
                <li key={i} className="text-sm flex gap-3">
                  <span className="font-semibold text-[var(--pp-accent-navy)] shrink-0">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {recipeForCard.tip && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--canvas-deep)] mt-3">
            <Lightbulb className="w-4 h-4 text-[var(--pp-accent-gold)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--ink-muted)]">{recipeForCard.tip}</p>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen pt-20 pb-4 flex flex-col max-w-5xl mx-auto px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-end justify-between"
      >
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            What Can I Cook?
          </h1>
          <p className="text-[var(--ink-muted)] text-sm">
            AI recipes using only your pantry items • {pantryNames.length} ingredients available
            {userProfile?.dietary_preferences?.length ? ` • ${userProfile.dietary_preferences.join(', ')}` : ''}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => setShowSaved(!showSaved)}
          className={`border-[var(--pp-border)] gap-1.5 ${
            showSaved ? 'bg-[var(--pp-accent-navy)] text-white' : ''
          }`}
        >
          <BookmarkCheck className="w-4 h-4" />
          Saved ({savedRecipes.length})
        </Button>
      </motion.div>

      {/* Saved Recipes Panel */}
      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-semibold"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Saved Recipes
                </h2>
                <button
                  onClick={() => setShowSaved(false)}
                  className="p-1.5 rounded hover:bg-[var(--canvas-deep)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {savedRecipes.length === 0 ? (
                <p className="text-sm text-[var(--ink-faint)] text-center py-6">
                  No saved recipes yet. Click the <Bookmark className="w-3.5 h-3.5 inline" /> icon on any recipe to save it!
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
                  <AnimatePresence>
                    {savedRecipes.map((recipe) => (
                      <SavedRecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Left: Ingredient chips */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:w-[35%] glass-card p-4 overflow-y-auto max-h-[60vh] lg:max-h-none"
        >
          <h3
            className="text-sm font-semibold text-[var(--ink-muted)] uppercase tracking-wider mb-3"
          >
            Your Ingredients
          </h3>
          {expiringNames.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-[var(--pp-accent-warm)] font-medium mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Expiring Soon
              </p>
              <div className="flex flex-wrap gap-1.5">
                {expiringNames.map((name) => (
                  <Badge key={name} className="expiry-warning text-xs cursor-pointer hover:opacity-80">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {pantryNames
              .filter((n) => !expiringNames.includes(n))
              .map((name) => (
                <Badge key={name} variant="secondary" className="text-xs cursor-pointer hover:opacity-80">
                  {name}
                </Badge>
              ))}
          </div>
          {pantryNames.length === 0 && (
            <p className="text-sm text-[var(--ink-faint)] text-center py-8">
              Add items to your pantry first
            </p>
          )}
        </motion.div>

        {/* Right: Chat */}
        <div className="lg:w-[65%] flex flex-col glass-card overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <ChefHat className="w-16 h-16 text-[var(--ink-faint)] mb-4 opacity-30" />
                <p
                  className="text-lg text-[var(--ink-muted)] mb-6"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Ask me what to cook!
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      className="text-left p-3 rounded-lg bg-[var(--canvas-deep)] hover:bg-[var(--pp-surface)] text-sm transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div key={msg.id}>
                  <div
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-lg text-sm ${
                        msg.role === 'user'
                          ? 'bg-[var(--pp-accent-navy)] text-white rounded-br-sm'
                          : 'bg-[var(--canvas-deep)] rounded-bl-sm'
                      }`}
                    >
                      {msg.role === 'assistant' && !msg.recipe ? (
                        <div className="whitespace-pre-wrap">{msg.content || (isStreaming ? '...' : '')}</div>
                      ) : msg.role === 'user' ? (
                        msg.content
                      ) : null}
                    </div>
                  </div>
                  {/* Reasoning note — shown while streaming and after */}
                  {msg.role === 'assistant' && msg.reasoning && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 flex items-start gap-2 px-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[var(--pp-accent-gold)] shrink-0 mt-0.5" />
                      <p className="text-xs text-[var(--ink-muted)] italic leading-relaxed">
                        {msg.reasoning}
                      </p>
                    </motion.div>
                  )}
                  {msg.recipe && <RecipeCard recipe={msg.recipe} msgId={msg.id} />}
                </div>
              ))
            )}
            {isStreaming && (
              <div className="flex items-center gap-2 text-sm text-[var(--ink-faint)]">
                <Sparkles className="w-4 h-4 animate-pulse text-[var(--pp-accent-gold)]" />
                Cooking up something...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[var(--pp-border)]">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="What should I cook today?"
                disabled={isStreaming}
                className="bg-[var(--canvas-deep)] border-[var(--pp-border)]"
              />
              <Button
                onClick={() => handleSend()}
                disabled={isStreaming || !input.trim()}
                size="icon"
                className="bg-[var(--pp-accent-navy)] hover:bg-[var(--pp-accent-navy)]/90 shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Toaster toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
