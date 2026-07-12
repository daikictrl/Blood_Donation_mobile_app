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

const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Invalid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { signUp, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isMailSent, setIsMailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  useEffect(() => {
    clearError();
    return () => clearError();
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setRegisteredEmail(data.email);
      await signUp(data.email, data.password);

      setTimeout(() => {
        const currentSession = useAuthStore.getState().session;
        if (!currentSession) {
          setIsMailSent(true);
        }
      }, 500);
    } catch (err) {
      // Errors are caught and handled by store/displayed via banner
    }
  };

  if (isMailSent) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center px-4">
        <View className="bg-surface rounded-2xl p-6 shadow shadow-black/5 border border-border items-center">
          <View className="bg-success-bg p-4 rounded-full mb-4">
            <Feather name="mail" size={48} color="#2E7D32" />
          </View>
          <Text className="text-2xl font-bold text-text-primary text-center">
            Verify Your Email
          </Text>
          <Text className="text-base text-text-secondary mt-3 text-center px-2">
            We have sent a verification link to:
          </Text>
          <Text className="text-base font-semibold text-text-primary text-center mt-1">
            {registeredEmail}
          </Text>
          <Text className="text-sm text-text-secondary mt-4 text-center">
            Please check your inbox and follow the instructions to activate your donor account.
          </Text>

          <Link href="/(auth)/login" asChild>
            <Pressable className="bg-primary rounded-xl min-h-[48px] items-center justify-center px-6 w-full mt-6">
              <Text className="text-white font-semibold text-base">Back to Login</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

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
          <View className="mb-6">
            <Text className="text-2xl font-bold text-text-primary">
              Create Donor Account
            </Text>
            <Text className="text-sm text-text-secondary mt-1">
              Donor registration is open to everyone. Hospital access is handled through an authorized hospital account.
            </Text>
          </View>

          {error && (
            <View className="bg-error-bg border border-primary/10 rounded-xl p-3 mb-6 flex-row items-center gap-2">
              <Feather name="alert-triangle" size={20} color="#C62828" />
              <Text className="text-sm text-error font-medium flex-1">
                {error}
              </Text>
            </View>
          )}

          <View className="gap-4">
            <View className="bg-info-bg border border-info/10 rounded-2xl p-4 flex-row gap-3">
              <View className="bg-surface rounded-full p-3 self-start">
                <Feather name="user" size={22} color="#1565C0" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-text-primary">
                  Registering as a donor
                </Text>
                <Text className="text-sm text-text-secondary mt-1">
                  This account can complete a health profile, browse compatible requests, and apply to donate.
                </Text>
              </View>
            </View>

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
                    <Feather name="mail" size={20} color="#616161" className="mr-3" />
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
                    <Feather name="lock" size={20} color="#616161" className="mr-3" />
                    <TextInput
                      className="flex-1 text-base text-text-primary ml-2"
                      placeholder="Choose a password"
                      placeholderTextColor="#BDBDBD"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      editable={!isLoading}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={12}>
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

            <View>
              <Text className="text-sm font-semibold text-text-secondary mb-2">
                Confirm Password
              </Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    className={`bg-surface border ${
                      errors.confirmPassword ? 'border-error' : 'border-border'
                    } rounded-xl px-4 py-3 min-h-[48px] flex-row items-center`}
                  >
                    <Feather name="lock" size={20} color="#616161" className="mr-3" />
                    <TextInput
                      className="flex-1 text-base text-text-primary ml-2"
                      placeholder="Repeat your password"
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
                      hitSlop={12}
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
              {errors.confirmPassword && (
                <Text className="text-xs font-semibold text-error mt-1 ml-1">
                  {errors.confirmPassword.message}
                </Text>
              )}
            </View>

            <Pressable
              className={`rounded-xl min-h-[48px] items-center justify-center px-6 mt-2 ${
                isLoading ? 'bg-primary-light' : 'bg-primary'
              }`}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Register as Donor
                </Text>
              )}
            </Pressable>
          </View>

          <View className="flex-row justify-center items-center mt-8 gap-1">
            <Text className="text-sm text-text-secondary">
              Already have an account?
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable hitSlop={12}>
                <Text className="text-sm font-bold text-primary">Log In</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}