import React from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { router } from 'expo-router';
import { BloodRequest } from '@/types';

interface HospitalRequestCardProps {
  request: BloodRequest;
  onCancel: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function HospitalRequestCard({ request, onCancel, onDelete }: HospitalRequestCardProps) {
  const { id, blood_group, quantity_needed, urgency_level, is_emergency, status, created_at, pending_applications_count = 0 } = request;

  // Format posted time
  let postedTime = 'some time ago';
  try {
    if (created_at) {
      postedTime = formatDistanceToNow(parseISO(created_at), { addSuffix: true });
    }
  } catch (error) {
    // Fallback if date parsing fails
  }

  const isEmergency = is_emergency || urgency_level === 'emergency';

  const handleCancelPress = () => {
    Alert.alert(
      'Cancel Blood Request',
      'Are you sure you want to cancel this blood request? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => onCancel(id),
        },
      ]
    );
  };

  const handleDeletePress = () => {
    if (onDelete) {
      Alert.alert(
        'Delete Blood Request',
        'Are you sure you want to permanently delete this blood request? This action cannot be undone.',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Delete',
            style: 'destructive',
            onPress: () => onDelete(id),
          },
        ]
      );
    }
  };

  // Status badge config
  let statusBg = 'bg-success-bg';
  let statusTextClass = 'text-success';
  let statusLabel = 'Active';

  if (status === 'fulfilled') {
    statusBg = 'bg-info-bg';
    statusTextClass = 'text-info';
    statusLabel = 'Fulfilled';
  } else if (status === 'cancelled') {
    statusBg = 'bg-error-bg';
    statusTextClass = 'text-error';
    statusLabel = 'Cancelled';
  }

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/(hospital)/applications/[requestId]',
          params: { requestId: id },
        })
      }
      className={`bg-surface rounded-2xl p-4 border ${
        isEmergency
          ? 'border-emergency/30 shadow-md shadow-red-200/50'
          : 'border-border shadow shadow-black/5'
      } flex-col gap-3 active:opacity-[0.98]`}
    >
      {/* Top Row: Blood Group, Status Badge, Time Posted */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          {/* Blood Group Chip */}
          <View className="bg-primary px-3 py-1 rounded-full">
            <Text className="text-sm font-bold text-white">{blood_group}</Text>
          </View>

          {/* Urgency Badge */}
          {isEmergency ? (
            <View className="bg-emergency px-3 py-1 rounded-full flex-row items-center">
              <Feather name="alert-triangle" size={12} color="#FFFFFF" className="mr-1" />
              <Text className="text-xs font-semibold text-white">Emergency</Text>
            </View>
          ) : urgency_level === 'urgent' ? (
            <View className="bg-warning-bg px-3 py-1 rounded-full">
              <Text className="text-xs font-semibold text-warning">Urgent</Text>
            </View>
          ) : (
            <View className="bg-info-bg px-3 py-1 rounded-full">
              <Text className="text-xs font-semibold text-info">Normal</Text>
            </View>
          )}
        </View>

        {/* Status Badge */}
        <View className={`${statusBg} px-3 py-1 rounded-full`}>
          <Text className={`text-xs font-semibold ${statusTextClass}`}>{statusLabel}</Text>
        </View>
      </View>

      {/* Middle Section: Quantity Needed & Details */}
      <View className="flex-col gap-1.5 border-t border-divider pt-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Feather name="droplet" size={14} className="text-primary mr-1.5" />
            <Text className="text-sm font-semibold text-text-primary">
              Quantity: {quantity_needed} {quantity_needed === 1 ? 'Unit' : 'Units'} Needed
            </Text>
          </View>

          <Text className="text-xs text-text-secondary">{postedTime}</Text>
        </View>

        {/* Display address if available */}
        {request.hospital_address ? (
          <View className="flex-row items-start mt-1">
            <Feather name="map-pin" size={13} className="text-text-secondary mr-1.5 mt-0.5" />
            <Text className="text-xs text-text-secondary flex-1" numberOfLines={1}>
              {request.hospital_address}
            </Text>
          </View>
        ) : null}

        {/* Notes if available */}
        {request.notes ? (
          <View className="flex-row items-start mt-1 bg-surface-alt p-2 rounded-lg border border-divider">
            <Feather name="file-text" size={12} className="text-text-secondary mr-1.5 mt-0.5" />
            <Text className="text-xs text-text-secondary flex-1" numberOfLines={2}>
              {request.notes}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Bottom Section: Applicant Count & Actions */}
      <View className="flex-row items-center justify-between border-t border-divider pt-3 mt-1">
        <View className="flex-row items-center">
          <Feather name="user" size={14} className="text-text-secondary mr-1.5" />
          <Text className="text-xs text-text-secondary font-medium">
            {pending_applications_count} {pending_applications_count === 1 ? 'applicant' : 'applicants'}
          </Text>
        </View>

        {status === 'active' && (
          <Pressable
            key="cancel-btn"
            onPress={handleCancelPress}
            className="border border-primary rounded-lg min-h-[32px] items-center justify-center px-3 py-1.5 active:opacity-75"
          >
            <Text className="text-primary font-semibold text-xs">Cancel Request</Text>
          </Pressable>
        )}

        {status === 'cancelled' && onDelete && (
          <Pressable
            key="delete-btn"
            onPress={handleDeletePress}
            className="bg-error-bg border border-error/20 rounded-lg min-h-[32px] items-center justify-center px-3 py-1.5 active:opacity-75"
          >
            <Text className="text-error font-semibold text-xs">Delete Request</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}
