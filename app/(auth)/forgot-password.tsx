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
import { useAuthStore } from '@/stores/auth.store';

// Validation Schema for Step 1 (Request OTP)
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Validation Schema for Step 2 (Reset Password)
const resetPasswordSchema = z.object({
  code: z
    .string()
    .trim()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d+$/, 'Code must be numeric'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ForgotPasswordScreen() {
  const { resetPassword, verifyAndResetPassword, isLoading, error, clearError } = useAuthStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Clear errors when changing steps or entering the screen
  useEffect(() => {
    clearError();
    return () => clearError();
  }, [step]);

  // Form for Step 1
  const {
    control: emailControl,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // Form for Step 2
  const {
    control: resetControl,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
    reset: resetForm2,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      code: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onEmailSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setSubmittedEmail(data.email);
      await resetPassword(data.email);
      setStep(2);
    } catch (err) {
      // Error handled by store
    }
  };

  const onResetSubmit = async (data: ResetPasswordFormData) => {
    try {
      await verifyAndResetPassword(submittedEmail, data.code, data.password);
      // If successful, Zustand auth listener triggers app redirect.
    } catch (err) {
      // Error handled by store
    }
  };

  const handleResendCode = async () => {
    try {
      setResendSuccess(false);
      clearError();
      await resetPassword(submittedEmail);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      // Error handled by store
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 24,
            paddingBottom: 40,
            flexGrow: 1,
            justifyContent: 'center',
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-text-primary">
              Reset Password
            </Text>
            <Text className="text-sm text-text-secondary mt-1">
              {step === 1
                ? 'Enter your email to receive a 6-digit verification code'
                : `We sent a 6-digit code to ${submittedEmail}`}
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

          {/* Resend Success Banner */}
          {resendSuccess && (
            <View className="bg-success-bg border border-success/10 rounded-xl p-3 mb-6 flex-row items-center gap-2">
              <Feather name="check-circle" size={20} color="#2E7D32" />
              <Text className="text-sm text-success font-medium flex-1">
                Verification code resent successfully!
              </Text>
            </View>
          )}

          {step === 1 ? (
            /* STEP 1: REQUEST OTP */
            <View className="gap-4">
              <View>
                <Text className="text-sm font-semibold text-text-secondary mb-2">
                  Email Address
                </Text>
                <Controller
                  control={emailControl}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View
                      className={`bg-surface border ${
                        emailErrors.email ? 'border-error' : 'border-border'
                      } rounded-xl px-4 py-3 min-h-[48px] flex-row items-center`}
                    >
                      <Feather
                        name="mail"
                        size={20}
                        color="#616161"
                      />
                      <TextInput
                        className="flex-1 text-base text-text-primary ml-3"
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
                {emailErrors.email && (
                  <Text className="text-xs font-semibold text-error mt-1 ml-1">
                    {emailErrors.email.message}
                  </Text>
                )}
              </View>

              {/* Submit Button */}
              <Pressable
                className={`rounded-xl min-h-[48px] items-center justify-center px-6 mt-2 ${
                  isLoading ? 'bg-primary-light' : 'bg-primary'
                }`}
                onPress={handleEmailSubmit(onEmailSubmit)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Send Reset Code
                  </Text>
                )}
              </Pressable>

              {/* Back to Login Link */}
              <View className="flex-row justify-center items-center mt-6">
                <Link href="/(auth)/login" asChild>
                  <Pressable hitSlop={12} className="flex-row items-center gap-2">
                    <Feather name="arrow-left" size={16} color="#C62828" />
                    <Text className="text-sm font-bold text-primary">
                      Back to Login
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          ) : (
            /* STEP 2: VERIFY CODE & UPDATE PASSWORD */
            <View className="gap-4">
              {/* OTP Code */}
              <View>
                <Text className="text-sm font-semibold text-text-secondary mb-2">
                  Verification Code (6 Digits)
                </Text>
                <Controller
                  control={resetControl}
                  name="code"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View
                      className={`bg-surface border ${
                        resetErrors.code ? 'border-error' : 'border-border'
                      } rounded-xl px-4 py-3 min-h-[48px] flex-row items-center`}
                    >
                      <Feather
                        name="key"
                        size={20}
                        color="#616161"
                      />
                      <TextInput
                        className="flex-1 text-base text-text-primary ml-3"
                        placeholder="Enter 6-digit code"
                        placeholderTextColor="#BDBDBD"
                        keyboardType="number-pad"
                        maxLength={6}
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
                {resetErrors.code && (
                  <Text className="text-xs font-semibold text-error mt-1 ml-1">
                    {resetErrors.code.message}
                  </Text>
                )}
              </View>

              {/* New Password */}
              <View>
                <Text className="text-sm font-semibold text-text-secondary mb-2">
                  New Password
                </Text>
                <Controller
                  control={resetControl}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View
                      className={`bg-surface border ${
                        resetErrors.password ? 'border-error' : 'border-border'
                      } rounded-xl px-4 py-3 min-h-[48px] flex-row items-center`}
                    >
                      <Feather
                        name="lock"
                        size={20}
                        color="#616161"
                      />
                      <TextInput
                        className="flex-1 text-base text-text-primary ml-3"
                        placeholder="Enter new password"
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
                        hitSlop={8}
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
                {resetErrors.password && (
                  <Text className="text-xs font-semibold text-error mt-1 ml-1">
                    {resetErrors.password.message}
                  </Text>
                )}
              </View>

              {/* Confirm New Password */}
              <View>
                <Text className="text-sm font-semibold text-text-secondary mb-2">
                  Confirm Password
                </Text>
                <Controller
                  control={resetControl}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View
                      className={`bg-surface border ${
                        resetErrors.confirmPassword ? 'border-error' : 'border-border'
                      } rounded-xl px-4 py-3 min-h-[48px] flex-row items-center`}
                    >
                      <Feather
                        name="lock"
                        size={20}
                        color="#616161"
                      />
                      <TextInput
                        className="flex-1 text-base text-text-primary ml-3"
                        placeholder="Confirm new password"
                        placeholderTextColor="#BDBDBD"
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        editable={!isLoading}
                      />
                      <Pressable
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        hitSlop={8}
                      >
                        <Feather
                          name={showConfirmPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color="#616161"
                        />
                      </Pressable>
                    </View>
                  )}
                />
                {resetErrors.confirmPassword && (
                  <Text className="text-xs font-semibold text-error mt-1 ml-1">
                    {resetErrors.confirmPassword.message}
                  </Text>
                )}
              </View>

              {/* Submit Button */}
              <Pressable
                className={`rounded-xl min-h-[48px] items-center justify-center px-6 mt-2 ${
                  isLoading ? 'bg-primary-light' : 'bg-primary'
                }`}
                onPress={handleResetSubmit(onResetSubmit)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Reset Password & Login
                  </Text>
                )}
              </Pressable>

              {/* Resend and Back buttons */}
              <View className="flex-row justify-between items-center mt-6">
                <Pressable
                  hitSlop={12}
                  onPress={handleResendCode}
                  disabled={isLoading}
                  className="flex-row items-center gap-2"
                >
                  <Feather name="refresh-cw" size={16} color="#616161" />
                  <Text className="text-sm font-semibold text-text-secondary">
                    Resend Code
                  </Text>
                </Pressable>

                <Pressable
                  hitSlop={12}
                  onPress={() => {
                    setStep(1);
                    resetForm2();
                  }}
                  disabled={isLoading}
                  className="flex-row items-center gap-2"
                >
                  <Feather name="arrow-left" size={16} color="#C62828" />
                  <Text className="text-sm font-bold text-primary">
                    Change Email
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
