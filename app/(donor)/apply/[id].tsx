import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';

import { useDonorStore } from '@/stores/donor.store';
import { checkEligibility } from '@/lib/eligibility';
import { BloodRequest, DonorApplication, Appointment } from '@/types';
import { supabase } from '@/lib/supabase';

const schema = z.object({
  message: z.string().max(500, 'Message cannot exceed 500 characters').optional(),
});

type FormData = z.infer<typeof schema>;

export default function ApplyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    profile,
    fetchProfile,
    fetchRequestById,
    fetchApplicationForRequest,
    fetchAppointmentForApplication,
    applyToRequest,
  } = useDonorStore();

  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [existingApplication, setExistingApplication] = useState<DonorApplication | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { control, handleSubmit, formState: { errors }, watch, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      message: '',
    },
  });

  const messageText = watch('message') || '';

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        setSubmitError(null);

        // Fetch request details
        const reqData = await fetchRequestById(id);
        if (!reqData) {
          throw new Error('Blood request not found');
        }
        setRequest(reqData);

        // Fetch donor profile if not loaded yet
        if (!profile) {
          await fetchProfile();
        }

        // Fetch existing application if any
        const appData = await fetchApplicationForRequest(id);
        if (appData) {
          setExistingApplication(appData);
          
          // If approved, fetch appointment
          if (appData.status === 'approved') {
            const aptData = await fetchAppointmentForApplication(appData.id);
            setAppointment(aptData);
          }
        }
      } catch (err: any) {
        setSubmitError(err.message || 'Failed to load initial data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  // Realtime subscription for application status and appointments
  useEffect(() => {
    if (!id || !profile || !existingApplication) return;

    // Listen to changes on donor_applications for this specific application
    const appChannel = supabase
      .channel(`apply_screen_app_${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'donor_applications',
          filter: `id=eq.${existingApplication.id}`,
        },
        async (payload: any) => {
          const updatedApp = payload.new as DonorApplication;
          if (updatedApp) {
            setExistingApplication(updatedApp);
            // If the status updated to approved, fetch the appointment
            if (updatedApp.status === 'approved') {
              const aptData = await fetchAppointmentForApplication(updatedApp.id);
              setAppointment(aptData);
            } else {
              setAppointment(null);
            }
          }
        }
      )
      .subscribe();

    // Listen to changes on appointments for this application
    const aptChannel = supabase
      .channel(`apply_screen_apt_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `application_id=eq.${existingApplication.id}`,
        },
        async (payload: any) => {
          if (payload.eventType === 'DELETE') {
            setAppointment(null);
          } else {
            const newApt = payload.new as Appointment;
            setAppointment(newApt);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appChannel);
      supabase.removeChannel(aptChannel);
    };
  }, [id, profile?.id, existingApplication?.id]);

  const onSubmit = async (data: FormData) => {
    if (!id) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const newApp = await applyToRequest(id, data.message);
      setExistingApplication(newApp);
      setSubmitSuccess(true);
      reset();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit your application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#C62828" />
        <Text className="text-sm text-text-secondary mt-2">Loading application details...</Text>
      </SafeAreaView>
    );
  }

  if (submitError && !request) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center px-4">
        <View className="bg-surface border border-border rounded-2xl p-6 items-center shadow shadow-black/5 w-full max-w-sm">
          <View className="w-12 h-12 rounded-full bg-error-bg items-center justify-center mb-4">
            <Feather name="alert-triangle" size={24} className="text-error" />
          </View>
          <Text className="text-lg font-bold text-text-primary text-center">Error Loading Request</Text>
          <Text className="text-sm text-text-secondary text-center mt-2 mb-6">{submitError}</Text>
          <Pressable
            onPress={() => router.back()}
            className="bg-primary w-full py-3 rounded-xl items-center justify-center active:opacity-90"
          >
            <Text className="text-white font-bold text-base">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!request) return null;

  const { hospital, blood_group: reqBloodGroup, quantity_needed, urgency_level, is_emergency } = request;
  const isEmergency = is_emergency || urgency_level === 'emergency';

  // Compute eligibility using the profile
  const { isEligible, rules } = checkEligibility(profile || {});

  // Formatted application date
  let formattedAppliedDate = '';
  if (existingApplication?.created_at) {
    try {
      formattedAppliedDate = format(parseISO(existingApplication.created_at), 'PPP p');
    } catch (e) {
      // Fail silently
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Top Header Bar */}
      <View className="px-4 py-3 bg-surface border-b border-border flex-row items-center">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-75">
          <Feather name="chevron-left" size={24} className="text-text-primary" />
        </Pressable>
        <Text className="text-lg font-bold text-text-primary ml-2">Apply to Donate</Text>
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
          {/* Success Banner */}
          {submitSuccess && (
            <View className="bg-success-bg border border-success/20 rounded-2xl p-4 mb-4 flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-success/10 items-center justify-center mr-3 mt-0.5">
                <Feather name="check-circle" size={18} className="text-success" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-success">Application Submitted!</Text>
                <Text className="text-sm text-text-secondary mt-1">
                  Your donation request has been sent to the hospital. They will review your eligibility and reach out to schedule an appointment.
                </Text>
              </View>
            </View>
          )}

          {/* Submit/General Error Banner */}
          {submitError && (
            <View className="bg-error-bg border border-error/20 rounded-2xl p-4 mb-4 flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-error/10 items-center justify-center mr-3 mt-0.5">
                <Feather name="alert-triangle" size={18} className="text-error" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-error">Submission Failed</Text>
                <Text className="text-sm text-text-secondary mt-1">{submitError}</Text>
              </View>
            </View>
          )}

          {/* Blood Request Summary Card */}
          <View className="bg-surface rounded-2xl p-4 border border-border shadow-sm shadow-black/5 mb-4">
            <Text className="text-xs font-semibold text-text-secondary uppercase mb-3 tracking-wider">
              Blood Request Info
            </Text>
            
            <View className="flex-row items-center mb-4">
              {hospital?.logo_url ? (
                <Image
                  source={{ uri: hospital.logo_url }}
                  className="w-12 h-12 rounded-full"
                  contentFit="cover"
                />
              ) : (
                <View className="w-12 h-12 rounded-full bg-divider items-center justify-center">
                  <Feather name="activity" size={22} className="text-text-secondary" />
                </View>
              )}
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-text-primary leading-tight">
                  {hospital?.name || 'Hospital'}
                </Text>
                <Text className="text-xs text-text-secondary font-medium capitalize mt-0.5">
                  {hospital?.type === 'blood_bank' ? 'Blood Bank' : 'Hospital'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between border-t border-divider pt-3">
              <View className="flex-row items-center">
                <View className="bg-primary px-3 py-1 rounded-full mr-2">
                  <Text className="text-xs font-bold text-white">{reqBloodGroup}</Text>
                </View>
                <Text className="text-sm font-semibold text-text-primary">
                  {quantity_needed} {quantity_needed === 1 ? 'Unit' : 'Units'}
                </Text>
              </View>
              
              <View>
                {isEmergency ? (
                  <View className="bg-emergency px-3 py-1 rounded-full flex-row items-center">
                    <Feather name="alert-triangle" size={10} color="#FFFFFF" className="mr-1" />
                    <Text className="text-[10px] font-semibold text-white">Emergency</Text>
                  </View>
                ) : urgency_level === 'urgent' ? (
                  <View className="bg-warning-bg px-3 py-1 rounded-full">
                    <Text className="text-[10px] font-semibold text-warning">Urgent</Text>
                  </View>
                ) : (
                  <View className="bg-info-bg px-3 py-1 rounded-full">
                    <Text className="text-[10px] font-semibold text-info">Normal</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Conditional Layout Rendering */}
          
          {/* BRANCH 1: INELIGIBLE DONOR */}
          {!isEligible && (
            <View>
              <View className="bg-surface border border-border rounded-2xl p-5 mb-4 shadow-sm shadow-black/5">
                <View className="flex-row items-center justify-between border-b border-divider pb-3 mb-4">
                  <Text className="text-base font-bold text-text-primary">Eligibility Checklist</Text>
                  <View className="bg-error-bg px-2.5 py-0.5 rounded-full">
                    <Text className="text-xs font-semibold text-error">Not Eligible</Text>
                  </View>
                </View>
                
                <View className="gap-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-text-secondary">Age 21 or older</Text>
                    <Feather
                      name={rules.age ? "check-circle" : "x-circle"}
                      size={18}
                      className={rules.age ? "text-success" : "text-error"}
                    />
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-text-secondary">Weight 100 kg or more</Text>
                    <Feather
                      name={rules.weight ? "check-circle" : "x-circle"}
                      size={18}
                      className={rules.weight ? "text-success" : "text-error"}
                    />
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-text-secondary">Donation interval (30+ days wait)</Text>
                    <Feather
                      name={rules.waitPeriod ? "check-circle" : "x-circle"}
                      size={18}
                      className={rules.waitPeriod ? "text-success" : "text-error"}
                    />
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-text-secondary">Health declaration accepted</Text>
                    <Feather
                      name={rules.healthDeclaration ? "check-circle" : "x-circle"}
                      size={18}
                      className={rules.healthDeclaration ? "text-success" : "text-error"}
                    />
                  </View>
                </View>
              </View>

              <View className="bg-error-bg border border-error/10 rounded-2xl p-4 items-center">
                <Feather name="alert-triangle" size={28} className="text-error mb-2" />
                <Text className="text-base font-bold text-error text-center">
                  You are not eligible to donate at this time
                </Text>
                <Text className="text-xs text-text-secondary text-center mt-1">
                  You must meet all donor eligibility requirements to apply. You can update your donor details under the profile tab.
                </Text>
              </View>
            </View>
          )}

          {/* BRANCH 2: ALREADY APPLIED */}
          {existingApplication && (
            <View className="bg-surface border border-border rounded-2xl p-5 shadow-sm shadow-black/5">
              <Text className="text-xs font-semibold text-text-secondary uppercase mb-3 tracking-wider">
                Application Status
              </Text>

              <View className="flex-row items-center justify-between mb-4 bg-background p-3 rounded-xl">
                <View>
                  <Text className="text-xs text-text-secondary">Current Status</Text>
                  <Text className="text-sm font-bold text-text-primary capitalize mt-0.5">
                    {existingApplication.status}
                  </Text>
                </View>
                <View>
                  {existingApplication.status === 'pending' ? (
                    <View className="bg-warning-bg px-3.5 py-1.5 rounded-full flex-row items-center">
                      <Feather name="clock" size={14} className="text-warning mr-1" />
                      <Text className="text-xs font-semibold text-warning">Pending</Text>
                    </View>
                  ) : existingApplication.status === 'approved' ? (
                    <View className="bg-success-bg px-3.5 py-1.5 rounded-full flex-row items-center">
                      <Feather name="check-circle" size={14} className="text-success mr-1" />
                      <Text className="text-xs font-semibold text-success">Approved</Text>
                    </View>
                  ) : (
                    <View className="bg-error-bg px-3.5 py-1.5 rounded-full flex-row items-center">
                      <Feather name="x-circle" size={14} className="text-error mr-1" />
                      <Text className="text-xs font-semibold text-error">Rejected</Text>
                    </View>
                  )}
                </View>
              </View>

              {formattedAppliedDate ? (
                <Text className="text-xs text-text-secondary mb-4">
                  Applied on {formattedAppliedDate}
                </Text>
              ) : null}

              {existingApplication.message ? (
                <View className="border-t border-divider pt-3 mb-4">
                  <Text className="text-xs text-text-secondary font-semibold mb-1">Your Message:</Text>
                  <Text className="text-sm text-text-primary leading-normal italic">
                    "{existingApplication.message}"
                  </Text>
                </View>
              ) : null}

              {/* Show link to Appointment details if Approved */}
              {existingApplication.status === 'approved' && appointment && (
                <Pressable
                  onPress={() => router.push({ pathname: '/(donor)/appointment/[id]', params: { id: appointment.id } } as any)}
                  className="bg-primary rounded-xl min-h-[48px] items-center justify-center px-6 mt-2 active:opacity-90 shadow shadow-primary/20 flex-row"
                >
                  <Feather name="calendar" size={16} color="#FFFFFF" className="mr-2" />
                  <Text className="text-white font-bold text-base">View Appointment Details</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* BRANCH 3: ELIGIBLE AND HAS NOT APPLIED */}
          {isEligible && !existingApplication && (
            <View className="bg-surface border border-border rounded-2xl p-5 shadow-sm shadow-black/5">
              <Text className="text-base font-bold text-text-primary mb-1">
                Complete Your Application
              </Text>
              <Text className="text-xs text-text-secondary mb-4">
                Please review the request details above. You can optionally write a message to the hospital below.
              </Text>

              {/* Optional message field */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">
                  Message to Hospital (Optional)
                </Text>
                <Controller
                  control={control}
                  name="message"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="bg-background border border-border rounded-xl px-3 py-2.5">
                      <TextInput
                        className="text-base text-text-primary min-h-[100px]"
                        placeholder="Add details about your availability, general health, or any questions you have..."
                        placeholderTextColor="#BDBDBD"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        maxLength={500}
                      />
                    </View>
                  )}
                />
                <View className="flex-row justify-between items-center mt-1.5 px-0.5">
                  <Text className="text-xs text-error font-medium">
                    {errors.message?.message || ''}
                  </Text>
                  <Text className="text-xs text-text-disabled">
                    {messageText.length}/500 characters
                  </Text>
                </View>
              </View>

              <View className="bg-info-bg border border-info/10 rounded-xl p-3 mb-5 flex-row items-start">
                <Feather name="info" size={14} className="text-info mr-2 mt-0.5" />
                <Text className="text-[11px] text-info leading-normal flex-1">
                  By submitting, you agree to share your blood group, age, gender, contact number, and computed eligibility status with the requesting hospital.
                </Text>
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmit(onSubmit)}
                disabled={submitting}
                className="bg-primary rounded-xl min-h-[48px] items-center justify-center px-6 active:opacity-90 shadow shadow-primary/20 flex-row"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />
                ) : (
                  <Feather name="file-text" size={16} color="#FFFFFF" className="mr-2" />
                )}
                <Text className="text-white font-bold text-base">
                  {submitting ? 'Submitting Application...' : 'Submit Application'}
                </Text>
              </Pressable>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
