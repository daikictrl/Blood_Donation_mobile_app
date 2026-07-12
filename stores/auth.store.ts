import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import { unregisterPushToken } from '@/lib/notifications';
import { useDonorStore } from '@/stores/donor.store';
import { useHospitalStore } from '@/stores/hospital.store';
import { useNotificationStore } from '@/stores/notification.store';

interface AuthStore {
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
  error: string | null;
  setSession: (session: Session | null) => void;
  setRole: (role: UserRole | null) => void;
  setLoading: (val: boolean) => void;
  setError: (error: string | null) => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyAndResetPassword: (email: string, token: string, password: string) => Promise<void>;
  fetchRole: (userId: string) => Promise<void>;
  clearError: () => void;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  role: null,
  isLoading: true,
  error: null,

  setSession: (session) => set({ session }),
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  signUp: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'donor',
          },
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'An error occurred during registration') });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.session.user.id)
          .single();

        if (profileError) throw profileError;

        set({
          session: data.session,
          role: profileData?.role ?? null,
        });
      }
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'An error occurred during login') });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      // Unregister push token before signing out to prevent cross-session notifications
      await unregisterPushToken().catch((err) => {
        console.log('Failed to unregister push token on sign out:', err);
      });

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Reset all domain stores to clear in-memory data and subscriptions
      useDonorStore.getState().clearProfile();
      useHospitalStore.getState().clearProfile();
      useNotificationStore.getState().reset();

      set({ session: null, role: null });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'An error occurred during logout') });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'An error occurred during password reset request') });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  verifyAndResetPassword: async (email, token, password) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Verify the recovery OTP
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });
      if (verifyError) throw verifyError;

      if (!verifyData.session) {
        throw new Error('Failed to verify OTP code.');
      }

      // 2. Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;

      // 3. Fetch user profile role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', verifyData.session.user.id)
        .single();

      if (profileError) throw profileError;

      // 4. Update the session and role in the store to trigger navigation redirect
      set({
        session: verifyData.session,
        role: profileData?.role ?? null,
      });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'An error occurred during password reset') });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRole: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      set({ role: data?.role ?? null });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Failed to fetch user role') });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
