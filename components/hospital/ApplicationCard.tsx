import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { format, parseISO, differenceInYears } from 'date-fns';
import { DonorApplication } from '@/types';
import { checkEligibility } from '@/lib/eligibility';
import { router } from 'expo-router';

interface ApplicationCardProps {
  application: DonorApplication;
  onApprove: (id: string, isEligible: boolean) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  isActioning: boolean;
}

export function ApplicationCard({
  application,
  onApprove,
  onReject,
  onDelete,
  isActioning,
}: ApplicationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { id, status, message, created_at, donor } = application;

  if (!donor) return null;

  const {
    full_name,
    blood_group,
    date_of_birth,
    weight,
    email,
    phone,
    address,
    avatar_url,
    is_eligible,
    last_donation_date,
    health_declaration,
  } = donor;

  // Calculate age
  let age = 0;
  try {
    if (date_of_birth) {
      age = differenceInYears(new Date(), parseISO(date_of_birth));
    }
  } catch (e) {
    // Fallback if parsing fails
  }

  // Format application date
  let appliedDate = '';
  try {
    if (created_at) {
      appliedDate = format(parseISO(created_at), 'MMM dd, yyyy');
    }
  } catch (e) {
    // Fallback
  }

  // Calculate detailed eligibility reasons
  const { rules } = checkEligibility({
    date_of_birth,
    weight,
    last_donation_date,
    health_declaration,
  });

  const warningReasons: string[] = [];
  if (!rules.age) {
    warningReasons.push(`Underage: Donor is only ${age} years old (minimum 21 required).`);
  }
  if (!rules.weight) {
    warningReasons.push(`Underweight: Donor weighs ${weight} kg (minimum 100 kg required).`);
  }
  if (!rules.waitPeriod) {
    let formattedLastDonation = 'recent';
    if (last_donation_date) {
      try {
        formattedLastDonation = format(parseISO(last_donation_date), 'MMM dd, yyyy');
      } catch (e) {}
    }
    warningReasons.push(`Wait Period: Last donation was on ${formattedLastDonation} (must wait 30 days).`);
  }
  if (!rules.healthDeclaration) {
    warningReasons.push('Health Declaration: Donor did not accept or confirm health questionnaire.');
  }

  // Status badge config
  let statusBg = 'bg-warning-bg';
  let statusText = 'text-warning';
  let statusLabel = 'Pending Review';

  if (status === 'approved') {
    statusBg = 'bg-success-bg';
    statusText = 'text-success';
    statusLabel = 'Approved';
  } else if (status === 'rejected') {
    statusBg = 'bg-error-bg';
    statusText = 'text-error';
    statusLabel = 'Rejected';
  }

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      className="bg-surface rounded-2xl p-4 border border-border shadow shadow-black/5 flex-col gap-3 active:opacity-95"
    >
      {/* Top Row: Avatar, Info, Blood Group & Eligibility */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          {/* Avatar Container */}
          <View className="w-10 h-10 rounded-full bg-divider overflow-hidden">
            {avatar_url ? (
              <Image
                source={{ uri: avatar_url }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View className="w-full h-full items-center justify-center bg-primary/10">
                <Feather name="user" size={18} className="text-primary" />
              </View>
            )}
          </View>

          {/* Name & Basic Meta */}
          <View className="flex-col">
            <Text className="text-base font-semibold text-text-primary">{full_name}</Text>
            <Text className="text-xs text-text-secondary mt-0.5">
              Age: {age} • Weight: {weight} kg
            </Text>
          </View>
        </View>

        {/* Badges */}
        <View className="flex-row items-center gap-2">
          {/* Blood Group Badge */}
          <View className="bg-primary px-2.5 py-1 rounded-full">
            <Text className="text-xs font-bold text-white">{blood_group}</Text>
          </View>

          {/* Eligibility Badge */}
          <View className={`${is_eligible ? 'bg-success-bg' : 'bg-error-bg'} px-2.5 py-1 rounded-full`}>
            <Text className={`text-[10px] font-bold ${is_eligible ? 'text-success' : 'text-error'}`}>
              {is_eligible ? 'Eligible' : 'Not Eligible'}
            </Text>
          </View>
        </View>
      </View>

      {/* Ineligibility Warning Box (User requested warning highlight) */}
      {!is_eligible && (
        <View className="bg-error-bg border border-error/20 rounded-xl p-3 flex-row items-start gap-2.5">
          <Feather name="alert-triangle" size={16} className="text-error mt-0.5" />
          <View className="flex-1 flex-col">
            <Text className="text-xs font-bold text-error">Eligibility Warnings</Text>
            <View className="flex-col gap-0.5 mt-1">
              {warningReasons.map((reason, index) => (
                <Text key={index} className="text-xs text-error font-medium">
                  • {reason}
                </Text>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Date & Expand Indicator */}
      <View className="flex-row justify-between items-center mt-0.5">
        <Text className="text-xs text-text-secondary">Applied {appliedDate}</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-xs text-text-secondary">
            {expanded ? 'Hide Details' : 'Show Details'}
          </Text>
          <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} className="text-text-secondary" />
        </View>
      </View>

      {/* Expanded Profile Info Drawer */}
      {expanded && (
        <View className="border-t border-divider pt-3 flex-col gap-3">
          <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            Contact & Location Details
          </Text>

          <View className="flex-col gap-2 bg-surface-alt p-3 rounded-xl border border-border">
            {phone && (
              <View className="flex-row items-center gap-2">
                <Feather name="phone" size={14} className="text-text-secondary" />
                <Text className="text-sm text-text-primary selectable">{phone}</Text>
              </View>
            )}
            {email && (
              <View className="flex-row items-center gap-2">
                <Feather name="mail" size={14} className="text-text-secondary" />
                <Text className="text-sm text-text-primary selectable">{email}</Text>
              </View>
            )}
            {address && (
              <View className="flex-row items-start gap-2 mt-0.5">
                <Feather name="map-pin" size={14} className="text-text-secondary mt-0.5" />
                <Text className="text-sm text-text-primary flex-1 selectable">{address}</Text>
              </View>
            )}
            {last_donation_date && (
              <View className="flex-row items-center gap-2 mt-0.5">
                <Feather name="clock" size={14} className="text-text-secondary" />
                <Text className="text-sm text-text-primary">
                  Last Donation: {format(parseISO(last_donation_date), 'MMMM dd, yyyy')}
                </Text>
              </View>
            )}
          </View>

          {/* Attached Application Message */}
          {message ? (
            <View className="bg-primary/5 p-3 rounded-xl border border-primary/10">
              <Text className="text-xs font-semibold text-primary mb-1">Donor Note</Text>
              <Text className="text-sm text-text-primary italic">"{message}"</Text>
            </View>
          ) : (
            <Text className="text-xs text-text-disabled italic px-1">No note attached to application.</Text>
          )}
        </View>
      )}

      {/* Bottom Row: Status Badge & Actions */}
      <View className="border-t border-divider pt-3 mt-1 flex-row justify-between items-center">
        {status === 'pending' ? (
          <>
            <View className="flex-row items-center gap-2">
              <View className={`${statusBg} px-3 py-1.5 rounded-full`}>
                <Text className={`text-xs font-semibold ${statusText}`}>{statusLabel}</Text>
              </View>
              <Pressable
                onPress={() => onDelete(id)}
                disabled={isActioning}
                className="w-9 h-9 bg-error-bg border border-error/10 rounded-xl items-center justify-center active:opacity-75 disabled:opacity-50"
              >
                <Feather name="trash-2" size={14} className="text-error" />
              </Pressable>
            </View>
            
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => onReject(id)}
                disabled={isActioning}
                className="bg-error-bg border border-error/20 rounded-xl min-h-[44px] px-5 items-center justify-center active:opacity-75 disabled:opacity-50"
              >
                <Text className="text-error font-semibold text-xs">Reject</Text>
              </Pressable>
              
              <Pressable
                onPress={() => onApprove(id, is_eligible)}
                disabled={isActioning}
                className="bg-success rounded-xl min-h-[44px] px-5 items-center justify-center active:opacity-75 disabled:opacity-50"
              >
                <Text className="text-white font-semibold text-xs">Approve</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View className="flex-row justify-between w-full items-center">
            {status === 'approved' ? (
              <Pressable
                onPress={() => router.push(`/(hospital)/schedule/${id}` as any)}
                className="bg-primary rounded-xl min-h-[44px] px-4 items-center justify-center flex-row gap-2 active:opacity-90"
              >
                <Feather name="calendar" size={14} color="#FFFFFF" />
                <Text className="text-white font-semibold text-xs">Schedule Appointment</Text>
              </Pressable>
            ) : (
              <Text className="text-xs text-text-secondary font-medium">Decision finalized</Text>
            )}
            <View className="flex-row items-center gap-2">
              <View className={`${statusBg} px-3.5 py-1.5 rounded-full`}>
                <Text className={`text-xs font-semibold ${statusText}`}>{statusLabel}</Text>
              </View>
              <Pressable
                onPress={() => onDelete(id)}
                disabled={isActioning}
                className="w-9 h-9 bg-error-bg border border-error/10 rounded-xl items-center justify-center active:opacity-75 disabled:opacity-50"
              >
                <Feather name="trash-2" size={14} className="text-error" />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}
