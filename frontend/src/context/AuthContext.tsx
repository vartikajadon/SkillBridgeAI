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
      if (initialSession) {
        setSession(initialSession);
        setSupabaseUser(initialSession?.user ?? null);
        fetchProfile(initialSession).finally(() => {
          setLoading(false);
        });
      } else {
        // Fallback: check for locally persisted mock session
        const stored = localStorage.getItem('skillbridge_mock_session');
        if (stored) {
          try {
            const parsedSession = JSON.parse(stored);
            setSession(parsedSession);
            fetchProfile(parsedSession).finally(() => {
              setLoading(false);
            });
            return;
          } catch {
            localStorage.removeItem('skillbridge_mock_session');
          }
        }
        setSession(null);
        setSupabaseUser(null);
        setUser(null);
        setLoading(false);
      }
    });

    // 2. Non-blocking auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) {
        setSession(newSession);
        setSupabaseUser(newSession?.user ?? null);
        fetchProfile(newSession);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    // 1. If live Supabase URL is provided, attempt official sign-in
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const isLiveSupabase = supabaseUrl && !supabaseUrl.includes('placeholder');

    if (isLiveSupabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!error && data.session) {
          setSession(data.session);
          setSupabaseUser(data.session.user);
          await fetchProfile(data.session);
          return { error: null };
        }
        if (error) {
          return { error: new Error(error.message) };
        }
      } catch {
        // Fall through to mock-login endpoint
      }
    }

    // 2. Local mock login fallback (for offline/local development without Supabase)
    try {
      const res = await fetch('/api/v1/auth/mock-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        if (res.status === 502 || res.status === 504 || res.status === 500) {
          return {
            error: new Error(
              errJson?.detail ||
                `Backend server unreachable (HTTP ${res.status}). Please make sure FastAPI backend is running on http://127.0.0.1:8000.`
            ),
          };
        }
        return {
          error: new Error(
            errJson?.detail ||
              'Invalid credentials. Please use one of the quick mock logins (e.g. learner.patel@skillbridge.gov.in / password123).'
          ),
        };
      }

      const data = await res.json();
      const mockSession: any = {
        access_token: data.access_token,
        token_type: 'bearer',
        expires_in: 86400 * 30,
        refresh_token: data.access_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          aud: 'authenticated',
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      };

      setSession(mockSession);
      setUser(data.user);
      localStorage.setItem('skillbridge_mock_session', JSON.stringify(mockSession));
      setProfileIncomplete(false);
      return { error: null };
    } catch (err: unknown) {
      return {
        error: new Error(
          'Cannot connect to backend server at http://127.0.0.1:8000. Please start the backend in a terminal with: python -m uvicorn app.main:app --port 8000'
        ),
      };
    }
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
    localStorage.removeItem('skillbridge_mock_session');
    try {
      await supabase.auth.signOut();
    } catch {}
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
