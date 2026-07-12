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
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { format, parseISO } from 'date-fns';

import { useDonorStore } from '@/stores/donor.store';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useRouter } from 'expo-router';
import { checkEligibility } from '@/lib/eligibility';
import { BloodGroup } from '@/types';

// Zod validation schema for form inputs
const donorProfileSchema = zod.object({
  full_name: zod.string().min(2, 'Name must be at least 2 characters'),
  date_of_birth: zod.string().min(1, 'Date of birth is required'),
  gender: zod.enum(['male', 'female', 'other']),
  blood_group: zod.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  weight: zod
    .string()
    .min(1, 'Weight is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Weight must be a positive number',
    }),
  phone: zod.string().min(5, 'Phone number must be at least 5 digits'),
  address: zod.string().min(5, 'Address must be at least 5 characters'),
  latitude: zod.number().nullable().optional(),
  longitude: zod.number().nullable().optional(),
  last_donation_date: zod.string().nullable().optional(),
  health_declaration: zod.boolean().refine((val) => val === true, {
    message: 'You must check the health declaration',
  }),
  avatar_url: zod.string().nullable().optional(),
});

type FormValues = zod.infer<typeof donorProfileSchema>;

// Custom Date Picker Modal Component
interface DatePickerModalProps {
  visible: boolean;
  value: string | null;
  onClose: () => void;
  onSelect: (date: string) => void;
  title: string;
  minYear?: number;
  maxYear?: number;
}

function CustomDatePicker({
  visible,
  value,
  onClose,
  onSelect,
  title,
  minYear = 1940,
  maxYear = new Date().getFullYear(),
}: DatePickerModalProps) {
  const initialDate = value ? new Date(value) : new Date();
  const [day, setDay] = useState(initialDate.getDate());
  const [month, setMonth] = useState(initialDate.getMonth()); // 0-11
  const [year, setYear] = useState(
    value ? initialDate.getFullYear() : maxYear - 21 // Default to 21 years ago for DOB
  );

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Calculate days in the selected month/year
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

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
            className="bg-primary rounded-xl min-h-[48px] items-center justify-center"
            onPress={handleConfirm}
          >
            <Text className="text-white font-semibold text-base">Confirm Date</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function DonorProfileScreen() {
  const { profile, isLoading, error, fetchProfile, updateProfile, uploadAvatar } = useDonorStore();
  const { signOut } = useAuthStore();
  const router = useRouter();
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const [isEditMode, setIsEditMode] = useState(false);
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [donationPickerVisible, setDonationPickerVisible] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);

  // Form setup
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(donorProfileSchema),
    defaultValues: {
      full_name: '',
      date_of_birth: '',
      gender: 'male',
      blood_group: 'O+',
      weight: '',
      phone: '',
      address: '',
      latitude: null,
      longitude: null,
      last_donation_date: null,
      health_declaration: false,
      avatar_url: null,
    },
  });

  // Watch values for real-time eligibility computation in form
  const watchedDob = watch('date_of_birth');
  const watchedWeight = watch('weight');
  const watchedLastDonation = watch('last_donation_date');
  const watchedHealthDec = watch('health_declaration');

  // Compute live eligibility preview
  const liveEligibility = checkEligibility({
    date_of_birth: watchedDob,
    weight: watchedWeight,
    last_donation_date: watchedLastDonation,
    health_declaration: watchedHealthDec,
  });

  useEffect(() => {
    fetchProfile().catch(() => {});
  }, []);

  // Sync profile data to form when edit mode is opened
  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name,
        date_of_birth: profile.date_of_birth,
        gender: profile.gender,
        blood_group: profile.blood_group,
        weight: String(profile.weight),
        phone: profile.phone || '',
        address: profile.address || '',
        latitude: profile.latitude,
        longitude: profile.longitude,
        last_donation_date: profile.last_donation_date,
        health_declaration: profile.health_declaration,
        avatar_url: profile.avatar_url || null,
      });
      setLocalAvatarUrl(profile.avatar_url || null);
      setIsEditMode(false);
    } else if (!isLoading) {
      // If profile doesn't exist, enter onboarding mode (Edit Mode forced)
      setIsEditMode(true);
    }
  }, [profile, isLoading]);

  // Handle Avatar Image Picking
  const handleSelectAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library permission is required to change profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images' as ImagePicker.MediaType],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setAvatarUploading(true);
      
      // Crop and resize to 300x300px square JPEG
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 300, height: 300 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const avatarUrl = await uploadAvatar(manipulated.uri);
      setValue('avatar_url', avatarUrl);
      setLocalAvatarUrl(avatarUrl);
      Alert.alert('Success', 'Profile photo updated successfully.');
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload avatar image.');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Get GPS Location and reverse geocode to address
  const handleUseCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location services in system settings.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;
      setValue('latitude', latitude);
      setValue('longitude', longitude);

      // Attempt reverse geocoding to retrieve street address
      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addressResult) {
        const formattedAddress = [
          addressResult.streetNumber,
          addressResult.street,
          addressResult.city,
          addressResult.region,
          addressResult.postalCode,
          addressResult.country,
        ]
          .filter(Boolean)
          .join(', ');

        setValue('address', formattedAddress);
      } else {
        setValue('address', `Location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to fetch your current GPS coordinates. Please enter manually.');
    }
  };

  // Submit Profile Form
  const onSubmit = async (data: FormValues) => {
    try {
      await updateProfile({
        full_name: data.full_name,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        blood_group: data.blood_group as BloodGroup,
        weight: Number(data.weight),
        phone: data.phone || null,
        address: data.address || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        last_donation_date: data.last_donation_date || null,
        health_declaration: data.health_declaration,
        avatar_url: data.avatar_url || null,
      });
      Alert.alert('Success', 'Profile saved successfully.');
      setIsEditMode(false);
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Failed to update profile.');
    }
  };

  // Sign out flow
  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  // Render Loader
  if (isLoading && !isEditMode && !avatarUploading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#C62828" />
        <Text className="text-sm text-text-secondary mt-2">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  // Generate cache-busting avatar URI
  const avatarUri = localAvatarUrl
    ? `${localAvatarUrl}?t=${profile?.updated_at ? new Date(profile.updated_at).getTime() : Date.now()}`
    : null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="mb-6 flex-row justify-between items-center">
            <View className="flex-grow flex-1 mr-4">
              <Text className="text-2xl font-bold text-text-primary">
                {profile ? 'My Profile' : 'Complete Profile'}
              </Text>
              <Text className="text-sm text-text-secondary mt-1">
                {profile ? 'Manage your information and eligibility' : 'Enter details to start donating'}
              </Text>
            </View>

            {/* Bell Icon with Dynamic Badge */}
            <Pressable
              onPress={() => router.push('/(donor)/notifications')}
              className="p-2 relative active:opacity-75 mr-2"
            >
              <Feather name="bell" size={24} className="text-text-primary" />
              {unreadCount > 0 && (
                <View className="absolute right-1 top-1 bg-primary w-4.5 h-4.5 rounded-full items-center justify-center border border-surface">
                  <Text className="text-[9px] font-bold text-white leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>

            {profile && !isEditMode && (
              <Pressable
                onPress={() => setIsEditMode(true)}
                className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl"
              >
                <Text className="text-primary font-semibold text-sm">Edit</Text>
              </Pressable>
            )}
          </View>

          {/* Profile Card Header (Avatar & Basics) */}
          <View className="bg-surface rounded-2xl p-5 border border-border shadow shadow-black/5 items-center mb-5">
            <Pressable onPress={handleSelectAvatar} className="relative mb-3">
              <View className="w-24 h-24 rounded-full bg-border items-center justify-center overflow-hidden border border-border">
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <Feather name="user" size={48} className="text-text-disabled" />
                )}
              </View>
              {avatarUploading ? (
                <View className="absolute inset-0 bg-black/35 rounded-full items-center justify-center">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : (
                <View className="absolute bottom-0 right-0 bg-primary w-8 h-8 rounded-full items-center justify-center border-2 border-white shadow">
                  <Feather name="camera" size={14} color="white" />
                </View>
              )}
            </Pressable>

            {profile ? (
              <>
                <Text className="text-xl font-bold text-text-primary">{profile.full_name}</Text>
                <View className="flex-row items-center mt-2 bg-primary/10 px-3 py-1 rounded-full">
                  <Text className="text-sm font-bold text-primary mr-1">Blood Group:</Text>
                  <Text className="text-sm font-bold text-primary">{profile.blood_group}</Text>
                </View>
              </>
            ) : (
              <Text className="text-base text-text-secondary font-semibold">New Donor Registration</Text>
            )}
          </View>

          {/* VIEW PROFILE MODE */}
          {!isEditMode && profile && (
            <View className="gap-5">
              {/* Eligibility Badge and Breakdown Card */}
              <View className="bg-surface rounded-2xl p-5 border border-border shadow shadow-black/5">
                <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-divider">
                  <Text className="text-base font-semibold text-text-primary">Eligibility Status</Text>
                  <View className={`${profile.is_eligible ? 'bg-success-bg' : 'bg-error-bg'} px-3 py-1 rounded-full`}>
                    <Text className={`text-xs font-bold ${profile.is_eligible ? 'text-success' : 'text-error'}`}>
                      {profile.is_eligible ? 'Eligible' : 'Not Eligible'}
                    </Text>
                  </View>
                </View>

                {/* Eligibility Checklist */}
                <View className="gap-3">
                  {/* Rule 1: Age */}
                  <View className="flex-row items-center">
                    <View className="mr-3">
                      {checkEligibility(profile).rules.age ? (
                        <Feather name="check-circle" size={18} color="#2E7D32" />
                      ) : (
                        <Feather name="x-circle" size={18} color="#C62828" />
                      )}
                    </View>
                    <Text className="text-sm text-text-primary flex-1">Age 21 or older</Text>
                    <Text className="text-xs text-text-secondary">
                      {format(parseISO(profile.date_of_birth), 'MMM d, yyyy')}
                    </Text>
                  </View>

                  {/* Rule 2: Weight */}
                  <View className="flex-row items-center">
                    <View className="mr-3">
                      {checkEligibility(profile).rules.weight ? (
                        <Feather name="check-circle" size={18} color="#2E7D32" />
                      ) : (
                        <Feather name="x-circle" size={18} color="#C62828" />
                      )}
                    </View>
                    <Text className="text-sm text-text-primary flex-1">Weight 100 kg or heavier</Text>
                    <Text className="text-xs text-text-secondary">{profile.weight} kg</Text>
                  </View>

                  {/* Rule 3: Wait Period */}
                  <View className="flex-row items-center">
                    <View className="mr-3">
                      {checkEligibility(profile).rules.waitPeriod ? (
                        <Feather name="check-circle" size={18} color="#2E7D32" />
                      ) : (
                        <Feather name="x-circle" size={18} color="#C62828" />
                      )}
                    </View>
                    <Text className="text-sm text-text-primary flex-1">At least 30 days since last donation</Text>
                    <Text className="text-xs text-text-secondary">
                      {profile.last_donation_date
                        ? format(parseISO(profile.last_donation_date), 'MMM d, yyyy')
                        : 'Never'}
                    </Text>
                  </View>

                  {/* Rule 4: Health Declaration */}
                  <View className="flex-row items-center">
                    <View className="mr-3">
                      {profile.health_declaration ? (
                        <Feather name="check-circle" size={18} color="#2E7D32" />
                      ) : (
                        <Feather name="x-circle" size={18} color="#C62828" />
                      )}
                    </View>
                    <Text className="text-sm text-text-primary flex-1">Health declaration accepted</Text>
                    <Text className="text-xs text-text-secondary">
                      {profile.health_declaration ? 'Accepted' : 'Declined'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Personal Details Card */}
              <View className="bg-surface rounded-2xl p-5 border border-border shadow shadow-black/5 gap-4">
                <Text className="text-base font-semibold text-text-primary pb-2 border-b border-divider">
                  Personal Details
                </Text>

                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-text-secondary">Gender</Text>
                  <Text className="text-sm text-text-primary capitalize">{profile.gender}</Text>
                </View>

                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-text-secondary">Phone Number</Text>
                  <Text className="text-sm text-text-primary">{profile.phone || 'Not provided'}</Text>
                </View>

                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-text-secondary">Email Address</Text>
                  <Text className="text-sm text-text-primary">{profile.email || 'Not provided'}</Text>
                </View>

                <View className="py-1">
                  <Text className="text-sm text-text-secondary mb-1">Residential Address</Text>
                  <Text className="text-sm text-text-primary">{profile.address || 'Not provided'}</Text>
                  {profile.latitude && profile.longitude && (
                    <Text className="text-xs text-text-disabled mt-1">
                      Coordinates: {Number(profile.latitude).toFixed(4)}, {Number(profile.longitude).toFixed(4)}
                    </Text>
                  )}
                </View>
              </View>

              {/* Account Controls */}
              <View className="gap-3">
                <Pressable
                  className="border border-primary rounded-xl min-h-[48px] items-center justify-center px-6"
                  onPress={handleSignOut}
                >
                  <Text className="text-primary font-semibold text-base">Sign Out</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* EDIT PROFILE MODE / ONBOARDING */}
          {isEditMode && (
            <View className="gap-5">
              {/* Form Card */}
              <View className="bg-surface rounded-2xl p-5 border border-border shadow shadow-black/5 gap-4">
                <Text className="text-base font-semibold text-text-primary pb-2 border-b border-divider">
                  {profile ? 'Edit Profile Details' : 'Donor Information'}
                </Text>

                {/* Full Name */}
                <View>
                  <Text className="text-sm font-semibold text-text-secondary mb-2">Full Name</Text>
                  <Controller
                    control={control}
                    name="full_name"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className={`bg-background border rounded-xl px-4 py-3 ${errors.full_name ? 'border-primary' : 'border-border'}`}>
                        <TextInput
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          placeholder="Enter your full name"
                          placeholderTextColor="#BDBDBD"
                          className="text-base text-text-primary"
                        />
                      </View>
                    )}
                  />
                  {errors.full_name && (
                    <Text className="text-xs text-primary mt-1">{errors.full_name.message}</Text>
                  )}
                </View>

                {/* Date of Birth */}
                <View>
                  <Text className="text-sm font-semibold text-text-secondary mb-2">Date of Birth</Text>
                  <Controller
                    control={control}
                    name="date_of_birth"
                    render={({ field: { value } }) => (
                      <>
                        <Pressable
                          onPress={() => setDobPickerVisible(true)}
                          className={`bg-background border rounded-xl px-4 py-3 flex-row justify-between items-center ${errors.date_of_birth ? 'border-primary' : 'border-border'}`}
                        >
                          <Text className={`text-base ${value ? 'text-text-primary' : 'text-text-disabled'}`}>
                            {value ? format(parseISO(value), 'MMMM d, yyyy') : 'Select Date of Birth'}
                          </Text>
                          <Feather name="calendar" size={18} className="text-text-secondary" />
                        </Pressable>
                        <CustomDatePicker
                          visible={dobPickerVisible}
                          value={value}
                          onClose={() => setDobPickerVisible(false)}
                          onSelect={(date) => setValue('date_of_birth', date)}
                          title="Select Date of Birth"
                        />
                      </>
                    )}
                  />
                  {errors.date_of_birth && (
                    <Text className="text-xs text-primary mt-1">{errors.date_of_birth.message}</Text>
                  )}
                </View>

                {/* Gender */}
                <View>
                  <Text className="text-sm font-semibold text-text-secondary mb-2">Gender</Text>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field: { value } }) => (
                      <View className="flex-row gap-2">
                        {['male', 'female', 'other'].map((g) => {
                          const isSelected = value === g;
                          return (
                            <Pressable
                              key={g}
                              onPress={() => setValue('gender', g as any)}
                              className={`flex-1 min-h-[44px] border rounded-xl items-center justify-center capitalize ${
                                isSelected
                                  ? 'bg-primary border-primary'
                                  : 'bg-background border-border'
                              }`}
                            >
                              <Text className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                                {g}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  />
                  {errors.gender && (
                    <Text className="text-xs text-primary mt-1">{errors.gender.message}</Text>
                  )}
                </View>

                {/* Blood Group */}
                <View>
                  <Text className="text-sm font-semibold text-text-secondary mb-2">Blood Group</Text>
                  <Controller
                    control={control}
                    name="blood_group"
                    render={({ field: { value } }) => (
                      <View className="flex-row flex-wrap gap-2">
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => {
                          const isSelected = value === bg;
                          return (
                            <Pressable
                              key={bg}
                              onPress={() => setValue('blood_group', bg as any)}
                              style={{ width: '22%' }}
                              className={`h-11 border rounded-xl items-center justify-center ${
                                isSelected
                                  ? 'bg-primary border-primary'
                                  : 'bg-background border-border'
                              }`}
                            >
                              <Text className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                                {bg}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  />
                  {errors.blood_group && (
                    <Text className="text-xs text-primary mt-1">{errors.blood_group.message}</Text>
                  )}
                </View>

                {/* Weight */}
                <View>
                  <Text className="text-sm font-semibold text-text-secondary mb-2">Weight (kg)</Text>
                  <Controller
                    control={control}
                    name="weight"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className={`bg-background border rounded-xl px-4 py-3 ${errors.weight ? 'border-primary' : 'border-border'}`}>
                        <TextInput
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          keyboardType="numeric"
                          placeholder="e.g. 75"
                          placeholderTextColor="#BDBDBD"
                          className="text-base text-text-primary"
                        />
                      </View>
                    )}
                  />
                  {errors.weight && (
                    <Text className="text-xs text-primary mt-1">{errors.weight.message}</Text>
                  )}
                </View>

                {/* Phone Number */}
                <View>
                  <Text className="text-sm font-semibold text-text-secondary mb-2">Phone Number</Text>
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className={`bg-background border rounded-xl px-4 py-3 ${errors.phone ? 'border-primary' : 'border-border'}`}>
                        <TextInput
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          keyboardType="phone-pad"
                          placeholder="e.g. +1234567890"
                          placeholderTextColor="#BDBDBD"
                          className="text-base text-text-primary"
                        />
                      </View>
                    )}
                  />
                  {errors.phone && (
                    <Text className="text-xs text-primary mt-1">{errors.phone.message}</Text>
                  )}
                </View>

                {/* Address */}
                <View>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-sm font-semibold text-text-secondary">Address</Text>
                    <Pressable
                      onPress={handleUseCurrentLocation}
                      className="flex-row items-center bg-primary/10 px-2.5 py-1 rounded-lg"
                    >
                      <Feather name="map-pin" size={12} className="text-primary mr-1" />
                      <Text className="text-xs font-semibold text-primary">Use GPS</Text>
                    </Pressable>
                  </View>
                  <Controller
                    control={control}
                    name="address"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className={`bg-background border rounded-xl px-4 py-3 ${errors.address ? 'border-primary' : 'border-border'}`}>
                        <TextInput
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          multiline
                          placeholder="Street name, City, Country"
                          placeholderTextColor="#BDBDBD"
                          className="text-base text-text-primary min-h-[60px]"
                        />
                      </View>
                    )}
                  />
                  {errors.address && (
                    <Text className="text-xs text-primary mt-1">{errors.address.message}</Text>
                  )}
                </View>

                {/* Last Donation Date */}
                <View>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-sm font-semibold text-text-secondary">Last Donation Date (Optional)</Text>
                    {watch('last_donation_date') && (
                      <Pressable
                        onPress={() => setValue('last_donation_date', null)}
                        className="px-2 py-0.5 bg-border rounded-md"
                      >
                        <Text className="text-xs font-semibold text-text-secondary">Clear</Text>
                      </Pressable>
                    )}
                  </View>
                  <Controller
                    control={control}
                    name="last_donation_date"
                    render={({ field: { value } }) => (
                      <>
                        <Pressable
                          onPress={() => setDonationPickerVisible(true)}
                          className="bg-background border border-border rounded-xl px-4 py-3 flex-row justify-between items-center"
                        >
                          <Text className={`text-base ${value ? 'text-text-primary' : 'text-text-disabled'}`}>
                            {value ? format(parseISO(value), 'MMMM d, yyyy') : 'No previous donations'}
                          </Text>
                          <Feather name="calendar" size={18} className="text-text-secondary" />
                        </Pressable>
                        <CustomDatePicker
                          visible={donationPickerVisible}
                          value={value ?? null}
                          onClose={() => setDonationPickerVisible(false)}
                          onSelect={(date) => setValue('last_donation_date', date)}
                          title="Select Last Donation Date"
                        />
                      </>
                    )}
                  />
                </View>

                {/* Health Declaration Switch */}
                <View className="pt-3 border-t border-divider gap-3">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1 mr-4">
                      <Text className="text-sm font-bold text-text-primary">Health Declaration</Text>
                      <Text className="text-xs text-text-secondary mt-1 leading-4">
                        I declare that I am healthy, weigh over 100 kg, am 21+ years old, and have not donated blood in the last 30 days.
                      </Text>
                    </View>
                    <Controller
                      control={control}
                      name="health_declaration"
                      render={({ field: { onChange, value } }) => (
                        <Switch
                          value={value}
                          onValueChange={onChange}
                          trackColor={{ false: '#E0E0E0', true: '#FFC5C5' }}
                          thumbColor={value ? '#C62828' : '#F5F5F5'}
                        />
                      )}
                    />
                  </View>
                  {errors.health_declaration && (
                    <Text className="text-xs text-primary">{errors.health_declaration.message}</Text>
                  )}
                </View>
              </View>

              {/* Real-time Checklist Preview Card */}
              <View className="bg-surface rounded-2xl p-5 border border-border shadow shadow-black/5">
                <Text className="text-sm font-semibold text-text-primary pb-2 border-b border-divider mb-3">
                  Eligibility Requirement Check
                </Text>
                <View className="gap-3">
                  {/* Age */}
                  <View className="flex-row items-center">
                    <View className="mr-3">
                      {liveEligibility.rules.age ? (
                        <Feather name="check-circle" size={16} color="#2E7D32" />
                      ) : (
                        <Feather name="x-circle" size={16} color="#C62828" />
                      )}
                    </View>
                    <Text className="text-xs text-text-primary">Age (21 years or older)</Text>
                  </View>

                  {/* Weight */}
                  <View className="flex-row items-center">
                    <View className="mr-3">
                      {liveEligibility.rules.weight ? (
                        <Feather name="check-circle" size={16} color="#2E7D32" />
                      ) : (
                        <Feather name="x-circle" size={16} color="#C62828" />
                      )}
                    </View>
                    <Text className="text-xs text-text-primary">Weight (100 kg or heavier)</Text>
                  </View>

                  {/* Wait Period */}
                  <View className="flex-row items-center">
                    <View className="mr-3">
                      {liveEligibility.rules.waitPeriod ? (
                        <Feather name="check-circle" size={16} color="#2E7D32" />
                      ) : (
                        <Feather name="x-circle" size={16} color="#C62828" />
                      )}
                    </View>
                    <Text className="text-xs text-text-primary">Wait period (30 days since last donation)</Text>
                  </View>

                  {/* Declaration */}
                  <View className="flex-row items-center">
                    <View className="mr-3">
                      {liveEligibility.rules.healthDeclaration ? (
                        <Feather name="check-circle" size={16} color="#2E7D32" />
                      ) : (
                        <Feather name="x-circle" size={16} color="#C62828" />
                      )}
                    </View>
                    <Text className="text-xs text-text-primary">Health declaration completed</Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3">
                {profile && (
                  <Pressable
                    className="flex-1 border border-border bg-surface rounded-xl min-h-[48px] items-center justify-center px-4"
                    onPress={() => setIsEditMode(false)}
                  >
                    <Text className="text-text-secondary font-semibold text-base">Cancel</Text>
                  </Pressable>
                )}
                <Pressable
                  className="flex-2 bg-primary rounded-xl min-h-[48px] items-center justify-center px-6 flex-row"
                  onPress={handleSubmit(onSubmit)}
                >
                  <Text className="text-white font-semibold text-base">Save Profile</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
