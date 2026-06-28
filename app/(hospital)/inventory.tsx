import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useHospitalStore } from '@/stores/hospital.store';
import { BloodGroup } from '@/types';

export default function BloodInventory() {
  const {
    profile,
    fetchProfile,
    inventory,
    isLoading,
    error,
    fetchInventory,
    addUnits,
    setStock,
    subscribeToInventory,
    unsubscribeFromInventory,
  } = useHospitalStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'set'>('add');
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        if (!profile) {
          await fetchProfile();
        }
        await fetchInventory();
      } catch (err) {
        // Error is set in store
      }
    };
    init();
  }, []);

  // Realtime subscription setup
  useEffect(() => {
    if (profile?.id) {
      subscribeToInventory();
    }
    return () => {
      unsubscribeFromInventory();
    };
  }, [profile?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchInventory();
    } catch (err) {
      // Handled in store
    } finally {
      setRefreshing(false);
    }
  };

  const openAdjustmentModal = (bloodGroup: BloodGroup, mode: 'add' | 'set') => {
    setSelectedGroup(bloodGroup);
    setModalMode(mode);
    setInputValue('');
    setModalError(null);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedGroup(null);
    setInputValue('');
    setModalError(null);
  };

  const handleInputChange = (text: string) => {
    // Only allow whole numbers
    const cleanText = text.replace(/[^0-9]/g, '');
    setInputValue(cleanText);
    
    if (selectedGroup) {
      const validation = validateInput(cleanText, modalMode);
      setModalError(validation.error);
    }
  };

  const validateInput = (value: string, mode: 'add' | 'set'): { valid: boolean; error: string | null; parsed: number } => {
    if (!value.trim()) {
      return { valid: false, error: 'Please enter a number of units', parsed: 0 };
    }
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      return { valid: false, error: 'Please enter a valid number', parsed: 0 };
    }

    if (parsed < 0) {
      return { valid: false, error: 'Units cannot be negative', parsed: 0 };
    }

    if (mode === 'add' && parsed === 0) {
      return { valid: false, error: 'Please enter a number greater than 0 to add', parsed: 0 };
    }

    return { valid: true, error: null, parsed };
  };

  const handleSave = async () => {
    if (!selectedGroup) return;

    const validation = validateInput(inputValue, modalMode);
    if (!validation.valid) {
      setModalError(validation.error);
      return;
    }

    setActionLoading(true);
    try {
      if (modalMode === 'add') {
        await addUnits(selectedGroup, validation.parsed);
      } else {
        await setStock(selectedGroup, validation.parsed);
      }
      handleCloseModal();
    } catch (err: any) {
      setModalError(err.message || 'Failed to update stock');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to format last updated time
  const formatLastUpdated = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 60000) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Sum total stock
  const totalStock = inventory.reduce((sum, item) => sum + (item.units_available || 0), 0);

  // Find info about the currently selected group for modal helper text
  const currentSelectedItem = selectedGroup
    ? inventory.find((item) => item.blood_group === selectedGroup)
    : null;
  const currentUnits = currentSelectedItem ? currentSelectedItem.units_available : 0;

  // Calculate new projected units
  const parsedValue = parseInt(inputValue, 10) || 0;
  const projectedUnits = modalMode === 'add' ? currentUnits + parsedValue : parsedValue;

  if (isLoading && inventory.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#C62828" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#C62828" />
        }
      >
        {/* Header Section */}
        <View className="mb-6 flex-row justify-between items-center">
          <View className="flex-1 mr-4">
            <Text className="text-2xl font-bold text-text-primary">Blood Stock</Text>
            <Text className="text-sm text-text-secondary mt-1">Manage your blood inventory levels</Text>
          </View>
          <View className="bg-primary/10 px-4 py-2 rounded-2xl items-end justify-center min-h-[48px]">
            <Text className="text-[10px] text-primary font-bold tracking-wider uppercase">Total Stock</Text>
            <Text className="text-xl font-bold text-primary">{totalStock} {totalStock === 1 ? 'unit' : 'units'}</Text>
          </View>
        </View>

        {/* Global Error Banner */}
        {error && (
          <View className="bg-error-bg p-4 rounded-xl mb-4 border border-error/20 flex-row items-center">
            <Feather name="alert-triangle" size={18} className="text-error mr-3" />
            <Text className="text-sm text-error flex-1 font-medium">{error}</Text>
          </View>
        )}

        {/* Inventory Cards List */}
        <View className="gap-3">
          {inventory.map((item) => {
            const isLowStock = item.units_available < 5;
            return (
              <View
                key={item.blood_group}
                className="bg-surface rounded-2xl p-4 shadow shadow-black/5 border border-border flex-row items-center justify-between"
              >
                {/* Left side: Blood group circle and Stock count */}
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-3 border border-primary/5">
                    <Text className="text-lg font-bold text-primary">{item.blood_group}</Text>
                  </View>
                  
                  <View className="flex-1">
                    <View className="flex-row items-center flex-wrap gap-2">
                      <Text className="text-lg font-semibold text-text-primary">
                        {item.units_available} {item.units_available === 1 ? 'unit' : 'units'}
                      </Text>
                      {isLowStock && (
                        <View className="bg-warning-bg px-2 py-0.5 rounded-full flex-row items-center border border-warning/10">
                          <Feather name="alert-triangle" size={10} className="text-warning mr-1" />
                          <Text className="text-[10px] font-bold text-warning uppercase">Low Stock</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-text-secondary mt-1">
                      Updated {formatLastUpdated(item.last_updated)}
                    </Text>
                  </View>
                </View>

                {/* Right side: Action buttons */}
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => openAdjustmentModal(item.blood_group, 'add')}
                    className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 min-h-[44px] items-center justify-center flex-row"
                  >
                    <Feather name="plus" size={14} className="text-primary mr-1" />
                    <Text className="text-primary font-semibold text-xs">Add</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => openAdjustmentModal(item.blood_group, 'set')}
                    className="border border-border rounded-xl px-4 py-2 min-h-[44px] items-center justify-center"
                  >
                    <Text className="text-text-secondary font-semibold text-xs">Set</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Stock Adjustment Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={handleCloseModal}>
          <Pressable onPress={(e) => e.stopPropagation()} className="w-full">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
              <View className="bg-surface rounded-t-3xl p-6 border-t border-border shadow-lg">
                {/* Modal Header */}
                <View className="flex-row justify-between items-center mb-6">
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center mr-2">
                      <Text className="text-sm font-bold text-primary">{selectedGroup}</Text>
                    </View>
                    <Text className="text-lg font-bold text-text-primary">Update Stock</Text>
                  </View>
                  <Pressable onPress={handleCloseModal} className="p-1">
                    <Feather name="x" size={24} className="text-text-secondary" />
                  </Pressable>
                </View>

                {/* Segmented Control Mode Tabs */}
                <View className="flex-row bg-background p-1 rounded-xl mb-6 border border-border/50">
                  <Pressable
                    onPress={() => {
                      setModalMode('add');
                      const val = validateInput(inputValue, 'add');
                      setModalError(val.error);
                    }}
                    className={`flex-1 py-3 items-center justify-center rounded-lg flex-row ${
                      modalMode === 'add' ? 'bg-surface shadow-sm border border-border/20' : ''
                    }`}
                  >
                    <Feather
                      name="plus"
                      size={14}
                      className={modalMode === 'add' ? 'text-primary mr-1' : 'text-text-secondary mr-1'}
                    />
                    <Text
                      className={`text-sm font-semibold ${
                        modalMode === 'add' ? 'text-primary font-bold' : 'text-text-secondary'
                      }`}
                    >
                      Add Units
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setModalMode('set');
                      const val = validateInput(inputValue, 'set');
                      setModalError(val.error);
                    }}
                    className={`flex-1 py-3 items-center justify-center rounded-lg flex-row ${
                      modalMode === 'set' ? 'bg-surface shadow-sm border border-border/20' : ''
                    }`}
                  >
                    <Feather
                      name="edit-2"
                      size={14}
                      className={modalMode === 'set' ? 'text-primary mr-1' : 'text-text-secondary mr-1'}
                    />
                    <Text
                      className={`text-sm font-semibold ${
                        modalMode === 'set' ? 'text-primary font-bold' : 'text-text-secondary'
                      }`}
                    >
                      Set Stock
                    </Text>
                  </Pressable>
                </View>

                {/* Info summary */}
                <View className="bg-background rounded-xl p-3 mb-6 border border-border/50 flex-row justify-between items-center">
                  <View>
                    <Text className="text-xs text-text-secondary">Current Stock</Text>
                    <Text className="text-base font-semibold text-text-primary mt-0.5">
                      {currentUnits} {currentUnits === 1 ? 'unit' : 'units'}
                    </Text>
                  </View>
                  <Feather name="arrow-right" size={16} className="text-text-secondary" />
                  <View className="items-end">
                    <Text className="text-xs text-text-secondary">Projected Stock</Text>
                    <Text className="text-base font-bold text-primary mt-0.5">
                      {projectedUnits} {projectedUnits === 1 ? 'unit' : 'units'}
                    </Text>
                  </View>
                </View>

                {/* Input Field */}
                <View className="mb-6">
                  <Text className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">
                    {modalMode === 'add' ? 'Number of units to add' : 'New absolute stock count'}
                  </Text>
                  <View
                    className={`bg-surface border rounded-xl px-4 py-3 flex-row items-center ${
                      modalError ? 'border-error' : 'border-border'
                    }`}
                  >
                    <TextInput
                      className="flex-1 text-base text-text-primary"
                      placeholder={modalMode === 'add' ? 'e.g. 5' : 'e.g. 15'}
                      placeholderTextColor="#BDBDBD"
                      keyboardType="number-pad"
                      value={inputValue}
                      onChangeText={handleInputChange}
                      autoFocus
                    />
                  </View>
                  {modalError && (
                    <Text className="text-xs text-error mt-2 font-medium">{modalError}</Text>
                  )}
                </View>

                {/* Action Buttons */}
                <View className="flex-row mt-2">
                  <Pressable
                    onPress={handleCloseModal}
                    className="border border-border rounded-xl py-3.5 items-center justify-center flex-1 mr-2 min-h-[48px]"
                  >
                    <Text className="text-text-secondary font-semibold text-base">Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSave}
                    disabled={actionLoading || modalError !== null || inputValue.trim() === ''}
                    className={`rounded-xl py-3.5 items-center justify-center flex-1 ml-2 min-h-[48px] flex-row ${
                      actionLoading || modalError !== null || inputValue.trim() === ''
                        ? 'bg-primary/50'
                        : 'bg-primary'
                    }`}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="check" size={16} color="#FFFFFF" className="mr-1.5" />
                        <Text className="text-white font-semibold text-base">Confirm</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
