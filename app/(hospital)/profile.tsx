import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

import { useHospitalStore } from '@/stores/hospital.store';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useRouter } from 'expo-router';

// Zod validation schema for form inputs
const hospitalProfileSchema = zod.object({
  name: zod.string().min(2, 'Hospital/Blood Bank name must be at least 2 characters'),
  type: zod.enum(['hospital', 'blood_bank']),
  phone: zod.string().min(5, 'Phone number must be at least 5 digits'),
  address: zod.string().min(5, 'Address must be at least 5 characters'),
  latitude: zod.number().nullable().optional(),
  longitude: zod.number().nullable().optional(),
  logo_url: zod.string().nullable().optional(),
});

type FormValues = zod.infer<typeof hospitalProfileSchema>;

export default function HospitalProfileScreen() {
  const { profile, isLoading, fetchProfile, updateProfile, uploadLogo, clearProfile } = useHospitalStore();
  const { signOut } = useAuthStore();
  const router = useRouter();
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const [isEditMode, setIsEditMode] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(null);

  // Form setup
  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(hospitalProfileSchema),
    defaultValues: {
      name: '',
      type: 'hospital',
      phone: '',
      address: '',
      latitude: null,
      longitude: null,
      logo_url: null,
    },
  });

  useEffect(() => {
    fetchProfile().catch(() => {});
  }, []);

  // Sync profile data to form when edit mode is opened or profile changes
  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        type: profile.type,
        phone: profile.phone || '',
        address: profile.address || '',
        latitude: profile.latitude,
        longitude: profile.longitude,
        logo_url: profile.logo_url || null,
      });
      setLocalLogoUrl(profile.logo_url || null);
      setIsEditMode(false);
    } else if (!isLoading) {
      // If profile doesn't exist, enter onboarding mode (Edit Mode forced)
      setIsEditMode(true);
    }
  }, [profile, isLoading]);

  // Handle Logo Image Picking
  const handleSelectLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library permission is required to change logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images' as ImagePicker.MediaType],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setLogoUploading(true);

      // Crop and resize to 300x300px square JPEG
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 300, height: 300 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const logoUrl = await uploadLogo(manipulated.uri);
      setValue('logo_url', logoUrl);
      setLocalLogoUrl(logoUrl);
      Alert.alert('Success', 'Hospital logo updated successfully.');
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload logo image.');
    } finally {
      setLogoUploading(false);
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

      // Attempt reverse geocoding to retrieve address
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
        name: data.name,
        type: data.type,
        phone: data.phone || null,
        address: data.address,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        logo_url: data.logo_url || null,
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
          try {
            await signOut();
            clearProfile();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to sign out');
          }
        },
      },
    ]);
  };

  // Render Loader
  if (isLoading && !isEditMode && !logoUploading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#C62828" />
        <Text className="text-sm text-text-secondary mt-2">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  // Generate cache-busting logo URI
  const logoUri = localLogoUrl
    ? `${localLogoUrl}?t=${profile?.updated_at ? new Date(profile.updated_at).getTime() : Date.now()}`
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
                {profile ? 'Institution Profile' : 'Complete Profile'}
              </Text>
              <Text className="text-sm text-text-secondary mt-1">
                {profile ? 'Manage your hospital details and location' : 'Enter details to start requesting blood'}
              </Text>
            </View>

            {/* Bell Icon with Dynamic Badge */}
            <Pressable
              onPress={() => router.push('/(hospital)/notifications')}
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

          {/* Profile Card Header (Logo & Type) */}
          <View className="bg-surface rounded-2xl p-5 border border-border shadow shadow-black/5 items-center mb-5">
            <Pressable onPress={handleSelectLogo} className="relative mb-3">
              <View className="w-24 h-24 rounded-full bg-border items-center justify-center overflow-hidden border border-border">
                {logoUri ? (
                  <Image
                    source={{ uri: logoUri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <Feather name="plus" size={32} className="text-text-disabled" />
                )}
              </View>
              {logoUploading ? (
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
                <View className="flex-row items-center justify-center px-4">
                  <Text className="text-xl font-bold text-text-primary text-center">
                    {profile.name}
                  </Text>
                  {profile.verified && (
                    <View className="bg-success-bg px-2 py-0.5 rounded-full ml-2 flex-row items-center">
                      <Feather name="check-circle" size={12} color="#2E7D32" className="mr-1" />
                      <Text className="text-[10px] font-bold text-success">Verified</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-center mt-2 bg-primary/10 px-3 py-1 rounded-full">
                  <Text className="text-sm font-bold text-primary capitalize">
                    {profile.type.replace('_', ' ')}
                  </Text>
                </View>
              </>
            ) : (
              <Text className="text-base text-text-secondary font-semibold">New Institution Registration</Text>
            )}
          </View>

          {/* VIEW PROFILE MODE */}
          {!isEditMode && profile && (
            <View className="gap-5">
              {/* Institution Details Card */}
              <View className="bg-surface rounded-2xl p-5 border border-border shadow shadow-black/5 gap-4">
                <Text className="text-base font-semibold text-text-primary pb-2 border-b border-divider">
                  Institution Details
                </Text>

                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-text-secondary">Type</Text>
                  <Text className="text-sm text-text-primary capitalize">{profile.type.replace('_', ' ')}</Text>
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
                  <Text className="text-sm text-text-secondary mb-1">Physical Address</Text>
                  <Text className="text-sm text-text-primary leading-5">{profile.address}</Text>
                  {profile.latitude && profile.longitude && (
                    <Text className="text-xs text-text-disabled mt-2">
                      GPS Coordinates: {Number(profile.latitude).toFixed(5)}, {Number(profile.longitude).toFixed(5)}
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
                  {profile ? 'Edit Profile Details' : 'Institution Details'}
                </Text>

                {/* Institution Name */}
                <View>
                  <Text className="text-sm font-semibold text-text-secondary mb-2">Institution Name</Text>
                  <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className={`bg-background border rounded-xl px-4 py-3 ${errors.name ? 'border-primary' : 'border-border'}`}>
                        <TextInput
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          placeholder="e.g. General Hospital"
                          placeholderTextColor="#BDBDBD"
                          className="text-base text-text-primary"
                        />
                      </View>
                    )}
                  />
                  {errors.name && (
                    <Text className="text-xs text-primary mt-1">{errors.name.message}</Text>
                  )}
                </View>

                {/* Institution Type */}
                <View>
                  <Text className="text-sm font-semibold text-text-secondary mb-2">Type</Text>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field: { value } }) => (
                      <View className="flex-row gap-2">
                        {[
                          { key: 'hospital', label: 'Hospital' },
                          { key: 'blood_bank', label: 'Blood Bank' }
                        ].map((t) => {
                          const isSelected = value === t.key;
                          return (
                            <Pressable
                              key={t.key}
                              onPress={() => setValue('type', t.key as any)}
                              className={`flex-1 min-h-[44px] border rounded-xl items-center justify-center ${
                                isSelected
                                  ? 'bg-primary border-primary'
                                  : 'bg-background border-border'
                              }`}
                            >
                              <Text className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                                {t.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  />
                  {errors.type && (
                    <Text className="text-xs text-primary mt-1">{errors.type.message}</Text>
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
                          placeholder="e.g. +237 600 000 000"
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

                {/* Physical Address */}
                <View>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-sm font-semibold text-text-secondary">Physical Address</Text>
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
                          placeholder="Street Address, City, Country"
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
