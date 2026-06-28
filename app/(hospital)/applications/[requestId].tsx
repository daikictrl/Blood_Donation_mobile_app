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
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useHospitalStore } from '@/stores/hospital.store';
import { ApplicationCard } from '@/components/hospital/ApplicationCard';

export default function ReviewApplicationsScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  const {
    requests,
    applications,
    isLoading,
    error,
    fetchRequests,
    fetchApplications,
    approveApplication,
    rejectApplication,
    deleteApplication,
  } = useHospitalStore();

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Find request info
  const request = requests.find((r) => r.id === requestId);

  // Load applications and verify requests are loaded
  const loadData = async (isRefresher = false) => {
    if (!isRefresher) setInitialLoading(true);
    try {
      // If requests are empty (e.g. deep link or reload), fetch them first
      if (requests.length === 0) {
        await fetchRequests();
      }
      await fetchApplications(requestId);
    } catch (err) {
      // Error is stored in the Zustand store
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [requestId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData(true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleApprove = (applicationId: string, isEligible: boolean) => {
    if (!isEligible) {
      Alert.alert(
        'Approve Ineligible Donor?',
        'Warning: This donor does not meet all safety and eligibility requirements. Are you sure you want to approve this application anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Approve',
            onPress: () => performApprove(applicationId),
          },
        ]
      );
    } else {
      Alert.alert(
        'Approve Application',
        'Are you sure you want to approve this donor application?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve',
            onPress: () => performApprove(applicationId),
          },
        ]
      );
    }
  };

  const performApprove = async (id: string) => {
    setActioningId(id);
    try {
      await approveApplication(id);
      Alert.alert('Success', 'Application has been approved.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve application.');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = (applicationId: string) => {
    Alert.alert(
      'Reject Application',
      'Are you sure you want to reject this donor application? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => performReject(applicationId),
        },
      ]
    );
  };

  const performReject = async (id: string) => {
    setActioningId(id);
    try {
      await rejectApplication(id);
      Alert.alert('Success', 'Application has been rejected.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reject application.');
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = (applicationId: string) => {
    Alert.alert(
      'Delete Application',
      'Are you sure you want to permanently delete this donor application? This will also cancel any scheduled appointments for this application and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(applicationId),
        },
      ]
    );
  };

  const performDelete = async (id: string) => {
    setActioningId(id);
    try {
      await deleteApplication(id);
      Alert.alert('Success', 'Application has been deleted.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete application.');
    } finally {
      setActioningId(null);
    }
  };



  const urgencyLabel = request?.is_emergency || request?.urgency_level === 'emergency'
    ? 'Emergency'
    : request?.urgency_level === 'urgent'
    ? 'Urgent'
    : 'Normal';

  const urgencyBg = request?.is_emergency || request?.urgency_level === 'emergency'
    ? 'bg-emergency'
    : request?.urgency_level === 'urgent'
    ? 'bg-warning-bg'
    : 'bg-info-bg';

  const urgencyText = request?.is_emergency || request?.urgency_level === 'emergency'
    ? 'text-white'
    : request?.urgency_level === 'urgent'
    ? 'text-warning'
    : 'text-info';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-4 pt-4 pb-3 bg-surface border-b border-border flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center bg-background active:opacity-75"
        >
          <Feather name="chevron-left" size={24} className="text-text-primary" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-text-primary">Review Applications</Text>
          <Text className="text-xs text-text-secondary mt-0.5">
            Donor responses to your request
          </Text>
        </View>
      </View>

      {/* Request details summary block */}
      {request && (
        <View className="bg-surface px-4 py-3 border-b border-border flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            {/* Blood group */}
            <View className="bg-primary px-3 py-1 rounded-full">
              <Text className="text-sm font-bold text-white">{request.blood_group}</Text>
            </View>

            {/* Urgency */}
            <View className={`${urgencyBg} px-3 py-1 rounded-full`}>
              <Text className={`text-xs font-semibold ${urgencyText}`}>{urgencyLabel}</Text>
            </View>
          </View>

          <Text className="text-sm text-text-secondary font-medium">
            Quantity: <Text className="text-text-primary font-bold">{request.quantity_needed}</Text> {request.quantity_needed === 1 ? 'Unit' : 'Units'}
          </Text>
        </View>
      )}



      {/* Content Area */}
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
          {/* Error Banner */}
          {error && (
            <View className="bg-error-bg border border-error/20 rounded-2xl p-4 mb-4 flex-row items-center">
              <Feather name="alert-triangle" size={20} className="text-error mr-3" />
              <Text className="text-sm text-error flex-1 font-semibold">{error}</Text>
            </View>
          )}

          {/* List or Empty State */}
          {applications.length === 0 ? (
            <View className="items-center justify-center py-20 bg-surface rounded-2xl border border-border px-6 shadow shadow-black/5 mt-2">
              <View className="w-16 h-16 rounded-full bg-divider items-center justify-center mb-4">
                <Feather name="users" size={32} className="text-text-disabled" />
              </View>
              <Text className="text-lg font-bold text-text-primary text-center">
                No applications
              </Text>
              <Text className="text-sm text-text-secondary text-center mt-2 px-4">
                No donors have applied to this blood request yet.
              </Text>
            </View>
          ) : (
            <View className="flex-col gap-3">
              {applications.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onDelete={handleDelete}
                  isActioning={actioningId === app.id}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
