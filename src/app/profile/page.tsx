'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useAuth } from '@/components/layout/AuthProvider';
import { UserProfile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { Save, Check, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

import { Checkbox } from '@/components/ui/checkbox';

const DIETARY_OPTIONS = ['Vegan', 'Vegetarian', 'Keto', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal', 'Kosher'];
const CUISINE_OPTIONS = ['Indian', 'Mediterranean', 'Asian', 'Italian', 'Mexican', 'American', 'Japanese', 'Thai', 'Chinese', 'French', 'Middle Eastern'];
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

function ProfileContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setProfile(data as unknown as UserProfile);
        else setProfile({ id: user.id, full_name: '', dietary_preferences: [], cuisine_preferences: [], cooking_skill: 'intermediate', household_size: 2, has_air_fryer: false, has_instant_pot: false });
      });
  }, [user]);

  const toggleArray = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const handleSave = async () => {
    if (!profile || !user) return;
    setIsSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('profiles').upsert({
      id: user.id,
      full_name: profile.full_name,
      dietary_preferences: profile.dietary_preferences,
      cuisine_preferences: profile.cuisine_preferences,
      cooking_skill: profile.cooking_skill,
      household_size: profile.household_size,
      has_air_fryer: profile.has_air_fryer,
      has_instant_pot: profile.has_instant_pot,
    });
    setIsSaving(false);
    setSaved(true);
    
    if (isOnboarding) {
      setTimeout(() => {
        router.push('/pantry');
      }, 1000);
    } else {
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (!profile) return <div className="min-h-screen pt-20 flex items-center justify-center"><div className="animate-pulse text-[var(--ink-faint)]">Loading...</div></div>;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        {isOnboarding ? (
          <>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              Welcome to PantryPulse! <Sparkles className="w-6 h-6 text-[var(--pp-accent-gold)] animate-pulse" />
            </h1>
            <p className="text-[var(--ink-muted)] text-lg">Let&apos;s set up your kitchen preferences to get started.</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>Your Profile</h1>
            <p className="text-[var(--ink-muted)]">Personalize your cooking experience</p>
          </>
        )}
      </motion.div>

      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Basics</h2>
          <div className="space-y-4">
            <div><Label>Full Name</Label><Input value={profile.full_name || ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="bg-[var(--canvas-deep)]" /></div>
            <div><Label>Household Size</Label><Input type="number" min="1" value={profile.household_size} onChange={(e) => setProfile({ ...profile, household_size: parseInt(e.target.value) || 1 })} className="bg-[var(--canvas-deep)] w-24" /></div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Dietary Preferences</h2>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((opt) => (
              <button key={opt} onClick={() => setProfile({ ...profile, dietary_preferences: toggleArray(profile.dietary_preferences, opt.toLowerCase()) })}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${profile.dietary_preferences.includes(opt.toLowerCase()) ? 'bg-[var(--pp-accent-navy)] text-white border-[var(--pp-accent-navy)]' : 'border-[var(--pp-border)] hover:bg-[var(--canvas-deep)]'}`}>
                {opt}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Cuisine Preferences</h2>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((opt) => (
              <button key={opt} onClick={() => setProfile({ ...profile, cuisine_preferences: toggleArray(profile.cuisine_preferences, opt.toLowerCase()) })}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${profile.cuisine_preferences.includes(opt.toLowerCase()) ? 'bg-[var(--pp-accent-gold)] text-white border-[var(--pp-accent-gold)]' : 'border-[var(--pp-border)] hover:bg-[var(--canvas-deep)]'}`}>
                {opt}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Cooking Skill</h2>
          <div className="flex gap-3">
            {SKILL_LEVELS.map((level) => (
              <button key={level} onClick={() => setProfile({ ...profile, cooking_skill: level })}
                className={`flex-1 py-3 rounded-lg text-sm font-medium capitalize transition-all ${profile.cooking_skill === level ? 'bg-[var(--pp-accent-navy)] text-white' : 'bg-[var(--canvas-deep)] hover:bg-[var(--pp-surface)]'}`}>
                {level}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Appliances</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={profile.has_air_fryer} onCheckedChange={(checked: boolean) => setProfile({ ...profile, has_air_fryer: checked })} />
              <span className="text-sm">Air Fryer</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={profile.has_instant_pot} onCheckedChange={(checked: boolean) => setProfile({ ...profile, has_instant_pot: checked })} />
              <span className="text-sm">Instant Pot / Pressure Cooker</span>
            </label>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Button onClick={handleSave} disabled={isSaving} className="w-full bg-[var(--pp-accent-navy)] hover:bg-[var(--pp-accent-navy)]/90 py-6 text-base" style={{ fontFamily: 'var(--font-display)' }}>
            {isSaving ? (
              'Saving...'
            ) : saved ? (
              <><Check className="w-4 h-4 mr-2" /> Saved!</>
            ) : isOnboarding ? (
              'Complete Setup & Get Started'
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Preferences</>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-20 flex items-center justify-center"><div className="animate-pulse text-[var(--ink-faint)]">Loading...</div></div>}>
      <ProfileContent />
    </Suspense>
  );
}
