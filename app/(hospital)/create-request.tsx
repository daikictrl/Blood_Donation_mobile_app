import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { format, parseISO } from 'date-fns';

import { useHospitalStore } from '@/stores/hospital.store';
import { BloodGroup, UrgencyLevel } from '@/types';

// Zod form validation schema
const createRequestSchema = zod.object({
  blood_group: zod.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const, {
    message: 'Please select a blood group',
  }),
  quantity_needed: zod
    .number({ message: 'Quantity must be a number' })
    .min(1, 'Quantity must be at least 1 unit'),
  urgency_level: zod.enum(['normal', 'urgent', 'emergency'] as const),
  is_emergency: zod.boolean(),
  contact_info: zod.string().min(1, 'Contact information is required'),
  hospital_address: zod.string().min(1, 'Hospital address is required'),
  notes: zod.string().optional(),
  expires_at: zod.string().nullable().optional(),
});

type FormValues = zod.infer<typeof createRequestSchema>;

// Custom Date Picker Modal Component (reusable layout)
interface DatePickerModalProps {
  visible: boolean;
  value: string | null | undefined;
  onClose: () => void;
  onSelect: (date: string) => void;
  title: string;
}

function CustomDatePicker({
  visible,
  value,
  onClose,
  onSelect,
  title,
}: DatePickerModalProps) {
  const minYear = new Date().getFullYear();
  const maxYear = minYear + 2;

  const initialDate = value ? new Date(value) : new Date();
  const [day, setDay] = useState(initialDate.getDate());
  const [month, setMonth] = useState(initialDate.getMonth()); // 0-11
  const [year, setYear] = useState(initialDate.getFullYear());

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Calculate days in the selected month/year
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  // Keep day in range when month or year changes
  useEffect(() => {
    if (day > daysInMonth) {
      setDay(daysInMonth);
    }
  }, [month, year, daysInMonth]);

  const handleConfirm = () => {
    // Format: YYYY-MM-DD
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    onSelect(`${year}-${formattedMonth}-${formattedDay}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-surface rounded-t-3xl p-5 border-t border-border shadow-lg">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-text-primary">{title}</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} className="text-text-secondary" />
            </Pressable>
          </View>

          <View className="flex-row justify-between h-48 mb-5">
            {/* Day Column */}
            <View className="flex-1 items-center">
              <Text className="text-xs font-semibold text-text-secondary mb-2">Day</Text>
              <ScrollView className="w-full border border-border rounded-xl" showsVerticalScrollIndicator={false}>
                {days.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setDay(d)}
                    className={`py-3 items-center ${day === d ? 'bg-primary/10' : ''}`}
                  >
                    <Text className={`text-base ${day === d ? 'text-primary font-bold' : 'text-text-primary'}`}>
                      {d}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View className="w-2" />

            {/* Month Column */}
            <View className="flex-1 items-center">
              <Text className="text-xs font-semibold text-text-secondary mb-2">Month</Text>
              <ScrollView className="w-full border border-border rounded-xl" showsVerticalScrollIndicator={false}>
                {months.map((m, idx) => (
                  <Pressable
                    key={m}
                    onPress={() => setMonth(idx)}
                    className={`py-3 items-center ${month === idx ? 'bg-primary/10' : ''}`}
                  >
                    <Text className={`text-base ${month === idx ? 'text-primary font-bold' : 'text-text-primary'}`}>
                      {m}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View className="w-2" />

            {/* Year Column */}
            <View className="flex-1 items-center">
              <Text className="text-xs font-semibold text-text-secondary mb-2">Year</Text>
              <ScrollView className="w-full border border-border rounded-xl" showsVerticalScrollIndicator={false}>
                {years.map((y) => (
                  <Pressable
                    key={y}
                    onPress={() => setYear(y)}
                    className={`py-3 items-center ${year === y ? 'bg-primary/10' : ''}`}
                  >
                    <Text className={`text-base ${year === y ? 'text-primary font-bold' : 'text-text-primary'}`}>
                      {y}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          <Pressable
            className="bg-primary rounded-xl min-h-[48px] items-center justify-center active:opacity-90"
            onPress={handleConfirm}
          >
            <Text className="text-white font-semibold text-base">Confirm Expiry Date</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function CreateRequestScreen() {
  const { profile, isLoading, error, fetchProfile, createRequest } = useHospitalStore();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      blood_group: undefined,
      quantity_needed: 1,
      urgency_level: 'normal',
      is_emergency: false,
      contact_info: '',
      hospital_address: '',
      notes: '',
      expires_at: null,
    },
  });

  // Fetch hospital profile if not loaded to prefill address & phone
  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, []);

  // Prefill default fields once profile is available
  useEffect(() => {
    if (profile) {
      reset({
        blood_group: undefined,
        quantity_needed: 1,
        urgency_level: 'normal',
        is_emergency: false,
        contact_info: profile.phone || '',
        hospital_address: profile.address || '',
        notes: '',
        expires_at: null,
      });
    }
  }, [profile]);

  const watchedIsEmergency = watch('is_emergency');
  const watchedUrgencyLevel = watch('urgency_level');

  // Sync Emergency Toggle -> Urgency Level
  useEffect(() => {
    const currentUrgency = getValues('urgency_level');
    if (watchedIsEmergency && currentUrgency !== 'emergency') {
      setValue('urgency_level', 'emergency');
    } else if (!watchedIsEmergency && currentUrgency === 'emergency') {
      setValue('urgency_level', 'normal');
    }
  }, [watchedIsEmergency]);

  // Sync Urgency Level -> Emergency Toggle
  useEffect(() => {
    const currentEmergency = getValues('is_emergency');
    if (watchedUrgencyLevel === 'emergency' && !currentEmergency) {
      setValue('is_emergency', true);
    } else if (watchedUrgencyLevel !== 'emergency' && currentEmergency) {
      setValue('is_emergency', false);
    }
  }, [watchedUrgencyLevel]);

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);
    try {
      await createRequest({
        blood_group: data.blood_group,
        quantity_needed: data.quantity_needed,
        urgency_level: data.urgency_level,
        is_emergency: data.is_emergency,
        contact_info: data.contact_info,
        hospital_address: data.hospital_address,
        notes: data.notes || null,
        expires_at: data.expires_at || null,
      });

      Alert.alert('Success', 'Blood request created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create blood request.');
    }
  };

  const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const urgencyLevels: { id: UrgencyLevel; label: string }[] = [
    { id: 'normal', label: 'Normal' },
    { id: 'urgent', label: 'Urgent' },
    { id: 'emergency', label: 'Emergency' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-4 py-4 bg-surface border-b border-border flex-row items-center">
        <Pressable onPress={() => router.back()} className="p-1 mr-3 active:opacity-75">
          <Feather name="chevron-left" size={24} className="text-text-primary" />
        </Pressable>
        <Text className="text-xl font-bold text-text-primary">Create Blood Request</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Error Banners */}
        {error && (
          <View className="bg-error-bg border border-error/20 rounded-2xl p-4 mb-4 flex-row items-center">
            <Feather name="alert-triangle" size={20} className="text-error mr-3" />
            <Text className="text-sm text-error flex-1 font-semibold">{error}</Text>
          </View>
        )}
        {submitError && (
          <View className="bg-error-bg border border-error/20 rounded-2xl p-4 mb-4 flex-row items-center">
            <Feather name="alert-triangle" size={20} className="text-error mr-3" />
            <Text className="text-sm text-error flex-1 font-semibold">{submitError}</Text>
          </View>
        )}

        <View className="flex-col gap-5">
          {/* Blood Group Selection */}
          <View>
            <Text className="text-sm font-semibold text-text-secondary mb-2">Blood Group Needed</Text>
            <Controller
              control={control}
              name="blood_group"
              render={({ field: { value, onChange } }) => (
                <View className="flex-row flex-wrap gap-2">
                  {bloodGroups.map((group) => {
                    const isSelected = value === group;
                    return (
                      <Pressable
                        key={group}
                        onPress={() => onChange(group)}
                        className="w-[74px] h-[48px] rounded-xl items-center justify-center border active:opacity-90"
                        style={isSelected
                          ? { backgroundColor: '#C62828', borderColor: '#C62828' }
                          : { backgroundColor: '#FFFFFF', borderColor: '#E0E0E0' }
                        }
                      >
                        <Text
                          className={`text-base font-bold ${
                            isSelected ? 'text-white' : 'text-text-primary'
                          }`}
                        >
                          {group}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />
            {errors.blood_group && (
              <Text className="text-xs text-primary mt-1.5">{errors.blood_group.message}</Text>
            )}
          </View>

          {/* Quantity Selection */}
          <View>
            <Text className="text-sm font-semibold text-text-secondary mb-2">Quantity Needed (Units)</Text>
            <Controller
              control={control}
              name="quantity_needed"
              render={({ field: { value, onChange } }) => (
                <View className="flex-row items-center gap-3">
                  <Pressable
                    onPress={() => onChange(Math.max(1, value - 1))}
                    className="w-12 h-12 bg-surface border border-border rounded-xl items-center justify-center active:opacity-75"
                  >
                    <Feather name="minus" size={20} className="text-text-primary" />
                  </Pressable>

                  <View className="flex-1 bg-surface border border-border rounded-xl h-12 items-center justify-center">
                    <Text className="text-lg font-bold text-text-primary">{value}</Text>
                  </View>

                  <Pressable
                    onPress={() => onChange(value + 1)}
                    className="w-12 h-12 bg-surface border border-border rounded-xl items-center justify-center active:opacity-75"
                  >
                    <Feather name="plus" size={20} className="text-text-primary" />
                  </Pressable>
                </View>
              )}
            />
            {errors.quantity_needed && (
              <Text className="text-xs text-primary mt-1.5">{errors.quantity_needed.message}</Text>
            )}
          </View>

          {/* Emergency Mark Toggle */}
          <View>
            <Controller
              control={control}
              name="is_emergency"
              render={({ field: { value, onChange } }) => (
                <View className="flex-row justify-between items-center bg-surface border border-border rounded-xl p-4 shadow-sm shadow-black/5">
                  <View className="flex-1 mr-4">
                    <Text className="text-base font-bold text-text-primary flex-row items-center">
                      Mark as Emergency
                    </Text>
                    <Text className="text-xs text-text-secondary mt-0.5">
                      Overrides urgency level to Emergency and tags this request with higher urgency priority on donor feeds.
                    </Text>
                  </View>
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: '#E0E0E0', true: '#FF1744' }}
                    thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
                  />
                </View>
              )}
            />
          </View>

          {/* Urgency Level Selector */}
          <View>
            <Text className="text-sm font-semibold text-text-secondary mb-2">Urgency Level</Text>
            <Controller
              control={control}
              name="urgency_level"
              render={({ field: { value, onChange } }) => (
                <View className="flex-row gap-2">
                  {urgencyLevels.map((level) => {
                    const isSelected = value === level.id;
                    let urgencyColor = '#1565C0'; // normal = info
                    if (level.id === 'urgent') urgencyColor = '#E65100';
                    else if (level.id === 'emergency') urgencyColor = '#FF1744';

                    return (
                      <Pressable
                        key={level.id}
                        onPress={() => onChange(level.id)}
                        className="flex-1 py-3 rounded-xl items-center justify-center border active:opacity-75"
                        style={isSelected
                          ? { backgroundColor: urgencyColor, borderColor: urgencyColor }
                          : { backgroundColor: '#FFFFFF', borderColor: '#E0E0E0' }
                        }
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            isSelected ? 'text-white font-bold' : 'text-text-primary'
                          }`}
                        >
                          {level.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />
            {errors.urgency_level && (
              <Text className="text-xs text-primary mt-1.5">{errors.urgency_level.message}</Text>
            )}
          </View>

          {/* Contact Information */}
          <View>
            <Text className="text-sm font-semibold text-text-secondary mb-2">Contact Information</Text>
            <Controller
              control={control}
              name="contact_info"
              render={({ field: { value, onChange, onBlur } }) => (
                <View
                  className={`bg-surface border rounded-xl px-4 py-3 flex-row items-center ${
                    errors.contact_info ? 'border-primary' : 'border-border'
                  }`}
                >
                  <Feather name="phone" size={18} className="text-text-secondary mr-3" />
                  <TextInput
                    className="flex-1 text-base text-text-primary"
                    placeholder="Contact phone or email"
                    placeholderTextColor="#BDBDBD"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                </View>
              )}
            />
            {errors.contact_info && (
              <Text className="text-xs text-primary mt-1.5">{errors.contact_info.message}</Text>
            )}
          </View>

          {/* Hospital Address */}
          <View>
            <Text className="text-sm font-semibold text-text-secondary mb-2">Hospital Address</Text>
            <Controller
              control={control}
              name="hospital_address"
              render={({ field: { value, onChange, onBlur } }) => (
                <View
                  className={`bg-surface border rounded-xl px-4 py-3 flex-row items-start ${
                    errors.hospital_address ? 'border-primary' : 'border-border'
                  }`}
                >
                  <Feather name="map-pin" size={18} className="text-text-secondary mr-3 mt-1" />
                  <TextInput
                    className="flex-1 text-base text-text-primary min-h-[60px]"
                    placeholder="Hospital address"
                    placeholderTextColor="#BDBDBD"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              )}
            />
            {errors.hospital_address && (
              <Text className="text-xs text-primary mt-1.5">{errors.hospital_address.message}</Text>
            )}
          </View>

          {/* Expiry Date (Optional) */}
          <View>
            <Text className="text-sm font-semibold text-text-secondary mb-2">Expiry Date (Optional)</Text>
            <Controller
              control={control}
              name="expires_at"
              render={({ field: { value } }) => (
                <View>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    className="bg-surface border border-border rounded-xl px-4 py-3 flex-row justify-between items-center active:opacity-75"
                  >
                    <View className="flex-row items-center">
                      <Feather name="calendar" size={18} className="text-text-secondary mr-3" />
                      <Text className={`text-base ${value ? 'text-text-primary font-medium' : 'text-text-disabled'}`}>
                        {value ? format(parseISO(value), 'MMMM d, yyyy') : 'Set Expiry Date'}
                      </Text>
                    </View>
                    {value && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          setValue('expires_at', null);
                        }}
                        className="p-1"
                      >
                        <Feather name="x" size={16} className="text-text-secondary" />
                      </Pressable>
                    )}
                  </Pressable>
                  <CustomDatePicker
                    visible={showDatePicker}
                    value={value}
                    onClose={() => setShowDatePicker(false)}
                    onSelect={(date) => setValue('expires_at', date)}
                    title="Select Expiry Date"
                  />
                </View>
              )}
            />
            {errors.expires_at && (
              <Text className="text-xs text-primary mt-1.5">{errors.expires_at.message}</Text>
            )}
          </View>

          {/* Notes (Optional) */}
          <View>
            <Text className="text-sm font-semibold text-text-secondary mb-2">Notes / Additional Details (Optional)</Text>
            <Controller
              control={control}
              name="notes"
              render={({ field: { value, onChange, onBlur } }) => (
                <View className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-start">
                  <Feather name="file-text" size={18} className="text-text-secondary mr-3 mt-1" />
                  <TextInput
                    className="flex-1 text-base text-text-primary min-h-[80px]"
                    placeholder="Specific requirements (e.g., patient details, blood bank reference)"
                    placeholderTextColor="#BDBDBD"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}
            />
            {errors.notes && (
              <Text className="text-xs text-primary mt-1.5">{errors.notes.message}</Text>
            )}
          </View>

          {/* Submit Button */}
          <Pressable
            disabled={isSubmitting || isLoading}
            onPress={handleSubmit(onSubmit)}
            className="bg-primary rounded-xl min-h-[48px] items-center justify-center px-6 mt-4 flex-row gap-2 active:opacity-90"
            style={(isSubmitting || isLoading) ? { opacity: 0.7 } : undefined}
          >
            {(isSubmitting || isLoading) && (
              <ActivityIndicator size="small" color="#FFFFFF" />
            )}
            <Text className="text-white font-semibold text-base">
              {isSubmitting || isLoading ? 'Creating Request...' : 'Create Blood Request'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
