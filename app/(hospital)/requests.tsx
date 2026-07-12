import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useHospitalStore } from '@/stores/hospital.store';
import { useNotificationStore } from '@/stores/notification.store';
import { registerPushToken } from '@/lib/notifications';
import { HospitalRequestCard } from '@/components/hospital/HospitalRequestCard';

type FilterTab = 'all' | 'active' | 'fulfilled' | 'cancelled';

export default function HospitalRequestsScreen() {
  const {
    requests,
    isLoading,
    error,
    fetchRequests,
    cancelRequest,
    deleteRequest,
  } = useHospitalStore();

  const {
    unreadCount,
    fetchNotifications,
    subscribeToNotifications,
    unsubscribeFromNotifications,
  } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load requests on mount
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
        // Error handled in store
      } finally {
        setInitialLoading(false);
      }
    }
    loadData();
    subscribeToNotifications();

    return () => {
      unsubscribeFromNotifications();
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchRequests();
    } catch (err) {
      // Error handled in store
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelRequest(id);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to cancel the request.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRequest(id);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete the request.');
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (activeTab === 'all') return true;
    return req.status === activeTab;
  });

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'fulfilled', label: 'Fulfilled' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Header with Title and Create Button */}
      <View className="px-4 pt-4 pb-3 bg-surface border-b border-border flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-text-primary">Manage Requests</Text>
          <Text className="text-xs text-text-secondary mt-0.5">
            Create and track your blood requests
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Bell Icon with Dynamic Badge */}
          <Pressable
            onPress={() => router.push('/(hospital)/notifications')}
            className="p-2 relative active:opacity-75 mr-1"
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

          <Pressable
            onPress={() => router.push('/(hospital)/create-request')}
            className="bg-primary w-10 h-10 rounded-full items-center justify-center active:opacity-90 shadow shadow-primary/20"
          >
            <Feather name="plus" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row bg-surface border-b border-border">
        {filterTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className="flex-1 py-3 items-center active:opacity-75"
              style={{ borderBottomWidth: 2, borderBottomColor: isActive ? '#C62828' : 'transparent' }}
            >
              <Text
                className="text-sm"
                style={{
                  fontWeight: isActive ? '700' : '600',
                  color: isActive ? '#C62828' : '#616161',
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
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

          {/* List or Empty State */}
          {filteredRequests.length === 0 ? (
            <View className="items-center justify-center py-20 bg-surface rounded-2xl border border-border px-6 shadow shadow-black/5 mt-2">
              <View className="w-16 h-16 rounded-full bg-divider items-center justify-center mb-4">
                <Feather name="droplet" size={32} className="text-text-disabled" />
              </View>
              <Text className="text-lg font-bold text-text-primary text-center">
                No {activeTab !== 'all' ? activeTab : ''} requests found
              </Text>
              <Text className="text-sm text-text-secondary text-center mt-2">
                {activeTab === 'active'
                  ? "You don't have any active blood requests. Create one to find donors."
                  : activeTab === 'fulfilled'
                  ? 'No requests have been marked as fulfilled yet.'
                  : activeTab === 'cancelled'
                  ? 'No cancelled requests found.'
                  : 'You have not created any requests yet.'}
              </Text>
              {activeTab === 'active' && (
                <Pressable
                  onPress={() => router.push('/(hospital)/create-request')}
                  className="bg-primary px-5 py-2.5 rounded-xl mt-6 active:opacity-90"
                >
                  <Text className="text-white font-semibold text-sm">Create First Request</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View className="flex-col gap-3">
              {filteredRequests.map((request) => (
                <HospitalRequestCard
                  key={request.id}
                  request={request}
                  onCancel={handleCancel}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
