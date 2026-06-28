import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format, parseISO } from 'date-fns';

import { useDonorStore } from '@/stores/donor.store';
import { Appointment, HospitalProfile } from '@/types';

export default function DonorAppointmentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchAppointmentById } = useDonorStore();

  const [appointment, setAppointment] = useState<(Appointment & { hospital?: HospitalProfile }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAppointment() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await fetchAppointmentById(id);
        if (!data) {
          Alert.alert('Error', 'Appointment details not found.', [
            { text: 'Go Back', onPress: () => router.back() },
          ]);
          return;
        }
        setAppointment(data);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load appointment details.', [
          { text: 'Go Back', onPress: () => router.back() },
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadAppointment();
  }, [id]);

  const handleCallHospital = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Unable to place a call to this number.');
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#C62828" />
        <Text className="text-sm text-text-secondary mt-2">Loading appointment details...</Text>
      </SafeAreaView>
    );
  }

  if (!appointment) return null;

  const hospital = appointment.hospital;
  let formattedAptDate = '';
  if (appointment.scheduled_date) {
    try {
      formattedAptDate = format(parseISO(appointment.scheduled_date), 'eeee, MMMM dd, yyyy • hh:mm a');
    } catch (e) {}
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-4 py-3 bg-surface border-b border-border flex-row items-center">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-75">
          <Feather name="chevron-left" size={24} className="text-text-primary" />
        </Pressable>
        <Text className="text-lg font-bold text-text-primary ml-2">Appointment Details</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View className="bg-surface rounded-2xl p-5 border border-border shadow-sm shadow-black/5 mb-4 flex-col gap-4">
          <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Appointment Status
          </Text>

          <View className="flex-row items-center justify-between bg-background p-3 rounded-xl">
            <View>
              <Text className="text-xs text-text-secondary">Current Status</Text>
              <Text className="text-sm font-bold text-text-primary capitalize mt-0.5">
                {appointment.status}
              </Text>
            </View>
            <View>
              {appointment.status === 'scheduled' ? (
                <View className="bg-success-bg px-3.5 py-1.5 rounded-full flex-row items-center">
                  <Feather name="check-circle" size={14} className="text-success mr-1" />
                  <Text className="text-xs font-semibold text-success">Scheduled</Text>
                </View>
              ) : appointment.status === 'completed' ? (
                <View className="bg-info-bg px-3.5 py-1.5 rounded-full flex-row items-center">
                  <Feather name="check-circle" size={14} className="text-info mr-1" />
                  <Text className="text-xs font-semibold text-info">Completed</Text>
                </View>
              ) : appointment.status === 'cancelled' ? (
                <View className="bg-error-bg px-3.5 py-1.5 rounded-full flex-row items-center">
                  <Feather name="x-circle" size={14} className="text-error mr-1" />
                  <Text className="text-xs font-semibold text-error">Cancelled</Text>
                </View>
              ) : (
                <View className="bg-warning-bg px-3.5 py-1.5 rounded-full flex-row items-center">
                  <Feather name="alert-triangle" size={14} className="text-warning mr-1" />
                  <Text className="text-xs font-semibold text-warning">No Show</Text>
                </View>
              )}
            </View>
          </View>

          {appointment.status === 'scheduled' && (
            <View className="bg-success-bg border border-success/20 rounded-xl p-3 flex-row items-start gap-2">
              <Feather name="info" size={16} className="text-success mt-0.5" />
              <Text className="text-xs text-success font-medium flex-1">
                Please arrive 15 minutes before your scheduled time. Remember to eat a light meal and drink plenty of fluids before donating.
              </Text>
            </View>
          )}
        </View>

        {/* Schedule & Location Card */}
        <View className="bg-surface rounded-2xl p-5 border border-border shadow-sm shadow-black/5 mb-4 flex-col gap-4">
          <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Booking Details
          </Text>

          <View className="gap-4">
            <View className="flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-divider items-center justify-center mr-3 mt-0.5">
                <Feather name="calendar" size={16} className="text-text-secondary" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-text-secondary font-semibold">Scheduled Date & Time</Text>
                <Text className="text-sm font-bold text-text-primary mt-0.5">
                  {formattedAptDate}
                </Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-divider items-center justify-center mr-3 mt-0.5">
                <Feather name="map-pin" size={16} className="text-text-secondary" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-text-secondary font-semibold">Donation Location</Text>
                <Text className="text-sm font-semibold text-text-primary mt-0.5 selectable">
                  {appointment.location || 'Hospital Address'}
                </Text>
              </View>
            </View>

            {appointment.notes && (
              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-full bg-divider items-center justify-center mr-3 mt-0.5">
                  <Feather name="file-text" size={16} className="text-text-secondary" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-text-secondary font-semibold">Instructions from Hospital</Text>
                  <Text className="text-sm text-text-primary leading-normal italic mt-1 font-medium">
                    "{appointment.notes}"
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Hospital details card */}
        {hospital && (
          <View className="bg-surface rounded-2xl p-5 border border-border shadow-sm shadow-black/5 mb-6 flex-col gap-4">
            <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Hospital Information
            </Text>

            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-full bg-divider overflow-hidden">
                {hospital.logo_url ? (
                  <Image
                    source={{ uri: hospital.logo_url }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-primary/10">
                    <Feather name="activity" size={20} className="text-primary" />
                  </View>
                )}
              </View>

              <View className="flex-1 flex-col">
                <Text className="text-base font-bold text-text-primary leading-tight">
                  {hospital.name}
                </Text>
                <Text className="text-xs text-text-secondary mt-1 capitalize">
                  {hospital.type === 'blood_bank' ? 'Blood Bank' : 'Hospital'}
                </Text>
              </View>
            </View>

            <View className="border-t border-divider pt-3 flex-col gap-2">
              <View className="flex-row items-start gap-2">
                <Feather name="map-pin" size={14} className="text-text-secondary mt-0.5" />
                <Text className="text-sm text-text-primary flex-1 selectable">
                  {hospital.address}
                </Text>
              </View>

              {hospital.phone && (
                <View className="flex-row items-center justify-between mt-2">
                  <View className="flex-row items-center gap-2">
                    <Feather name="phone" size={14} className="text-text-secondary" />
                    <Text className="text-sm text-text-primary selectable">
                      {hospital.phone}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleCallHospital(hospital.phone!)}
                    className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 flex-row items-center gap-1 active:opacity-75"
                  >
                    <Feather name="phone" size={12} className="text-primary" />
                    <Text className="text-primary font-bold text-xs">Call</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Back Button */}
        <Pressable
          onPress={() => router.back()}
          className="bg-primary rounded-xl min-h-[48px] items-center justify-center px-6 active:opacity-90 shadow-sm shadow-primary/20 flex-row"
        >
          <Feather name="chevron-left" size={16} color="#FFFFFF" className="mr-2" />
          <Text className="text-white font-bold text-base">Back to Applications</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
