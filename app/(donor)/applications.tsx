import React, { useState } from 'react';
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
import { useFocusEffect, router } from 'expo-router';

import { useDonorStore } from '@/stores/donor.store';
import { useNotificationStore } from '@/stores/notification.store';
import { DonorApplication } from '@/types';
import { DonorApplicationCard } from '@/components/donor/DonorApplicationCard';

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

export default function DonorApplicationsScreen() {
  const {
    applications,
    isLoading,
    error,
    fetchApplications,
    subscribeToApplications,
    unsubscribeFromApplications,
  } = useDonorStore();

  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  // Sync data and subscription on focus
  useFocusEffect(
    React.useCallback(() => {
      async function loadData() {
        try {
          await fetchApplications();
        } catch (err) {
          // Handled in store
        } finally {
          setInitialLoading(false);
        }
      }

      loadData();
      subscribeToApplications();

      return () => {
        unsubscribeFromApplications();
      };
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchApplications();
    } finally {
      setRefreshing(false);
    }
  };

  const handleCardPress = (app: DonorApplication) => {
    if (app.status === 'approved') {
      const appointments = app.appointments || [];
      if (appointments.length > 0) {
        router.push({
          pathname: '/(donor)/appointment/[id]',
          params: { id: appointments[0].id },
        } as any);
      } else {
        Alert.alert(
          'Awaiting Scheduling',
          'Congratulations! Your application has been approved. The hospital will schedule a donation appointment for you shortly. You will be notified.'
        );
      }
    } else if (app.status === 'rejected') {
      Alert.alert(
        'Application Status',
        'Your application was not selected. This can happen due to quantity limits or eligibility requirements. Thank you for your willingness to donate!'
      );
    } else {
      Alert.alert(
        'Application Status',
        'Your application is currently under review by the hospital medical board. We will notify you as soon as they make a decision.'
      );
    }
  };

  // Filter applications array
  const filteredApplications = applications.filter((app) => {
    if (selectedFilter === 'all') return true;
    return app.status === selectedFilter;
  });

  const filterTabs: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-4 pt-4 pb-3 bg-surface border-b border-border flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-text-primary">My Applications</Text>
          <Text className="text-xs text-text-secondary mt-0.5">
            Track the status of your blood donation applications
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

      {/* Filter Tabs */}
      <View className="flex-row bg-surface border-b border-border px-2 py-2">
        {filterTabs.map((tab) => {
          const isActive = selectedFilter === tab.value;
          return (
            <Pressable
              key={tab.value}
              onPress={() => setSelectedFilter(tab.value)}
              className={`flex-1 items-center justify-center py-2.5 mx-1 rounded-xl min-h-[40px] ${
                isActive ? 'bg-primary' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isActive ? 'text-white' : 'text-text-secondary'
                }`}
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
          <Text className="text-sm text-text-secondary mt-2">Loading applications...</Text>
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

          {filteredApplications.length === 0 ? (
            <View className="items-center justify-center py-20 bg-surface rounded-2xl border border-border px-6 shadow shadow-black/5 mt-2">
              <View className="w-16 h-16 rounded-full bg-divider items-center justify-center mb-4">
                <Feather name="file-text" size={32} className="text-text-disabled" />
              </View>
              <Text className="text-lg font-bold text-text-primary text-center">
                {selectedFilter === 'all'
                  ? 'No applications yet'
                  : `No ${selectedFilter} applications`}
              </Text>
              <Text className="text-sm text-text-secondary text-center mt-2 px-4">
                {selectedFilter === 'all'
                  ? "You haven't applied to any blood requests yet. Go to the Feed tab to find matching requests."
                  : `You don't have any applications that are currently ${selectedFilter}.`}
              </Text>
            </View>
          ) : (
            <View className="flex-col gap-3">
              {filteredApplications.map((app) => (
                <DonorApplicationCard
                  key={app.id}
                  application={app}
                  onPress={() => handleCardPress(app)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
