import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotificationStore } from '@/stores/notification.store';
import { NotificationItem } from '@/components/shared/NotificationItem';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HospitalNotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAllAsRead,
  } = useNotificationStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem notification={item} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#C62828']} />
        }
        ListHeaderComponent={
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center flex-1">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 items-center justify-center rounded-full mr-2 bg-surface border border-border"
              >
                <Feather name="chevron-left" size={24} color="#1A1A1A" />
              </Pressable>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-text-primary">Notifications</Text>
                {unreadCount > 0 && (
                  <Text className="text-sm text-text-secondary mt-0.5">
                    You have {unreadCount} unread message{unreadCount > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            </View>

            {unreadCount > 0 && (
              <Pressable
                onPress={handleMarkAllRead}
                className="px-3 py-1.5 rounded-full bg-primary-light"
              >
                <Text className="text-xs font-semibold text-white">Mark all read</Text>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#C62828" />
            </View>
          ) : (
            <View className="items-center justify-center py-20">
              <View className="w-16 h-16 rounded-full bg-surface border border-border items-center justify-center shadow shadow-black/5">
                <Feather name="bell-off" size={28} color="#BDBDBD" />
              </View>
              <Text className="text-lg font-semibold text-text-primary mt-4">All caught up!</Text>
              <Text className="text-sm text-text-secondary text-center mt-2 px-8">
                You have no notifications right now.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
