import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { DonorApplication } from '@/types';

interface DonorApplicationCardProps {
  application: DonorApplication;
  onPress: () => void;
}

export function DonorApplicationCard({ application, onPress }: DonorApplicationCardProps) {
  const { status, created_at, request } = application;
  const hospital = request?.hospital;

  // Format applied date
  let appliedDate = '';
  try {
    if (created_at) {
      appliedDate = format(parseISO(created_at), 'MMM dd, yyyy');
    }
  } catch (error) {
    // Fallback
  }

  const isEmergency = request?.is_emergency || request?.urgency_level === 'emergency';
  const urgencyLabel = isEmergency
    ? 'Emergency'
    : request?.urgency_level === 'urgent'
    ? 'Urgent'
    : 'Normal';

  const urgencyBg = isEmergency
    ? 'bg-emergency'
    : request?.urgency_level === 'urgent'
    ? 'bg-warning-bg'
    : 'bg-info-bg';

  const urgencyText = isEmergency
    ? 'text-white'
    : request?.urgency_level === 'urgent'
    ? 'text-warning'
    : 'text-info';

  // Status configuration
  let statusBg = 'bg-warning-bg';
  let statusText = 'text-warning';
  let statusLabel = 'Pending';
  let statusIcon: 'clock' | 'check-circle' | 'x-circle' = 'clock';

  if (status === 'approved') {
    statusBg = 'bg-success-bg';
    statusText = 'text-success';
    statusLabel = 'Approved';
    statusIcon = 'check-circle';
  } else if (status === 'rejected') {
    statusBg = 'bg-error-bg';
    statusText = 'text-error';
    statusLabel = 'Rejected';
    statusIcon = 'x-circle';
  }

  const appointments = application.appointments || [];
  const hasAppointment = appointments.length > 0;
  const isApproved = status === 'approved';

  return (
    <Pressable
      onPress={onPress}
      className={`bg-surface rounded-2xl p-4 border border-border shadow shadow-black/5 flex-col gap-3 active:opacity-95`}
    >
      {/* Top section: Logo, Name, Status Badge */}
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
              {hospital?.type === 'blood_bank' ? 'Blood Bank' : 'Hospital'}
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View className={`${statusBg} px-3 py-1 rounded-full flex-row items-center gap-1`}>
          <Feather name={statusIcon} size={12} className={statusText} />
          <Text className={`text-xs font-semibold ${statusText}`}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Middle section: Blood Group, Urgency, Applied Date */}
      <View className="flex-row items-center justify-between border-t border-divider pt-3 mt-0.5">
        <View className="flex-row items-center gap-2">
          {/* Blood group chip */}
          <View className="bg-primary px-3 py-1 rounded-full">
            <Text className="text-xs font-bold text-white">{request?.blood_group || 'O+'}</Text>
          </View>

          {/* Urgency Level Badge */}
          <View className={`${urgencyBg} px-3 py-1 rounded-full flex-row items-center`}>
            {isEmergency && <Feather name="alert-triangle" size={10} color="#FFFFFF" className="mr-1" />}
            <Text className={`text-[10px] font-bold ${urgencyText}`}>
              {urgencyLabel}
            </Text>
          </View>
        </View>

        <Text className="text-xs text-text-secondary font-medium">
          Applied: {appliedDate}
        </Text>
      </View>

      {/* Action / Helper footer */}
      <View className="border-t border-divider pt-3 flex-col gap-2 mt-0.5">
        {isApproved ? (
          hasAppointment ? (
            <View className="flex-row items-center justify-between bg-success-bg/30 p-2.5 rounded-xl border border-success/10">
              <View className="flex-row items-center flex-1 mr-2">
                <Feather name="calendar" size={14} className="text-success mr-2" />
                <Text className="text-xs text-success font-medium flex-1" numberOfLines={1}>
                  Appointment Scheduled
                </Text>
              </View>
              <View className="flex-row items-center bg-primary rounded-xl px-3 py-1.5 min-h-[32px]">
                <Text className="text-white font-bold text-xs">View Appointment</Text>
                <Feather name="chevron-right" size={14} color="#FFFFFF" className="ml-1" />
              </View>
            </View>
          ) : (
            <View className="bg-success-bg/20 p-2.5 rounded-xl border border-success/15 flex-row items-center">
              <Feather name="clock" size={14} className="text-success mr-2" />
              <Text className="text-xs text-success font-medium flex-1">
                Awaiting Scheduling
              </Text>
            </View>
          )
        ) : status === 'rejected' ? (
          <View className="bg-error-bg/20 p-2.5 rounded-xl border border-error/15 flex-row items-center">
            <Feather name="info" size={14} className="text-error mr-2" />
            <Text className="text-xs text-error font-medium flex-1">
              Application not selected
            </Text>
          </View>
        ) : (
          <View className="bg-warning-bg/20 p-2.5 rounded-xl border border-warning/15 flex-row items-center">
            <Feather name="clock" size={14} className="text-warning mr-2" />
            <Text className="text-xs text-warning font-medium flex-1">
              Under medical board review
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
