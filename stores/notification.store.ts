import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { AppNotification } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  realtimeChannel: RealtimeChannel | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  subscribeToNotifications: () => Promise<void>;
  unsubscribeFromNotifications: () => Promise<void>;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  realtimeChannel: null,

  fetchNotifications: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      set({ loading: true });

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error.message);
        set({ loading: false });
        return;
      }

      const unread = (data || []).filter((n) => !n.read).length;
      set({ notifications: data || [], unreadCount: unread, loading: false });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      const { notifications, unreadCount } = get();
      const targetNotif = notifications.find((n) => n.id === id);
      
      if (!targetNotif || targetNotif.read) return;

      // Optimistically update local state
      const updated = notifications.map((n) => 
        n.id === id ? { ...n, read: true } : n
      );
      set({
        notifications: updated,
        unreadCount: Math.max(0, unreadCount - 1),
      });

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) {
        console.error('Error syncing markAsRead to database:', error.message);
        // Rollback on error
        set({ notifications, unreadCount });
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async () => {
    const { notifications, unreadCount } = get();
    if (unreadCount === 0) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Optimistically update local state
      const updated = notifications.map((n) => ({ ...n, read: true }));
      set({ notifications: updated, unreadCount: 0 });

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', session.user.id)
        .eq('read', false);

      if (error) {
        console.error('Error syncing markAllAsRead to database:', error.message);
        // Rollback on error
        set({ notifications, unreadCount });
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  },

  subscribeToNotifications: async () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) return; // Already subscribed

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;

      const channel = supabase
        .channel(`public:notifications:user:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotif = payload.new as AppNotification;
            const { notifications, unreadCount } = get();

            // Double check if already added to avoid duplicates
            if (notifications.some(n => n.id === newNotif.id)) return;

            set({
              notifications: [newNotif, ...notifications],
              unreadCount: unreadCount + 1,
            });
          }
        )
        .subscribe((status) => {
          console.log(`Notification subscription status for ${userId}:`, status);
        });

      set({ realtimeChannel: channel });
    } catch (err) {
      console.error('Failed to subscribe to notifications realtime updates:', err);
    }
  },

  unsubscribeFromNotifications: async () => {
    const { realtimeChannel } = get();
    if (!realtimeChannel) return;

    try {
      await supabase.removeChannel(realtimeChannel);
      set({ realtimeChannel: null });
      console.log('Notification subscription channel removed.');
    } catch (err) {
      console.error('Failed to unsubscribe from notifications:', err);
    }
  },

  reset: () => {
    get().unsubscribeFromNotifications();
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      realtimeChannel: null,
    });
  },
}));
