'use client';

import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { Toast } from '@/hooks/useToast';

const icons = {
  success: <CheckCircle className="w-4 h-4 shrink-0 text-[var(--pp-accent-safe)]" />,
  error: <XCircle className="w-4 h-4 shrink-0 text-[var(--pp-accent-warm)]" />,
  info: <Info className="w-4 h-4 shrink-0 text-[var(--pp-accent-navy)]" />,
};

const borders = {
  success: 'border-[var(--pp-accent-safe)]/30',
  error: 'border-[var(--pp-accent-warm)]/30',
  info: 'border-[var(--pp-accent-navy)]/30',
};

interface ToasterProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export function Toaster({ toasts, removeToast }: ToasterProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl glass-card-solid border ${borders[toast.type]} max-w-sm shadow-lg`}
          >
            {icons[toast.type]}
            <p className="text-sm flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-0.5 rounded hover:bg-[var(--canvas-deep)] text-[var(--ink-faint)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
