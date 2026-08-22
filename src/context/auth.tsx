import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Logger } from '@/lib/logger';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Logger.debug('Initializing AuthProvider: Fetching session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        Logger.error('Error fetching session:', error);
      } else {
        Logger.info('Session fetched successfully.', { user: session?.user?.id });
      }
      setSession(session);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((event, session) => {
      Logger.info(`Auth state changed: ${event}`, { user: session?.user?.id });
      setSession(session);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
