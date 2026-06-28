import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { AppNotification } from '@/types';
import { useNotificationStore } from '@/stores/notification.store';

interface NotificationItemProps {
  notification: AppNotification;
  onPress?: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
}) => {
  const router = useRouter();
  const markAsRead = useNotificationStore((state) => state.markAsRead);

  const getIconConfig = () => {
    switch (notification.type) {
      case 'emergency':
        return { name: 'alert-triangle' as const, color: '#FF1744', bgClass: 'bg-error-bg' }; // emergency
      case 'new_request':
        return { name: 'droplet' as const, color: '#C62828', bgClass: 'bg-error-bg' }; // primary
      case 'application_status':
        // If data status is rejected, color error, else success
        const isRejected = notification.data?.status === 'rejected';
        return {
          name: (isRejected ? 'x-circle' : 'check-circle') as React.ComponentProps<typeof Feather>['name'],
          color: isRejected ? '#C62828' : '#2E7D32',
          bgClass: isRejected ? 'bg-error-bg' : 'bg-success-bg',
        };
      case 'appointment':
        return { name: 'calendar' as const, color: '#1565C0', bgClass: 'bg-info-bg' }; // info blue
      case 'donation_confirmed':
        return { name: 'heart' as const, color: '#2E7D32', bgClass: 'bg-success-bg' }; // success green
      default:
        return { name: 'bell' as const, color: '#616161', bgClass: 'bg-divider' };
    }
  };

  const iconConfig = getIconConfig();

  const handlePress = async () => {
    try {
      await markAsRead(notification.id);
      if (onPress) {
        onPress();
      }

      const data = notification.data || {};

      switch (notification.type) {
        case 'new_request':
        case 'emergency':
          if (data.request_id) {
            router.push({
              pathname: '/(donor)/request/[id]',
              params: { id: data.request_id as string }
            });
          }
          break;
        case 'application_status':
          router.push('/(donor)/applications');
          break;
        case 'appointment':
          if (data.appointment_id) {
            router.push({
              pathname: '/(donor)/appointment/[id]',
              params: { id: data.appointment_id as string }
            });
          } else {
            router.push('/(donor)/applications');
          }
          break;
        case 'donation_confirmed':
          router.push('/(donor)/history');
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('Failed to navigate from notification tap:', err);
    }
  };

  const formattedTime = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  });

  return (
    <Pressable
      onPress={handlePress}
      className={`bg-surface rounded-2xl p-4 border border-border shadow shadow-black/5 flex-row items-start mb-3 ${
        !notification.read ? 'border-l-4 border-l-primary' : ''
      }`}
    >
      <View
        className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${iconConfig.bgClass}`}
      >
        <Feather name={iconConfig.name} size={20} color={iconConfig.color} />
      </View>

      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-base text-text-primary ${
              !notification.read ? 'font-semibold' : 'font-medium'
            }`}
          >
            {notification.title}
          </Text>
          {!notification.read && (
            <View className="w-2.5 h-2.5 rounded-full bg-primary ml-2" />
          )}
        </View>

        <Text className="text-sm text-text-secondary mt-1 leading-relaxed">
          {notification.body}
        </Text>

        <Text className="text-xs text-text-disabled mt-2">{formattedTime}</Text>
      </View>
    </Pressable>
  );
};
