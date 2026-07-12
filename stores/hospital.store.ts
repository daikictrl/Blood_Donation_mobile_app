import { create } from 'zustand';
import { File } from 'expo-file-system';
import { HospitalProfile, BloodRequest, DonorApplication, Appointment, BloodInventoryItem, BloodGroup } from '@/types';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface HospitalStore {
  profile: HospitalProfile | null;
  requests: BloodRequest[];
  isLoading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (
    profileData: Partial<Omit<HospitalProfile, 'id' | 'verified' | 'created_at' | 'updated_at'>>
  ) => Promise<void>;
  uploadLogo: (uri: string) => Promise<string>;
  clearProfile: () => void;
  fetchRequests: () => Promise<void>;
  createRequest: (
    data: Omit<BloodRequest, 'id' | 'hospital_id' | 'status' | 'created_at' | 'updated_at'>
  ) => Promise<BloodRequest>;
  cancelRequest: (id: string) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  applications: DonorApplication[];
  fetchApplications: (requestId: string) => Promise<void>;
  approveApplication: (applicationId: string) => Promise<void>;
  rejectApplication: (applicationId: string) => Promise<void>;
  deleteApplication: (applicationId: string) => Promise<void>;
  fetchAppointment: (applicationId: string) => Promise<Appointment | null>;
  scheduleAppointment: (
    data: Omit<Appointment, 'id' | 'status' | 'created_at' | 'updated_at'>
  ) => Promise<Appointment>;
  cancelAppointment: (appointmentId: string) => Promise<Appointment>;
  fetchApplicationById: (applicationId: string) => Promise<DonorApplication | null>;
  confirmDonation: (
    appointmentId: string,
    donorId: string,
    bloodGroup: string,
    unitsDonated: number,
    notes: string | null
  ) => Promise<Appointment>;
  inventory: BloodInventoryItem[];
  inventoryChannel: RealtimeChannel | null;
  fetchInventory: () => Promise<void>;
  addUnits: (bloodGroup: BloodGroup, units: number) => Promise<void>;
  setStock: (bloodGroup: BloodGroup, units: number) => Promise<void>;
  subscribeToInventory: () => void;
  unsubscribeFromInventory: () => void;
}

export const useHospitalStore = create<HospitalStore>((set, get) => ({
  profile: null,
  requests: [],
  applications: [],
  inventory: [],
  inventoryChannel: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      set({ profile: data as HospitalProfile | null });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch profile' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const upsertData = {
        id: user.id,
        email: user.email,
        ...profileData,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('hospitals')
        .upsert(upsertData);

      if (error) throw error;

      // Re-fetch profile to sync state
      await get().fetchProfile();
    } catch (err: any) {
      set({ error: err.message || 'Failed to update profile' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  uploadLogo: async (uri) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Read local image file using expo-file-system File class
      const file = new File(uri);
      const arrayBuffer = await file.arrayBuffer();

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`;

      // Upload file to logos bucket
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      const logoUrl = urlData.publicUrl;

      // Check if profile exists in database
      const { data: existingProfile } = await supabase
        .from('hospitals')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (existingProfile) {
        // Update only the logo_url column
        const { error: updateError } = await supabase
          .from('hospitals')
          .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (updateError) throw updateError;

        // Re-fetch profile to sync state
        await get().fetchProfile();
      }

      return logoUrl;
    } catch (err: any) {
      set({ error: err.message || 'Failed to upload logo' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('blood_requests')
        .select('*, donor_applications(id, status)')
        .eq('hospital_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedRequests = (data || []).map((req: any) => {
        const pendingCount =
          req.donor_applications?.filter((app: any) => app.status === 'pending').length || 0;
        const approvedCount =
          req.donor_applications?.filter((app: any) => app.status === 'approved').length || 0;
        const rejectedCount =
          req.donor_applications?.filter((app: any) => app.status === 'rejected').length || 0;
        const totalCount = req.donor_applications?.length || 0;
        const { donor_applications, ...rest } = req;
        return {
          ...rest,
          pending_applications_count: pendingCount,
          approved_applications_count: approvedCount,
          rejected_applications_count: rejectedCount,
          total_applications_count: totalCount,
        } as BloodRequest;
      });

      set({ requests: formattedRequests });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch requests' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  createRequest: async (requestData) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const newRequest = {
        hospital_id: user.id,
        status: 'active',
        ...requestData,
      };

      const { data, error } = await supabase
        .from('blood_requests')
        .insert(newRequest)
        .select('*, donor_applications(id, status)')
        .single();

      if (error) throw error;

      const formattedRequest: BloodRequest = {
        ...(data as any),
        pending_applications_count: 0,
      };

      const currentRequests = get().requests;
      set({ requests: [formattedRequest, ...currentRequests] });

      return formattedRequest;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create request' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  cancelRequest: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('blood_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      const updatedRequests = get().requests.map((req) => {
        if (req.id === id) {
          return {
            ...req,
            status: 'cancelled' as const,
          };
        }
        return req;
      });

      set({ requests: updatedRequests });
    } catch (err: any) {
      set({ error: err.message || 'Failed to cancel request' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteRequest: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('blood_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updatedRequests = get().requests.filter((req) => req.id !== id);
      set({ requests: updatedRequests });
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete request' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  clearProfile: () => {
    const channel = get().inventoryChannel;
    if (channel) {
      supabase.removeChannel(channel);
    }
    set({
      profile: null,
      requests: [],
      applications: [],
      inventory: [],
      inventoryChannel: null,
      error: null,
      isLoading: false,
    });
  },

  fetchApplications: async (requestId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('donor_applications')
        .select('*, donor:donors(*, is_eligible), appointments(*)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ applications: (data || []) as DonorApplication[] });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch applications' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  approveApplication: async (applicationId) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('donor_applications')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', applicationId);

      if (error) throw error;

      const appToUpdate = get().applications.find((app) => app.id === applicationId);
      const requestId = appToUpdate?.request_id;

      set((state) => ({
        applications: state.applications.map((app) =>
          app.id === applicationId ? { ...app, status: 'approved' as const } : app
        ),
        requests: state.requests.map((req) => {
          if (req.id === requestId && req.pending_applications_count !== undefined) {
            return {
              ...req,
              pending_applications_count: Math.max(0, req.pending_applications_count - 1),
            };
          }
          return req;
        }),
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to approve application' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  rejectApplication: async (applicationId) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('donor_applications')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', applicationId);

      if (error) throw error;

      const appToUpdate = get().applications.find((app) => app.id === applicationId);
      const requestId = appToUpdate?.request_id;

      set((state) => ({
        applications: state.applications.map((app) =>
          app.id === applicationId ? { ...app, status: 'rejected' as const } : app
        ),
        requests: state.requests.map((req) => {
          if (req.id === requestId && req.pending_applications_count !== undefined) {
            return {
              ...req,
              pending_applications_count: Math.max(0, req.pending_applications_count - 1),
            };
          }
          return req;
        }),
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to reject application' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteApplication: async (applicationId) => {
    set({ isLoading: true, error: null });
    try {
      const appToDelete = get().applications.find((app) => app.id === applicationId);
      if (!appToDelete) throw new Error('Application not found');

      const requestId = appToDelete.request_id;
      const status = appToDelete.status;

      const { error } = await supabase
        .from('donor_applications')
        .delete()
        .eq('id', applicationId);

      if (error) throw error;

      set((state) => {
        const updatedApplications = state.applications.filter((app) => app.id !== applicationId);

        const updatedRequests = state.requests.map((req) => {
          if (req.id === requestId) {
            const pendingCount = status === 'pending'
              ? Math.max(0, (req.pending_applications_count || 0) - 1)
              : (req.pending_applications_count || 0);

            const approvedCount = status === 'approved'
              ? Math.max(0, (req.approved_applications_count || 0) - 1)
              : (req.approved_applications_count || 0);

            const rejectedCount = status === 'rejected'
              ? Math.max(0, (req.rejected_applications_count || 0) - 1)
              : (req.rejected_applications_count || 0);

            const totalCount = Math.max(0, (req.total_applications_count || 0) - 1);

            return {
              ...req,
              pending_applications_count: pendingCount,
              approved_applications_count: approvedCount,
              rejected_applications_count: rejectedCount,
              total_applications_count: totalCount,
            };
          }
          return req;
        });

        return {
          applications: updatedApplications,
          requests: updatedRequests,
        };
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete application' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAppointment: async (applicationId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data && data.length > 0 ? (data[0] as Appointment) : null;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch appointment' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  scheduleAppointment: async (appointmentData) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          ...appointmentData,
          status: 'scheduled',
        })
        .select('*')
        .single();

      if (error) throw error;

      // Update applications state in store
      set((state) => {
        const updatedApplications = state.applications.map((app) => {
          if (app.id === appointmentData.application_id) {
            const appointments = app.appointments ? [...app.appointments] : [];
            const existingIdx = appointments.findIndex((apt) => apt.id === data.id);
            if (existingIdx > -1) {
              appointments[existingIdx] = data as Appointment;
            } else {
              appointments.push(data as Appointment);
            }
            return { ...app, appointments };
          }
          return app;
        });
        return { applications: updatedApplications };
      });

      return data as Appointment;
    } catch (err: any) {
      set({ error: err.message || 'Failed to schedule appointment' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  cancelAppointment: async (appointmentId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId)
        .select('*')
        .single();

      if (error) throw error;

      // Update applications state in store
      set((state) => {
        const updatedApplications = state.applications.map((app) => {
          if (app.id === data.application_id) {
            const appointments = app.appointments ? [...app.appointments] : [];
            const existingIdx = appointments.findIndex((apt) => apt.id === data.id);
            if (existingIdx > -1) {
              appointments[existingIdx] = data as Appointment;
            } else {
              appointments.push(data as Appointment);
            }
            return { ...app, appointments };
          }
          return app;
        });
        return { applications: updatedApplications };
      });

      return data as Appointment;
    } catch (err: any) {
      set({ error: err.message || 'Failed to cancel appointment' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchApplicationById: async (applicationId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('donor_applications')
        .select('*, donor:donors(*), appointments(*)')
        .eq('id', applicationId)
        .maybeSingle();

      if (error) throw error;
      return data as DonorApplication | null;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch application' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  confirmDonation: async (appointmentId, donorId, bloodGroup, unitsDonated, notes) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('confirm_donation', {
        p_appointment_id: appointmentId,
        p_donor_id: donorId,
        p_hospital_id: user.id,
        p_blood_group: bloodGroup,
        p_units_donated: unitsDonated,
        p_donation_date: today,
        p_notes: notes,
      });

      if (error) throw error;

      // Fetch the updated appointment to return it
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (fetchError) throw fetchError;

      // Update applications state in store
      set((state) => {
        const updatedApplications = state.applications.map((app) => {
          if (app.id === appointment.application_id) {
            const appointments = app.appointments ? [...app.appointments] : [];
            const existingIdx = appointments.findIndex((apt) => apt.id === appointment.id);
            if (existingIdx > -1) {
              appointments[existingIdx] = appointment as Appointment;
            } else {
              appointments.push(appointment as Appointment);
            }
            return { ...app, appointments };
          }
          return app;
        });
        return { applications: updatedApplications };
      });

      return appointment as Appointment;
    } catch (err: any) {
      set({ error: err.message || 'Failed to confirm donation' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchInventory: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('blood_inventory')
        .select('*')
        .eq('hospital_id', user.id);

      if (error) throw error;

      const existingItems = data || [];
      const allBloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

      const completeInventory = allBloodGroups.map((bg) => {
        const existing = existingItems.find((item: any) => item.blood_group === bg);
        if (existing) {
          return existing as BloodInventoryItem;
        } else {
          return {
            id: '',
            hospital_id: user.id,
            blood_group: bg,
            units_available: 0,
            last_updated: new Date().toISOString(),
          } as BloodInventoryItem;
        }
      });

      set({ inventory: completeInventory });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch inventory' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  addUnits: async (bloodGroup, units) => {
    if (units < 0) throw new Error('Units cannot be negative');
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const currentItem = get().inventory.find((item) => item.blood_group === bloodGroup);
      const currentUnits = currentItem ? currentItem.units_available : 0;
      const newUnits = currentUnits + units;

      const { data, error } = await supabase
        .from('blood_inventory')
        .upsert(
          {
            hospital_id: user.id,
            blood_group: bloodGroup,
            units_available: newUnits,
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'hospital_id,blood_group' }
        )
        .select()
        .single();

      if (error) throw error;

      set((state) => {
        const updatedInventory = state.inventory.map((item) =>
          item.blood_group === bloodGroup ? (data as BloodInventoryItem) : item
        );
        return { inventory: updatedInventory };
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to add units' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  setStock: async (bloodGroup, units) => {
    if (units < 0) throw new Error('Units cannot be negative');
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('blood_inventory')
        .upsert(
          {
            hospital_id: user.id,
            blood_group: bloodGroup,
            units_available: units,
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'hospital_id,blood_group' }
        )
        .select()
        .single();

      if (error) throw error;

      set((state) => {
        const updatedInventory = state.inventory.map((item) =>
          item.blood_group === bloodGroup ? (data as BloodInventoryItem) : item
        );
        return { inventory: updatedInventory };
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to set stock' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  subscribeToInventory: () => {
    const existingChannel = get().inventoryChannel;
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const { profile } = get();
    if (!profile) return;

    const channel = supabase
      .channel(`hospital_inventory_${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blood_inventory',
          filter: `hospital_id=eq.${profile.id}`,
        },
        async (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          const eventType = payload.eventType;

          if (eventType === 'DELETE') {
            set((state) => {
              const updatedInventory = state.inventory.map((item) =>
                item.blood_group === oldRow.blood_group
                  ? {
                      ...item,
                      id: '',
                      units_available: 0,
                      last_updated: new Date().toISOString(),
                    }
                  : item
              );
              return { inventory: updatedInventory };
            });
          } else {
            set((state) => {
              const updatedInventory = state.inventory.map((item) =>
                item.blood_group === newRow.blood_group
                  ? (newRow as BloodInventoryItem)
                  : item
              );
              return { inventory: updatedInventory };
            });
          }
        }
      )
      .subscribe();

    set({ inventoryChannel: channel });
  },

  unsubscribeFromInventory: () => {
    const channel = get().inventoryChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ inventoryChannel: null });
    }
  },
}));
