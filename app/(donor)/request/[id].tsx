import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format, parseISO } from 'date-fns';

import { useDonorStore } from '@/stores/donor.store';
import { BloodRequest, DonorApplication } from '@/types';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchRequestById, fetchApplicationForRequest, profile } = useDonorStore();

  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [existingApplication, setExistingApplication] = useState<DonorApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRequest() {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchRequestById(id);
        if (data) {
          setRequest(data);
          
          // Check if application already exists
          const appData = await fetchApplicationForRequest(id);
          setExistingApplication(appData);
        } else {
          setError('Request not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load request details');
      } finally {
        setLoading(false);
      }
    }

    loadRequest();
  }, [id]);

  const handleApplyPress = () => {
    if (!id) return;
    router.push(`/(donor)/apply/${id}` as any);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#C62828" />
        <Text className="text-sm text-text-secondary mt-2">Loading details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !request) {
    return (
      <SafeAreaView className="flex-1 bg-background px-4 justify-center items-center">
        <View className="bg-error-bg border border-error/20 rounded-2xl p-6 items-center max-w-sm">
          <Feather name="alert-triangle" size={40} className="text-error mb-3" />
          <Text className="text-lg font-bold text-text-primary text-center">Error Loading Request</Text>
          <Text className="text-sm text-text-secondary text-center mt-2 mb-4">
            {error || 'The requested blood request could not be loaded.'}
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="bg-primary px-6 py-2.5 rounded-xl flex-row items-center"
          >
            <Feather name="chevron-left" size={16} color="#FFFFFF" className="mr-1" />
            <Text className="text-white font-semibold">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { hospital, blood_group, quantity_needed, urgency_level, is_emergency, contact_info, hospital_address, notes, created_at, distance } = request;
  const isEmergency = is_emergency || urgency_level === 'emergency';
  
  let formattedDate = '';
  try {
    if (created_at) {
      formattedDate = format(parseISO(created_at), 'PPP p');
    }
  } catch (e) {
    // Fail silently
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Top Header Bar */}
      <View className="px-4 py-3 bg-surface border-b border-border flex-row items-center">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-75">
          <Feather name="chevron-left" size={24} className="text-text-primary" />
        </Pressable>
        <Text className="text-lg font-bold text-text-primary ml-2">Request Details</Text>
      </View>

      {/* Main Container */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hospital Card */}
        <View className="bg-surface rounded-2xl p-4 border border-border shadow-sm shadow-black/5 mb-4 flex-row items-center">
          {hospital?.logo_url ? (
            <Image
              source={{ uri: hospital.logo_url }}
              className="w-14 h-14 rounded-full"
              contentFit="cover"
            />
          ) : (
            <View className="w-14 h-14 rounded-full bg-divider items-center justify-center">
              <Feather name="activity" size={26} className="text-text-secondary" />
            </View>
          )}

          <View className="ml-4 flex-1">
            <View className="flex-row items-center flex-wrap">
              <Text className="text-lg font-bold text-text-primary mr-1.5">
                {hospital?.name || 'Hospital'}
              </Text>
              {hospital?.verified && (
                <Feather name="check-circle" size={16} className="text-success" />
              )}
            </View>
            <Text className="text-xs text-text-secondary font-semibold capitalize mt-0.5">
              {hospital?.type === 'blood_bank' ? 'Blood Bank' : 'Hospital'}
            </Text>
          </View>
        </View>

        {/* 2x2 Info Grid Card */}
        <View className="bg-surface rounded-2xl p-4 border border-border shadow-sm shadow-black/5 mb-4">
          <View className="flex-row border-b border-divider pb-3">
            {/* Blood Type needed */}
            <View className="flex-1 border-r border-divider pr-3 items-center">
              <Text className="text-xs text-text-secondary font-medium">Blood Group</Text>
              <View className="bg-primary px-3.5 py-1 rounded-full mt-2">
                <Text className="text-base font-bold text-white">{blood_group}</Text>
              </View>
            </View>

            {/* Urgency */}
            <View className="flex-1 pl-3 items-center">
              <Text className="text-xs text-text-secondary font-medium">Urgency</Text>
              <View className="mt-2">
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
            </View>
          </View>

          <View className="flex-row pt-3">
            {/* Quantity */}
            <View className="flex-1 border-r border-divider pr-3 items-center">
              <Text className="text-xs text-text-secondary font-medium">Quantity Needed</Text>
              <View className="flex-row items-center mt-2">
                <Feather name="droplet" size={16} className="text-primary mr-1" />
                <Text className="text-base font-bold text-text-primary">
                  {quantity_needed} {quantity_needed === 1 ? 'Unit' : 'Units'}
                </Text>
              </View>
            </View>

            {/* Proximity */}
            <View className="flex-1 pl-3 items-center">
              <Text className="text-xs text-text-secondary font-medium">Distance</Text>
              <View className="flex-row items-center mt-2">
                <Feather name="map-pin" size={15} className="text-text-primary mr-1" />
                <Text className="text-base font-bold text-text-primary">
                  {distance != null ? `${distance.toFixed(1)} km` : 'Unknown'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Address Card */}
        <View className="bg-surface rounded-2xl p-4 border border-border shadow-sm shadow-black/5 mb-4">
          <View className="flex-row items-center mb-2">
            <Feather name="map-pin" size={16} className="text-text-secondary mr-2" />
            <Text className="text-sm font-semibold text-text-secondary">Hospital Address</Text>
          </View>
          <Text className="text-base text-text-primary leading-normal pl-6">
            {hospital_address || hospital?.address || 'Address not provided'}
          </Text>
        </View>

        {/* Contact Info Card */}
        <View className="bg-surface rounded-2xl p-4 border border-border shadow-sm shadow-black/5 mb-4">
          <View className="flex-row items-center mb-2">
            <Feather name="phone" size={16} className="text-text-secondary mr-2" />
            <Text className="text-sm font-semibold text-text-secondary">Contact Information</Text>
          </View>
          <Text className="text-base text-text-primary font-medium pl-6 leading-normal">
            {contact_info || hospital?.phone || 'Contact info not provided'}
          </Text>
        </View>

        {/* Notes Card */}
        <View className="bg-surface rounded-2xl p-4 border border-border shadow-sm shadow-black/5 mb-4">
          <View className="flex-row items-center mb-2">
            <Feather name="file-text" size={16} className="text-text-secondary mr-2" />
            <Text className="text-sm font-semibold text-text-secondary">Special Notes</Text>
          </View>
          <Text className="text-base text-text-primary leading-normal pl-6">
            {notes || 'No special notes or instructions provided.'}
          </Text>
        </View>

        {/* Date Posted */}
        {formattedDate ? (
          <View className="items-center mt-2 mb-6">
            <Text className="text-xs text-text-disabled">Posted on {formattedDate}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky Bottom Action Button */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-surface border-t border-border flex-col gap-2">
        {existingApplication ? (
          <View className="flex-col gap-2">
            <View className="flex-row items-center justify-between bg-background p-3 rounded-xl border border-border">
              <View>
                <Text className="text-xs text-text-secondary font-medium">Application Status</Text>
                <Text className="text-sm font-bold text-text-primary capitalize mt-0.5">
                  {existingApplication.status}
                </Text>
              </View>
              <View className="bg-primary/10 px-3 py-1 rounded-full">
                <Text className="text-xs font-bold text-primary">Already Applied</Text>
              </View>
            </View>
            <Pressable
              className="bg-primary rounded-xl min-h-[48px] items-center justify-center px-6 active:opacity-90 shadow shadow-primary/20 flex-row gap-2"
              onPress={handleApplyPress}
            >
              <Feather name="file-text" size={16} color="#FFFFFF" />
              <Text className="text-white font-bold text-base">View Application Details</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {profile?.is_eligible === false && (
              <View className="flex-row items-center bg-error-bg rounded-xl p-2 border border-error/10 mb-1">
                <Feather name="alert-triangle" size={14} className="text-error mr-2" />
                <Text className="text-[11px] text-error font-medium flex-1">
                  Note: You are currently not marked as eligible to donate. Review eligibility criteria on your profile tab.
                </Text>
              </View>
            )}
            <Pressable
              className="bg-primary rounded-xl min-h-[48px] items-center justify-center px-6 active:opacity-90 shadow shadow-primary/20"
              onPress={handleApplyPress}
            >
              <Text className="text-white font-bold text-base">Apply to Donate</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
