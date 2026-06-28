import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { BloodRequest } from '@/types';

interface RequestCardProps {
  request: BloodRequest;
  onPress: (id: string) => void;
}

export function RequestCard({ request, onPress }: RequestCardProps) {
  const { hospital, blood_group, quantity_needed, urgency_level, is_emergency, created_at, distance } = request;

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

  return (
    <Pressable
      onPress={() => onPress(request.id)}
      className={`bg-surface rounded-2xl p-4 border ${
        isEmergency
          ? 'border-emergency/30 shadow-md shadow-red-200/50'
          : 'border-border shadow shadow-black/5'
      } flex-col gap-3 active:opacity-90`}
    >
      {/* Top Section: Logo, Name, Verified Badge, Time Posted */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          {hospital?.logo_url ? (
            <Image
              source={{ uri: hospital.logo_url }}
              className="w-11 h-11 rounded-full"
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View className="w-11 h-11 rounded-full bg-divider items-center justify-center">
              <Feather name="activity" size={20} className="text-text-secondary" />
            </View>
          )}

          <View className="ml-3 flex-1">
            <View className="flex-row items-center flex-wrap">
              <Text className="text-base font-semibold text-text-primary mr-1" numberOfLines={1}>
                {hospital?.name || 'Hospital'}
              </Text>
              {hospital?.verified && (
                <Feather name="check-circle" size={14} className="text-success" />
              )}
            </View>
            <View className="flex-row items-center mt-0.5">
              <Feather name="map-pin" size={12} className="text-text-secondary mr-1" />
              <Text className="text-xs text-text-secondary" numberOfLines={1}>
                {distance != null ? `${distance.toFixed(1)} km away` : 'Distance unknown'}
              </Text>
            </View>
          </View>
        </View>

        <Text className="text-xs text-text-secondary">{postedTime}</Text>
      </View>

      {/* Middle Section: Blood Group, Urgency Badge, Quantity */}
      <View className="flex-row items-center justify-between border-t border-divider pt-3">
        <View className="flex-row items-center gap-2">
          {/* Blood Group Chip */}
          <View className="bg-primary px-3 py-1 rounded-full">
            <Text className="text-sm font-bold text-white">{blood_group}</Text>
          </View>

          {/* Urgency Badge */}
          {urgency_level === 'emergency' || is_emergency ? (
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

        {/* Quantity Needed */}
        <View className="flex-row items-center">
          <Feather name="droplet" size={14} className="text-primary mr-1" />
          <Text className="text-sm font-semibold text-text-primary">
            {quantity_needed} {quantity_needed === 1 ? 'Unit' : 'Units'} Needed
          </Text>
        </View>
      </View>

      {/* Bottom Section: Call-To-Action Preview */}
      <View className="flex-row items-center justify-end mt-1">
        <Text className="text-sm font-semibold text-primary mr-1">View Details</Text>
        <Feather name="chevron-right" size={16} className="text-primary" />
      </View>
    </Pressable>
  );
}
