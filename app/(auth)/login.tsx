import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/auth.store';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { signIn, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  // Clear errors when entering the screen
  useEffect(() => {
    clearError();
    return () => clearError();
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await signIn(data.email, data.password);
      // Redirection is handled by root _layout.tsx based on the updated session/role state.
    } catch (err) {
      // Errors are caught and saved in the store, displayed via error banner
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 48,
            paddingBottom: 40,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center py-6">
          {/* Logo / Header */}
          <View className="items-center mb-8">
            <Image
              source={require('@/assets/images/logo.png')}
              style={{ width: 80, height: 80, borderRadius: 20 }}
              contentFit="cover"
              transition={200}
            />
            <Text className="text-3xl font-bold text-text-primary mt-4">BloodLink</Text>
            <Text className="text-sm text-text-secondary mt-1 text-center">
              Donors register here. Hospital staff sign in with the authorized hospital account.
            </Text>
          </View>

          {/* Error Banner */}
          {error && (
            <View className="bg-error-bg border border-primary/10 rounded-xl p-3 mb-6 flex-row items-center gap-2">
              <Feather name="alert-triangle" size={20} color="#C62828" />
              <Text className="text-sm text-error font-medium flex-1">
                {error}
              </Text>
            </View>
          )}

          {/* Form */}
          <View className="gap-4 mb-6">
            {/* Email Input */}
            <View>
              <Text className="text-sm font-semibold text-text-secondary mb-2">
                Email Address
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    className={`bg-surface border ${
                      errors.email ? 'border-error' : 'border-border'
                    } rounded-xl px-4 py-3 min-h-[48px] flex-row items-center`}
                  >
                    <Feather
                      name="mail"
                      size={20}
                      color="#616161"
                      className="mr-3"
                    />
                    <TextInput
                      className="flex-1 text-base text-text-primary ml-2"
                      placeholder="Enter your email"
                      placeholderTextColor="#BDBDBD"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      editable={!isLoading}
                    />
                  </View>
                )}
              />
              {errors.email && (
                <Text className="text-xs font-semibold text-error mt-1 ml-1">
                  {errors.email.message}
                </Text>
              )}
            </View>

            {/* Password Input */}
            <View>
              <Text className="text-sm font-semibold text-text-secondary mb-2">
                Password
              </Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    className={`bg-surface border ${
                      errors.password ? 'border-error' : 'border-border'
                    } rounded-xl px-4 py-3 min-h-[48px] flex-row items-center`}
                  >
                    <Feather
                      name="lock"
                      size={20}
                      color="#616161"
                      className="mr-3"
                    />
                    <TextInput
                      className="flex-1 text-base text-text-primary ml-2"
                      placeholder="Enter your password"
                      placeholderTextColor="#BDBDBD"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      editable={!isLoading}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={12}
                    >
                      <Feather
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color="#616161"
                      />
                    </Pressable>
                  </View>
                )}
              />
              {errors.password && (
                <Text className="text-xs font-semibold text-error mt-1 ml-1">
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Forgot Password Link */}
            <View className="items-end">
              <Link href="/(auth)/forgot-password" asChild>
                <Pressable hitSlop={12}>
                  <Text className="text-sm font-semibold text-primary">
                    Forgot Password?
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            className={`rounded-xl min-h-[48px] items-center justify-center px-6 ${
              isLoading ? 'bg-primary-light' : 'bg-primary'
            }`}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-white font-semibold text-base">Sign In</Text>
            )}
          </Pressable>

          {/* Sign Up Navigation */}
          <View className="flex-row justify-center items-center mt-8 gap-1">
            <Text className="text-sm text-text-secondary">
Need a donor account?
            </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable hitSlop={12}>
                <Text className="text-sm font-bold text-primary">Register</Text>
              </Pressable>
            </Link>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
