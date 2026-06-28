import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior for when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions and register push token with Supabase
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Skipping push token registration: not running on a physical device.');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted. Skipping token registration.');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.log('Skipping push token registration: EAS Project ID not found (expected in local non-EAS development).');
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('No active session. Skipping token registration.');
      return null;
    }

    const { error } = await supabase
      .from('expo_push_tokens')
      .upsert(
        {
          user_id: session.user.id,
          token: token,
        },
        {
          onConflict: 'user_id,token',
        }
      );

    if (error) {
      console.error('Error upserting push token to database:', error);
      return null;
    }

    console.log('Push token successfully registered:', token);
    return token;
  } catch (error) {
    console.error('Failed to register push token:', error);
    return null;
  }
}

/**
 * Remove push token from Supabase on logout
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;

    // Check if permission is granted first. If not, we won't have a token to fetch.
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase
      .from('expo_push_tokens')
      .delete()
      .eq('user_id', session.user.id)
      .eq('token', token);

    if (error) {
      console.error('Error deleting push token on logout:', error);
    } else {
      console.log('Push token unregistered successfully.');
    }
  } catch (error) {
    console.error('Failed to unregister push token:', error);
  }
}
