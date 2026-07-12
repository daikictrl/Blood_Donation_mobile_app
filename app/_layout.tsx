import '../global.css';
import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import { View, LogBox } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';

// Silently ignore push notification warnings and other harmless development logs
LogBox.ignoreLogs([
  'Failed to register push token',
  'Error upserting push token',
  'Failed to unregister push token',
  'expo-notifications',
  'DeviceEventEmitter',
]);

function RootLayoutNav() {
  const { session, role, isLoading } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const activeGroup = segments[0];
    const inAuthGroup = activeGroup === '(auth)';
    const inDonorGroup = activeGroup === '(donor)';
    const inHospitalGroup = activeGroup === '(hospital)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && role === 'donor' && (inAuthGroup || inHospitalGroup)) {
      router.replace('/(donor)/feed');
    } else if (session && role === 'hospital' && (inAuthGroup || inDonorGroup)) {
      router.replace('/(hospital)/requests');
    } else if (session && !role && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [session, role, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(donor)" />
      <Stack.Screen name="(hospital)" />
    </Stack>
  );
}

export default function RootLayout() {
  const { setSession, setRole, setLoading } = useAuthStore();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    let active = true;
    let initialSessionHandled = false;

    // Safety timeout: if auth initialization hangs for any reason (network
    // issues, SecureStore read stall, etc.), force-release the loading state
    // after 10 seconds so the user is never stuck on an infinite spinner.
    const safetyTimeout = setTimeout(() => {
      if (active && useAuthStore.getState().isLoading) {
        console.warn('Auth initialization timed out — forcing loading to false');
        setLoading(false);
      }
    }, 10_000);

    async function initializeAuth() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!active) return;
        initialSessionHandled = true;
        setSession(session);

        if (session) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (!active) return;
            if (error) throw error;
            setRole(data?.role ?? null);
          } catch (profileErr) {
            console.log('Failed to fetch user role on startup:', profileErr);
            if (active) {
              setRole(null);
            }
          }
        } else {
          if (active) {
            setRole(null);
          }
        }
      } catch (err) {
        console.log('Failed to retrieve session on startup:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Listen for auth state changes AFTER initial session.
    // The INITIAL_SESSION event is skipped because initializeAuth() already
    // handles it via getSession(). Processing it twice caused a race condition
    // where the listener re-set isLoading=true while initializeAuth was
    // finishing, leaving the spinner stuck.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!active) return;

        // Skip the INITIAL_SESSION event — it's already handled above.
        // Also skip if initializeAuth hasn't finished yet to avoid races.
        if (event === 'INITIAL_SESSION' || !initialSessionHandled) return;

        setSession(session);

        if (session) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (!active) return;
            if (error) throw error;
            setRole(data?.role ?? null);
          } catch (profileErr) {
            console.log('Failed to fetch user role on auth change:', profileErr);
            if (active) {
              setRole(null);
            }
          }
        } else {
          if (active) {
            setRole(null);
          }
        }
      }
    );

    return () => {
      active = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  if (!fontsLoaded) return <View className="flex-1 bg-background" />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <RootLayoutNav />
    </GestureHandlerRootView>
  );
}
