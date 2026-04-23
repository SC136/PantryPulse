'use client';
import { createContext, useState, useEffect, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

type AuthContextType = { user: User | null; isLoading: boolean };
const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);
  const supabase = createClient();

  useEffect(() => {
    setUser(initialUser);
    setIsLoading(false);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [initialUser, supabase.auth]);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
