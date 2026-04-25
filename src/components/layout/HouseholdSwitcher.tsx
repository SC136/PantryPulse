'use client';

import { useState } from 'react';
import { useHouseholdStore } from '@/store/household';
import { useAuth } from '@/components/layout/AuthProvider';
import { Home, ChevronDown, Plus, UserPlus, Copy, Check } from 'lucide-react';
import { Household } from '@/types';

/**
 * Dropdown for switching between households + creating new + inviting members.
 * Rendered inside the Navbar.
 */
export function HouseholdSwitcher() {
  const { user } = useAuth();
  const { households, activeHouseholdId, setActiveHouseholdId, addHousehold } =
    useHouseholdStore();

  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [newName, setNewName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [joinUrl, setJoinUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user || households.length === 0) return null;

  const activeHousehold = households.find((h) => h.id === activeHouseholdId);

  const handleSwitch = (id: string) => {
    setActiveHouseholdId(id);
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (data.id) {
        addHousehold(data as Household);
        setActiveHouseholdId(data.id);
        setNewName('');
        setShowCreate(false);
        setOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !activeHouseholdId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/households/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_id: activeHouseholdId,
          email: inviteEmail,
        }),
      });
      const data = await res.json();
      if (data.joinUrl) {
        setJoinUrl(data.joinUrl);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => {
          setOpen(!open);
          setShowCreate(false);
          setShowInvite(false);
          setJoinUrl('');
        }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--pp-surface-glass)] transition-all"
      >
        <Home className="w-4 h-4" />
        <span className="max-w-[120px] truncate">
          {activeHousehold?.name ?? 'Household'}
        </span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 glass-card-solid border border-[var(--pp-border)] rounded-xl shadow-lg z-50 p-2">
          {/* Household list */}
          {!showCreate && !showInvite && (
            <>
              <p className="text-xs text-[var(--ink-faint)] px-2 py-1 uppercase tracking-wider">
                Your Households
              </p>
              {households.map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleSwitch(h.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    h.id === activeHouseholdId
                      ? 'bg-[var(--pp-surface)] text-[var(--ink)] font-medium'
                      : 'text-[var(--ink-muted)] hover:bg-[var(--canvas-deep)]'
                  }`}
                >
                  {h.name}
                </button>
              ))}
              <div className="border-t border-[var(--pp-border)] mt-1 pt-1 space-y-0.5">
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--ink-muted)] hover:bg-[var(--canvas-deep)] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Create Household
                </button>
                <button
                  onClick={() => setShowInvite(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--ink-muted)] hover:bg-[var(--canvas-deep)] transition-colors"
                >
                  <UserPlus className="w-4 h-4" /> Invite Member
                </button>
              </div>
            </>
          )}

          {/* Create household form */}
          {showCreate && (
            <div className="p-2 space-y-3">
              <p className="text-sm font-medium">New Household</p>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Household name"
                className="w-full px-3 py-2 rounded-lg bg-[var(--canvas-deep)] border border-[var(--pp-border)] text-sm outline-none focus:ring-1 focus:ring-[var(--pp-accent-navy)]"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm bg-[var(--canvas-deep)] text-[var(--ink-muted)] hover:bg-[var(--pp-surface)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || !newName.trim()}
                  className="flex-1 px-3 py-2 rounded-lg text-sm bg-[var(--pp-accent-navy)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          )}

          {/* Invite member form */}
          {showInvite && (
            <div className="p-2 space-y-3">
              <p className="text-sm font-medium">
                Invite to {activeHousehold?.name}
              </p>
              {!joinUrl ? (
                <>
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Email address"
                    type="email"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--canvas-deep)] border border-[var(--pp-border)] text-sm outline-none focus:ring-1 focus:ring-[var(--pp-accent-navy)]"
                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowInvite(false)}
                      className="flex-1 px-3 py-2 rounded-lg text-sm bg-[var(--canvas-deep)] text-[var(--ink-muted)] hover:bg-[var(--pp-surface)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInvite}
                      disabled={loading || !inviteEmail.trim()}
                      className="flex-1 px-3 py-2 rounded-lg text-sm bg-[var(--pp-accent-navy)] text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {loading ? 'Sending…' : 'Send Invite'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Share this link with {inviteEmail}:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={joinUrl}
                      className="flex-1 px-3 py-2 rounded-lg bg-[var(--canvas-deep)] border border-[var(--pp-border)] text-xs outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      className="px-3 py-2 rounded-lg bg-[var(--pp-accent-navy)] text-white text-xs hover:opacity-90"
                    >
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setShowInvite(false);
                      setJoinUrl('');
                      setInviteEmail('');
                    }}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--canvas-deep)] text-[var(--ink-muted)] hover:bg-[var(--pp-surface)]"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
