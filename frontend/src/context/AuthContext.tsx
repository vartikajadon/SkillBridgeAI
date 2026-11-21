import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'learner' | 'trainer' | 'admin';
  department: string | null;
  designation: string | null;
  employee_id: string | null;
  job_role_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileCreateData {
  full_name: string;
  department?: string;
  designation?: string;
  employee_id?: string;
}

export interface ProfileUpdateData {
  full_name?: string;
  department?: string;
  designation?: string;
}

interface AuthContextType {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  user: UserProfile | null;
  loading: boolean;
  profileIncomplete: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  signup: (email: string, password: string, profileData: ProfileCreateData) => Promise<{ error: Error | null; emailConfirmationRequired: boolean }>;
  completeProfile: (profileData: ProfileCreateData) => Promise<{ error: Error | null }>;
  updateProfile: (profileData: ProfileUpdateData) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [profileIncomplete, setProfileIncomplete] = useState<boolean>(false);

  const fetchProfile = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.access_token) {
      setUser(null);
      setProfileIncomplete(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (response.status === 200) {
        const profile: UserProfile = await response.json();
        setUser(profile);
        setProfileIncomplete(false);
      } else if (response.status === 404) {
        // Supabase Auth identity exists, but application profile row not yet created
        setUser(null);
        setProfileIncomplete(true);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setSupabaseUser(initialSession?.user ?? null);
      fetchProfile(initialSession).finally(() => {
        setLoading(false);
      });
    });

    // 2. Non-blocking auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setSupabaseUser(newSession?.user ?? null);
      // Fetch profile asynchronously without deadlocking the callback
      fetchProfile(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { error: new Error(error.message) };
    }
    if (data.session) {
      setSession(data.session);
      setSupabaseUser(data.session.user);
      await fetchProfile(data.session);
    }
    return { error: null };
  };

  const completeProfile = async (profileData: ProfileCreateData) => {
    if (!session?.access_token) {
      return { error: new Error('No active authentication session. Please sign in again.') };
    }

    try {
      const response = await fetch('/api/v1/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: new Error(errorData.detail || `Profile creation failed (HTTP ${response.status})`) };
      }

      const created: UserProfile = await response.json();
      setUser(created);
      setProfileIncomplete(false);
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Network error completing profile') };
    }
  };

  const signup = async (email: string, password: string, profileData: ProfileCreateData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { error: new Error(error.message), emailConfirmationRequired: false };
    }

    if (data.session) {
      setSession(data.session);
      setSupabaseUser(data.session.user);
      const res = await completeProfile(profileData);
      return { error: res.error, emailConfirmationRequired: false };
    }

    // Email confirmation required case
    return { error: null, emailConfirmationRequired: true };
  };

  const updateProfile = async (profileData: ProfileUpdateData) => {
    if (!session?.access_token) {
      return { error: new Error('Not authenticated') };
    }

    try {
      const response = await fetch('/api/v1/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: new Error(errorData.detail || 'Profile update failed') };
      }

      const updated: UserProfile = await response.json();
      setUser(updated);
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Network error updating profile') };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setSupabaseUser(null);
    setUser(null);
    setProfileIncomplete(false);
  };

  const refreshProfile = async () => {
    await fetchProfile(session);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        supabaseUser,
        user,
        loading,
        profileIncomplete,
        login,
        signup,
        completeProfile,
        updateProfile,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
