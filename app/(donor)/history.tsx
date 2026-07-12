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
import { Image } from 'expo-image';
import { format, parseISO } from 'date-fns';

import { useDonorStore } from '@/stores/donor.store';
import { useNotificationStore } from '@/stores/notification.store';
import { DonationRecord } from '@/types';
import { checkEligibility } from '@/lib/eligibility';
import { EligibilityCountdown } from '@/components/donor/EligibilityCountdown';

export default function DonationHistoryScreen() {
  const {
    donationHistory,
    profile,
    isLoading,
    error,
    fetchDonationHistory,
    deleteDonationHistory,
    fetchProfile,
  } = useDonorStore();

  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load history & profile on screen focus
  useFocusEffect(
    React.useCallback(() => {
      async function loadData() {
        try {
          await Promise.all([
            fetchDonationHistory(),
            fetchProfile(),
          ]);
        } catch (err) {
          // Handled in store error state
        } finally {
          setInitialLoading(false);
        }
      }

      loadData();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchDonationHistory(),
        fetchProfile(),
      ]);
    } catch (err) {
      // Handled in store
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = (record: DonationRecord) => {
    const hospitalName = record.hospital?.name || 'this hospital';
    let formattedDate = 'donation';
    try {
      formattedDate = format(parseISO(record.donation_date), 'MMM dd, yyyy');
    } catch (e) {}

    Alert.alert(
      'Delete Donation Record',
      `Are you sure you want to delete your donation record at ${hospitalName} on ${formattedDate} from your history? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDonationHistory(record.id);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete record.');
            }
          },
        },
      ]
    );
  };

  // Math for stats
  const totalDonations = donationHistory.length;
  const totalUnits = donationHistory.reduce((sum, rec) => sum + rec.units_donated, 0);
  const estimatedLivesSaved = totalUnits * 3;

  // Eligibility Evaluation
  const eligibility = profile ? checkEligibility(profile) : null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-4 pt-4 pb-3 bg-surface border-b border-border flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-text-primary">Donation History</Text>
          <Text className="text-xs text-text-secondary mt-0.5">
            Keep track of your completed blood donations
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

      {/* Error banner outside ScrollView so it doesn't affect sticky header index */}
      {error && (
        <View className="mx-4 mt-3 bg-error-bg border border-error/20 rounded-2xl p-4 flex-row items-center">
          <Feather name="alert-triangle" size={20} className="text-error mr-3" />
          <Text className="text-sm text-error flex-1 font-semibold">{error}</Text>
        </View>
      )}

      {initialLoading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#C62828" />
          <Text className="text-sm text-text-secondary mt-2">Loading history...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#C62828']}
              tintColor="#C62828"
            />
          }
        >
          {/* Index 0: Sticky Stats Section */}
          <View className="bg-background px-4 py-3 border-b border-divider/50 shadow-sm shadow-black/5">
            <View className="flex-row gap-2">
              {/* Donations card */}
              <View className="bg-surface rounded-xl border border-border flex-row items-center justify-center gap-1.5 flex-1 py-2 px-1">
                <Feather name="clock" size={13} className="text-primary" />
                <Text className="text-xs font-semibold text-text-secondary">
                  <Text className="font-bold text-text-primary">{totalDonations}</Text> Don.
                </Text>
              </View>

              {/* Units card */}
              <View className="bg-surface rounded-xl border border-border flex-row items-center justify-center gap-1.5 flex-1 py-2 px-1">
                <Feather name="droplet" size={13} className="text-primary" />
                <Text className="text-xs font-semibold text-text-secondary">
                  <Text className="font-bold text-text-primary">{totalUnits}</Text> Units
                </Text>
              </View>

              {/* Lives saved card */}
              <View className="bg-surface rounded-xl border border-border flex-row items-center justify-center gap-1.5 flex-1 py-2 px-1">
                <Feather name="heart" size={13} className="text-success" />
                <Text className="text-xs font-semibold text-text-secondary">
                  <Text className="font-bold text-text-primary">{estimatedLivesSaved}</Text> Saved
                </Text>
              </View>
            </View>
          </View>

          {/* Rest of page content wrapped in a container to maintain px-4 padding */}
          <View className="px-4 pt-3 flex-col">
            {/* Eligibility Card */}
            {profile && eligibility && (
              <View className="mb-4">
                {eligibility.isEligible ? (
                  <View className="bg-success-bg border border-success/20 rounded-2xl p-4 flex-row items-center justify-between shadow shadow-black/5">
                    <View className="flex-1 pr-3">
                      <Text className="text-sm font-bold text-success flex-row items-center">
                        <Feather name="check-circle" size={14} className="mr-1" /> Eligible to Donate
                      </Text>
                      <Text className="text-xs text-text-secondary mt-1">
                        You are eligible to donate! Find hospitals needing your blood type.
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => router.push('/(donor)/feed')}
                      className="bg-success px-4 py-2.5 rounded-xl min-h-[38px] justify-center items-center active:opacity-90"
                    >
                      <Text className="text-white font-bold text-xs">Browse Feed</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="bg-warning-bg border border-warning/20 rounded-2xl p-4 flex-row items-start gap-3 shadow shadow-black/5">
                    <View className="w-8 h-8 rounded-full bg-warning/10 items-center justify-center mt-0.5">
                      <Feather name="clock" size={16} className="text-warning" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-warning">
                        Not Currently Eligible
                      </Text>
                      {!eligibility.rules.waitPeriod && profile.last_donation_date ? (
                        <Text className="text-xs text-text-secondary leading-normal mt-1 flex-wrap">
                          You recently donated blood. You will be eligible to donate again in{' '}
                          <EligibilityCountdown
                            lastDonationDate={profile.last_donation_date}
                            onComplete={handleRefresh}
                          />
                          .
                        </Text>
                      ) : (
                        <Text className="text-xs text-text-secondary mt-1 leading-normal">
                          You do not meet the minimum eligibility criteria (age, weight, or health declaration) required to donate at this time.
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Donation History List Section */}
            <Text className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
              Completed Donations Log
            </Text>

            {donationHistory.length === 0 ? (
              <View className="items-center justify-center py-20 bg-surface rounded-2xl border border-border px-6 shadow shadow-black/5">
                <View className="w-16 h-16 rounded-full bg-divider items-center justify-center mb-4">
                  <Feather name="clock" size={32} className="text-text-disabled" />
                </View>
                <Text className="text-lg font-bold text-text-primary text-center">
                  No history yet
                </Text>
                <Text className="text-sm text-text-secondary text-center mt-2 px-4">
                  You haven't completed any donation appointments yet. When a hospital confirms a completed donation, it will show up here.
                </Text>
              </View>
            ) : (
              <View className="flex-col gap-3">
                {donationHistory.map((record) => {
                  const hospital = record.hospital;
                  let formattedDate = '';
                  try {
                    formattedDate = format(parseISO(record.donation_date), 'MMMM dd, yyyy');
                  } catch (e) {
                    formattedDate = record.donation_date;
                  }

                  return (
                    <View
                      key={record.id}
                      className="bg-surface rounded-2xl p-4 border border-border shadow shadow-black/5 flex-col gap-3"
                    >
                      {/* Top Row: Hospital Logo & Name + Delete Action */}
                      <View className="flex-row items-start justify-between">
                        <View className="flex-row items-center flex-1 mr-2">
                          {hospital?.logo_url ? (
                            <Image
                              source={{ uri: hospital.logo_url }}
                              className="w-10 h-10 rounded-full"
                              contentFit="cover"
                              transition={200}
                            />
                          ) : (
                            <View className="w-10 h-10 rounded-full bg-divider items-center justify-center">
                              <Feather name="activity" size={18} className="text-text-secondary" />
                            </View>
                          )}
                          <View className="ml-3 flex-1">
                            <Text className="text-base font-semibold text-text-primary" numberOfLines={1}>
                              {hospital?.name || 'Hospital'}
                            </Text>
                            <Text className="text-xs text-text-secondary mt-0.5">
                              {formattedDate}
                            </Text>
                          </View>
                        </View>

                        {/* Delete Button */}
                        <Pressable
                          onPress={() => handleDelete(record)}
                          className="w-10 h-10 items-center justify-center rounded-xl bg-error-bg active:opacity-75"
                          style={{ minWidth: 40, minHeight: 40 }}
                        >
                          <Feather name="trash-2" size={16} className="text-error" />
                        </Pressable>
                      </View>

                      {/* Stats & Blood details */}
                      <View className="flex-row items-center justify-between border-t border-divider pt-3 mt-0.5">
                        <View className="flex-row items-center gap-2">
                          {/* Blood group chip */}
                          <View className="bg-primary px-3 py-1 rounded-full">
                            <Text className="text-xs font-bold text-white">{record.blood_group}</Text>
                          </View>

                          {/* Units Donated */}
                          <View className="bg-success-bg px-3 py-1 rounded-full">
                            <Text className="text-xs font-semibold text-success">
                              {record.units_donated} {record.units_donated === 1 ? 'Unit' : 'Units'} Donated
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center">
                          <Feather name="check-circle" size={12} className="text-success mr-1" />
                          <Text className="text-xs text-success font-semibold">Verified</Text>
                        </View>
                      </View>

                      {/* Notes if present */}
                      {record.notes && (
                        <View className="bg-surface-alt p-3 rounded-xl border border-border mt-0.5">
                          <Text className="text-xs font-semibold text-text-secondary mb-1">
                            Hospital Notes
                          </Text>
                          <Text className="text-sm text-text-primary italic leading-normal">
                            "{record.notes}"
                        </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
