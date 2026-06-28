import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format, parseISO, differenceInYears } from 'date-fns';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { useHospitalStore } from '@/stores/hospital.store';
import { DonorApplication, Appointment } from '@/types';

export default function ScheduleAppointmentScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();

  const {
    profile,
    fetchProfile,
    fetchApplicationById,
    fetchAppointment,
    scheduleAppointment,
    cancelAppointment,
    confirmDonation,
    isLoading: storeLoading,
  } = useHospitalStore();

  const [application, setApplication] = useState<DonorApplication | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // default to tomorrow
    d.setHours(9, 0, 0, 0); // default to 9:00 AM
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!applicationId) return;
      try {
        setLoading(true);

        // Fetch hospital profile if not loaded
        if (!profile) {
          await fetchProfile();
        }

        // Fetch application details
        const appData = await fetchApplicationById(applicationId);
        if (!appData) {
          Alert.alert('Error', 'Application not found.', [
            { text: 'Go Back', onPress: () => router.back() },
          ]);
          return;
        }

        // Status Gate: Only approved applications can schedule appointments
        if (appData.status !== 'approved') {
          Alert.alert(
            'Access Denied',
            'Appointments can only be scheduled for approved applications.',
            [{ text: 'Go Back', onPress: () => router.back() }]
          );
          return;
        }

        setApplication(appData);

        // Fetch existing appointment if any
        const aptData = await fetchAppointment(applicationId);
        if (aptData) {
          setAppointment(aptData);
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load details.', [
          { text: 'Go Back', onPress: () => router.back() },
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [applicationId]);

  // Pre-fill location from hospital profile if not set and no existing appointment
  useEffect(() => {
    if (profile && !location && !appointment) {
      setLocation(profile.address || '');
    }
  }, [profile, appointment]);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newDate = new Date(scheduledDate);
      newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setScheduledDate(newDate);
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDate = new Date(scheduledDate);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setScheduledDate(newDate);
    }
  };

  const handleSchedule = async () => {
    if (!location.trim()) {
      Alert.alert('Validation Error', 'Location is required.');
      return;
    }

    if (scheduledDate.getTime() < new Date().getTime()) {
      Alert.alert('Validation Error', 'Appointment date/time must be in the future.');
      return;
    }

    setSubmitting(true);
    try {
      const apt = await scheduleAppointment({
        application_id: applicationId,
        donor_id: application!.donor_id,
        hospital_id: profile!.id,
        scheduled_date: scheduledDate.toISOString(),
        location: location.trim(),
        notes: notes.trim() || null,
      });

      setAppointment(apt);
      Alert.alert('Success', 'Appointment scheduled successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to schedule appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppointment = () => {
    if (!appointment) return;
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              const updatedApt = await cancelAppointment(appointment.id);
              setAppointment(updatedApt);
              Alert.alert('Success', 'Appointment has been cancelled.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel appointment.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmDonation = () => {
    if (!appointment || !donor) return;
    Alert.alert(
      'Confirm Donation',
      'Confirm that this donation has been completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Confirm',
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            try {
              const updatedApt = await confirmDonation(
                appointment.id,
                appointment.donor_id,
                donor.blood_group,
                1,
                appointment.notes
              );
              setAppointment(updatedApt);
              Alert.alert('Success', 'Donation confirmed. Inventory updated.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to confirm donation.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#C62828" />
        <Text className="text-sm text-text-secondary mt-2">Loading details...</Text>
      </SafeAreaView>
    );
  }

  if (!application) return null;

  const donor = application.donor;
  if (!donor) return null;

  let donorAge = 0;
  if (donor.date_of_birth) {
    try {
      donorAge = differenceInYears(new Date(), parseISO(donor.date_of_birth));
    } catch (e) {}
  }

  // Format helper for existing appointments
  let formattedAptDate = '';
  if (appointment?.scheduled_date) {
    try {
      formattedAptDate = format(parseISO(appointment.scheduled_date), 'eeee, MMMM dd, yyyy • hh:mm a');
    } catch (e) {}
  }

  // Android DateTimePicker helpers
  const displayDateStr = format(scheduledDate, 'eeee, MMMM dd, yyyy');
  const displayTimeStr = format(scheduledDate, 'hh:mm a');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-4 py-3 bg-surface border-b border-border flex-row items-center">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-75">
          <Feather name="chevron-left" size={24} className="text-text-primary" />
        </Pressable>
        <Text className="text-lg font-bold text-text-primary ml-2">
          {appointment ? 'Appointment Details' : 'Schedule Appointment'}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Donor Profile Summary Card */}
          <View className="bg-surface rounded-2xl p-4 border border-border shadow-sm shadow-black/5 mb-4">
            <Text className="text-xs font-semibold text-text-secondary uppercase mb-3 tracking-wider">
              Donor Information
            </Text>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                {/* Avatar */}
                <View className="w-12 h-12 rounded-full bg-divider overflow-hidden">
                  {donor.avatar_url ? (
                    <Image
                      source={{ uri: donor.avatar_url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="w-full h-full items-center justify-center bg-primary/10">
                      <Feather name="user" size={20} className="text-primary" />
                    </View>
                  )}
                </View>

                {/* Info */}
                <View className="flex-col">
                  <Text className="text-base font-bold text-text-primary leading-tight">
                    {donor.full_name}
                  </Text>
                  <Text className="text-xs text-text-secondary mt-1">
                    Age: {donorAge} • Weight: {donor.weight} kg
                  </Text>
                </View>
              </View>

              {/* Badges */}
              <View className="flex-row items-center gap-2">
                <View className="bg-primary px-3 py-1 rounded-full">
                  <Text className="text-xs font-bold text-white">{donor.blood_group}</Text>
                </View>
                <View className="bg-success-bg px-2.5 py-1 rounded-full">
                  <Text className="text-[10px] font-bold text-success">Eligible</Text>
                </View>
              </View>
            </View>
          </View>

          {/* APPOINTMENT FORM MODE */}
          {!appointment ? (
            <View className="bg-surface rounded-2xl p-5 border border-border shadow-sm shadow-black/5">
              <Text className="text-base font-bold text-text-primary mb-4">
                Schedule Donation Date & Time
              </Text>

              {/* iOS Picker Layout (Compact/Inline) */}
              {Platform.OS === 'ios' ? (
                <View className="mb-4 gap-3">
                  <View className="flex-row items-center justify-between bg-background border border-border rounded-xl px-4 py-2">
                    <View className="flex-row items-center gap-2">
                      <Feather name="calendar" size={16} className="text-text-secondary" />
                      <Text className="text-sm font-semibold text-text-primary">Date</Text>
                    </View>
                    <DateTimePicker
                      value={scheduledDate}
                      mode="date"
                      display="default"
                      minimumDate={new Date()}
                      onChange={onDateChange}
                    />
                  </View>

                  <View className="flex-row items-center justify-between bg-background border border-border rounded-xl px-4 py-2">
                    <View className="flex-row items-center gap-2">
                      <Feather name="clock" size={16} className="text-text-secondary" />
                      <Text className="text-sm font-semibold text-text-primary">Time</Text>
                    </View>
                    <DateTimePicker
                      value={scheduledDate}
                      mode="time"
                      display="default"
                      onChange={onTimeChange}
                    />
                  </View>
                </View>
              ) : (
                /* Android Picker Layout (Click opens native dialog) */
                <View className="mb-4 gap-3">
                  <View className="flex-col gap-1.5">
                    <Text className="text-xs font-semibold text-text-secondary uppercase">
                      Appointment Date
                    </Text>
                    <Pressable
                      onPress={() => setShowDatePicker(true)}
                      className="bg-background border border-border rounded-xl px-4 py-3 flex-row items-center justify-between active:opacity-80"
                    >
                      <Text className="text-base text-text-primary">{displayDateStr}</Text>
                      <Feather name="calendar" size={18} className="text-text-secondary" />
                    </Pressable>
                    {showDatePicker && (
                      <DateTimePicker
                        value={scheduledDate}
                        mode="date"
                        display="default"
                        minimumDate={new Date()}
                        onChange={onDateChange}
                      />
                    )}
                  </View>

                  <View className="flex-col gap-1.5">
                    <Text className="text-xs font-semibold text-text-secondary uppercase">
                      Appointment Time
                    </Text>
                    <Pressable
                      onPress={() => setShowTimePicker(true)}
                      className="bg-background border border-border rounded-xl px-4 py-3 flex-row items-center justify-between active:opacity-80"
                    >
                      <Text className="text-base text-text-primary">{displayTimeStr}</Text>
                      <Feather name="clock" size={18} className="text-text-secondary" />
                    </Pressable>
                    {showTimePicker && (
                      <DateTimePicker
                        value={scheduledDate}
                        mode="time"
                        display="default"
                        onChange={onTimeChange}
                      />
                    )}
                  </View>
                </View>
              )}

              {/* Location Input */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-text-secondary uppercase mb-2">
                  Donation Location
                </Text>
                <View className="bg-background border border-border rounded-xl px-4 py-3 flex-row items-center">
                  <Feather name="map-pin" size={16} className="text-text-secondary mr-2" />
                  <TextInput
                    className="flex-1 text-base text-text-primary"
                    placeholder="Enter donation address"
                    placeholderTextColor="#BDBDBD"
                    value={location}
                    onChangeText={setLocation}
                  />
                </View>
              </View>

              {/* Notes Input */}
              <View className="mb-6">
                <Text className="text-xs font-semibold text-text-secondary uppercase mb-2">
                  Instructions / Notes (Optional)
                </Text>
                <View className="bg-background border border-border rounded-xl px-3 py-2.5">
                  <TextInput
                    className="text-base text-text-primary min-h-[80px]"
                    placeholder="E.g., Please remember to stay hydrated and bring a valid ID card."
                    placeholderTextColor="#BDBDBD"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleSchedule}
                disabled={submitting}
                className="bg-primary rounded-xl min-h-[48px] items-center justify-center px-6 active:opacity-90 shadow-sm shadow-primary/20 flex-row"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />
                ) : (
                  <Feather name="calendar" size={16} color="#FFFFFF" className="mr-2" />
                )}
                <Text className="text-white font-bold text-base">
                  {submitting ? 'Scheduling...' : 'Schedule Appointment'}
                </Text>
              </Pressable>
            </View>
          ) : (
            /* APPOINTMENT VIEW MODE */
            <View className="bg-surface rounded-2xl p-5 border border-border shadow-sm shadow-black/5">
              <Text className="text-xs font-semibold text-text-secondary uppercase mb-3 tracking-wider">
                Appointment Schedule
              </Text>

              {/* Status Header */}
              <View className="flex-row items-center justify-between mb-5 bg-background p-3 rounded-xl">
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

              {/* Details List */}
              <View className="gap-4 mb-6">
                <View className="flex-row items-start">
                  <View className="w-8 h-8 rounded-full bg-divider items-center justify-center mr-3 mt-0.5">
                    <Feather name="calendar" size={16} className="text-text-secondary" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-text-secondary font-semibold">Scheduled For</Text>
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
                    <Text className="text-xs text-text-secondary font-semibold">Location</Text>
                    <Text className="text-sm font-medium text-text-primary mt-0.5 selectable">
                      {appointment.location || 'No location provided'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start">
                  <View className="w-8 h-8 rounded-full bg-divider items-center justify-center mr-3 mt-0.5">
                    <Feather name="file-text" size={16} className="text-text-secondary" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-text-secondary font-semibold">Special Notes / Instructions</Text>
                    <Text className="text-sm text-text-primary leading-normal italic mt-1 font-medium">
                      {appointment.notes ? `"${appointment.notes}"` : 'No custom instructions provided.'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Actions (Only visible if appointment is active/scheduled) */}
              {appointment.status === 'scheduled' && (
                <View className="gap-3 mt-2">
                  <Pressable
                    onPress={handleConfirmDonation}
                    disabled={submitting}
                    className="bg-primary rounded-xl min-h-[48px] items-center justify-center px-6 active:opacity-90 disabled:opacity-50 flex-row"
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />
                    ) : (
                      <Feather name="check-circle" size={16} color="#FFFFFF" className="mr-2" />
                    )}
                    <Text className="text-white font-bold text-base">
                      {submitting ? 'Confirming...' : 'Confirm Donation'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleCancelAppointment}
                    disabled={submitting}
                    className="border border-error rounded-xl min-h-[48px] items-center justify-center px-6 active:opacity-75 disabled:opacity-50 flex-row"
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#C62828" className="mr-2" />
                    ) : (
                      <Feather name="x-circle" size={16} className="text-error mr-2" />
                    )}
                    <Text className="text-error font-semibold text-base">
                      {submitting ? 'Cancelling...' : 'Cancel Appointment'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
