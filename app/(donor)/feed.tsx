import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useDonorStore } from '@/stores/donor.store';
import { useNotificationStore } from '@/stores/notification.store';
import { registerPushToken } from '@/lib/notifications';
import { RequestCard } from '@/components/donor/RequestCard';

export default function DonorFeedScreen() {
  const {
    profile,
    requests,
    isLoading,
    error,
    fetchRequests,
    subscribeToRequests,
    unsubscribeFromRequests,
  } = useDonorStore();

  const {
    unreadCount,
    fetchNotifications,
    subscribeToNotifications,
    unsubscribeFromNotifications,
  } = useNotificationStore();

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Initial load and real-time subscription setup
  useEffect(() => {
    async function loadData() {
      try {
        await Promise.all([
          fetchRequests(),
          fetchNotifications(),
          registerPushToken().catch((err) =>
            console.log('Failed to register push token:', err)
          ),
        ]);
      } catch (err) {
        // Error is handled in the store's error state
      } finally {
        setInitialLoading(false);
      }
    }

    loadData();
    subscribeToRequests();
    subscribeToNotifications();

    return () => {
      unsubscribeFromRequests();
      unsubscribeFromNotifications();
    };
  }, [profile?.latitude, profile?.longitude]); // Re-run if user updates coordinates in profile tab

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchRequests();
    } catch (err) {
      // Error handled by store
    } finally {
      setRefreshing(false);
    }
  };

  const handleCardPress = (id: string) => {
    router.push(`/(donor)/request/${id}` as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Header Container */}
      <View className="px-4 pt-4 pb-3 bg-surface border-b border-border flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-text-primary">Blood Requests</Text>
          <Text className="text-xs text-text-secondary mt-0.5">
            {profile?.blood_group
              ? `Compatible with your type: ${profile.blood_group}`
              : 'Compatible blood requests near you'}
          </Text>
        </View>

        {/* Bell Icon with Dynamic Badge */}
        <Pressable
          onPress={() => router.push('/(donor)/notifications')}
          className="p-2 relative active:opacity-75"
        >
          <Feather name="bell" size={24} className="text-text-primary" />
          {unreadCount > 0 && (
            <View className="absolute right-1 top-1 bg-primary w-4.5 h-4.5 rounded-full items-center justify-center border border-surface">
              <Text className="text-[9px] font-bold text-white leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Main Content Area */}
      {initialLoading && !refreshing ? (
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" color="#C62828" />
          <Text className="text-sm text-text-secondary mt-2">Loading requests...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#C62828']}
              tintColor="#C62828"
            />
          }
        >
          {/* Error Banner */}
          {error && (
            <View className="bg-error-bg border border-error/20 rounded-2xl p-4 mb-4 flex-row items-center">
              <Feather name="alert-triangle" size={20} className="text-error mr-3" />
              <Text className="text-sm text-error flex-1 font-semibold">{error}</Text>
            </View>
          )}

          {/* Location Missing Banner */}
          {(!profile?.latitude || !profile?.longitude) && (
            <Pressable
              onPress={() => router.push('/(donor)/profile')}
              className="bg-warning-bg border border-warning/20 rounded-2xl p-4 mb-4 flex-row items-center active:opacity-90 shadow-sm shadow-black/5"
            >
              <View className="w-10 h-10 rounded-full bg-surface items-center justify-center mr-3 border border-warning/10">
                <Feather name="map-pin" size={20} className="text-warning" />
              </View>
              <View className="flex-1 mr-2">
                <Text className="text-sm font-semibold text-warning">Location Missing</Text>
                <Text className="text-xs text-text-secondary mt-0.5">
                  Update your coordinates in your profile to compute distances and sort by proximity.
                </Text>
              </View>
              <Feather name="chevron-right" size={16} className="text-warning" />
            </Pressable>
          )}

          {/* Feed List */}
          {requests.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20 bg-surface rounded-2xl border border-border px-6 shadow shadow-black/5">
              <View className="w-16 h-16 rounded-full bg-divider items-center justify-center mb-4">
                <Feather name="droplet" size={32} className="text-text-disabled" />
              </View>
              <Text className="text-lg font-bold text-text-primary text-center">No compatible requests found</Text>
              <Text className="text-sm text-text-secondary text-center mt-2">
                There are no active blood requests matching your blood group ({profile?.blood_group || 'O-'}) at this time. Check back later.
              </Text>
            </View>
          ) : (
            <View className="flex-col gap-3">
              {requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onPress={handleCardPress}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
