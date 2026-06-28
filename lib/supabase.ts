import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Detect SSR/Node.js environment where native modules are unavailable
const isServer = typeof window === 'undefined';

const CHUNK_SIZE = 2000;

// SSR-safe chunked storage adapter: SecureStore native module is unavailable during
// static rendering (Node.js) — fall back to no-op storage on the server.
// Splits values larger than CHUNK_SIZE into multiple safe-sized keys to bypass
// Android's 2048-byte limitation in Expo SecureStore.
const ChunkedSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (isServer) return null;
    try {
      const value = await SecureStore.getItemAsync(key);
      if (!value) return null;

      if (value.startsWith('chunked:')) {
        const count = parseInt(value.split(':')[1], 10);
        let concatenated = '';
        for (let i = 0; i < count; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
          if (!chunk) return null;
          concatenated += chunk;
        }
        return concatenated;
      }

      return value;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isServer) return;
    try {
      // Remove any existing chunks first
      const oldValue = await SecureStore.getItemAsync(key);
      if (oldValue && oldValue.startsWith('chunked:')) {
        const count = parseInt(oldValue.split(':')[1], 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
      }

      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value);
      } else {
        const chunks = [];
        for (let i = 0; i < value.length; i += CHUNK_SIZE) {
          chunks.push(value.substring(i, i + CHUNK_SIZE));
        }

        // Store the metadata describing number of chunks
        await SecureStore.setItemAsync(key, `chunked:${chunks.length}`);

        // Store the chunks
        for (let i = 0; i < chunks.length; i++) {
          await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
        }
      }
    } catch {
      // Silently fail on error
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (isServer) return;
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value && value.startsWith('chunked:')) {
        const count = parseInt(value.split(':')[1], 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Silently fail on error
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ChunkedSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});
