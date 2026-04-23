'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/components/layout/AuthProvider';
import { usePantryStore } from '@/store/pantry';
import { ChatMessage, Recipe, getExpiryStatus } from '@/types';
import { generateId } from '@/lib/utils/formatting';
import {
  Send, ChefHat, Clock, Users, Lightbulb, AlertTriangle,
  Bookmark, Sparkles,
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

export default function CookPage() {
  const { user } = useAuth();
  const { items, chatHistory, addChatMessage } = usePantryStore();
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

          // Update the last assistant message
          usePantryStore.setState((s) => ({
            chatHistory: s.chatHistory.map((msg) =>
              msg.id === assistantMsg.id ? { ...msg, content: fullText } : msg
            ),
          }));
        }
      }

      // Try to parse recipe from the response
      try {
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const recipe = JSON.parse(jsonMatch[0]) as Recipe;
          usePantryStore.setState((s) => ({
            chatHistory: s.chatHistory.map((msg) =>
              msg.id === assistantMsg.id ? { ...msg, recipe } : msg
            ),
          }));
        }
      } catch {
        // Not a JSON recipe — that's fine, display as text
      }
    } catch (error) {
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



  const RecipeCard = ({ recipe }: { recipe: Recipe }) => (
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
          <button className="p-1.5 rounded hover:bg-[var(--canvas-deep)] text-[var(--pp-accent-gold)]">
            <Bookmark className="w-4 h-4" />
          </button>
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
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--pp-accent-safe)]" />
                {ing.amount} {ing.item}
              </li>
            ))}
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

  return (
    <div className="min-h-screen pt-20 pb-4 flex flex-col max-w-5xl mx-auto px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          What Can I Cook?
        </h1>
        <p className="text-[var(--ink-muted)] text-sm">
          AI recipes using only your pantry items • {pantryNames.length} ingredients available
        </p>
      </motion.div>

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
                  {msg.recipe && <RecipeCard recipe={msg.recipe} />}
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
    </div>
  );
}
