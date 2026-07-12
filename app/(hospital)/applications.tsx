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
import { router, useFocusEffect } from 'expo-router';

import { useHospitalStore } from '@/stores/hospital.store';
import { useNotificationStore } from '@/stores/notification.store';

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

export default function ApplicationsTabScreen() {
  const { requests, isLoading, error, fetchRequests } = useHospitalStore();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filteredRequests = requests.filter((req) => {
    const total = req.total_applications_count ?? 0;
    if (total === 0) return false;

    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return (req.pending_applications_count ?? 0) > 0;
    if (activeTab === 'approved') return (req.approved_applications_count ?? 0) > 0;
    if (activeTab === 'rejected') return (req.rejected_applications_count ?? 0) > 0;
    return false;
  });

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  // Initial load
  useEffect(() => {
    async function loadData() {
      try {
        await fetchRequests();
      } catch (err) {
        // Handled in store
      } finally {
        setInitialLoading(false);
      }
    }
    loadData();
  }, []);

  // Silent refresh on screen focus
  useFocusEffect(
    React.useCallback(() => {
      fetchRequests();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchRequests();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-4 pt-4 pb-3 bg-surface border-b border-border flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-text-primary">Incoming Applications</Text>
          <Text className="text-xs text-text-secondary mt-0.5">
            Select a blood request to review donor applications
          </Text>
        </View>

        {/* Bell Icon with Dynamic Badge */}
        <Pressable
          onPress={() => router.push('/(hospital)/notifications')}
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
                className="text-sm font-semibold"
                style={{
                  color: isActive ? '#C62828' : '#616161',
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

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
          {error && (
            <View className="bg-error-bg border border-error/20 rounded-2xl p-4 mb-4 flex-row items-center">
              <Feather name="alert-triangle" size={20} className="text-error mr-3" />
              <Text className="text-sm text-error flex-1 font-semibold">{error}</Text>
            </View>
          )}

          {filteredRequests.length === 0 ? (
            <View className="items-center justify-center py-20 bg-surface rounded-2xl border border-border px-6 shadow shadow-black/5 mt-2">
              <View className="w-16 h-16 rounded-full bg-divider items-center justify-center mb-4">
                <Feather name="users" size={32} className="text-text-disabled" />
              </View>
              <Text className="text-lg font-bold text-text-primary text-center">
                No requests found
              </Text>
              <Text className="text-sm text-text-secondary text-center mt-2 px-4">
                {activeTab === 'all'
                  ? 'None of your blood requests have received donor applications yet.'
                  : activeTab === 'pending'
                  ? 'You have no requests with pending applications awaiting review.'
                  : activeTab === 'approved'
                  ? 'None of your blood requests have approved applications.'
                  : 'None of your blood requests have rejected applications.'}
              </Text>
            </View>
          ) : (
            <View className="flex-col gap-3">
              {filteredRequests.map((req) => {
                const pendingCount = req.pending_applications_count ?? 0;
                const isEmergency = req.is_emergency || req.urgency_level === 'emergency';
                
                // Urgency badge configuration
                const urgencyLabel = isEmergency
                  ? 'Emergency'
                  : req.urgency_level === 'urgent'
                  ? 'Urgent'
                  : 'Normal';

                const urgencyBg = isEmergency
                  ? 'bg-emergency'
                  : req.urgency_level === 'urgent'
                  ? 'bg-warning-bg'
                  : 'bg-info-bg';

                const urgencyText = isEmergency
                  ? 'text-white'
                  : req.urgency_level === 'urgent'
                  ? 'text-warning'
                  : 'text-info';

                // Status badge configuration
                const statusLabel = req.status === 'active'
                  ? 'Active'
                  : req.status === 'fulfilled'
                  ? 'Fulfilled'
                  : 'Cancelled';

                const statusBg = req.status === 'active'
                  ? 'bg-success-bg'
                  : req.status === 'fulfilled'
                  ? 'bg-info-bg'
                  : 'bg-error-bg';

                const statusText = req.status === 'active'
                  ? 'text-success'
                  : req.status === 'fulfilled'
                  ? 'text-info'
                  : 'text-error';

                return (
                  <Pressable
                    key={req.id}
                    onPress={() =>
                      router.push({
                        pathname: '/(hospital)/applications/[requestId]',
                        params: { requestId: req.id },
                      })
                    }
                    className="bg-surface rounded-2xl p-4 border border-border shadow shadow-black/5 flex-col gap-3 active:opacity-95"
                  >
                    {/* Top Row: Blood Group & Badges */}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        {/* Blood Group */}
                        <View className="bg-primary px-3 py-1 rounded-full">
                          <Text className="text-sm font-bold text-white">{req.blood_group}</Text>
                        </View>

                        {/* Urgency */}
                        <View className={`${urgencyBg} px-3 py-1 rounded-full`}>
                          <Text className={`text-xs font-semibold ${urgencyText}`}>{urgencyLabel}</Text>
                        </View>
                      </View>

                      {/* Request Status */}
                      <View className={`${statusBg} px-2.5 py-1 rounded-full`}>
                        <Text className={`text-[10px] font-bold ${statusText}`}>{statusLabel}</Text>
                      </View>
                    </View>

                    {/* Middle: Details */}
                    <View className="flex-col gap-1 border-t border-divider pt-3">
                      <Text className="text-sm text-text-primary font-semibold">
                        Quantity Needed: {req.quantity_needed} {req.quantity_needed === 1 ? 'Unit' : 'Units'}
                      </Text>
                      {req.hospital_address && (
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Feather name="map-pin" size={11} className="text-text-secondary" />
                          <Text className="text-xs text-text-secondary flex-1" numberOfLines={1}>
                            {req.hospital_address}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Bottom: Application count status */}
                    <View className="border-t border-divider pt-3 flex-row items-center justify-between mt-1">
                      <View className="flex-row items-center gap-1.5">
                        <Feather name="users" size={14} className="text-text-secondary" />
                        <Text className="text-xs text-text-secondary font-medium">
                          {pendingCount > 0 ? (
                            <Text className="text-warning font-bold">{pendingCount} pending</Text>
                          ) : (
                            'No pending'
                          )}{' '}
                          applications
                        </Text>
                      </View>

                      <View className="flex-row items-center gap-1">
                        <Text className="text-xs text-primary font-bold">Review</Text>
                        <Feather name="chevron-right" size={14} className="text-primary" />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
