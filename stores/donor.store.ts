import { create } from 'zustand';
import { File } from 'expo-file-system';
import { DonorProfile, BloodRequest, DonorApplication, Appointment, HospitalProfile, DonationRecord } from '@/types';
import { supabase } from '@/lib/supabase';
import { getDistanceKm } from '@/lib/location';
import { getCompatibleRecipientGroups } from '@/lib/blood-compat';
import { RealtimeChannel } from '@supabase/supabase-js';

interface DonorStore {
  profile: DonorProfile | null;
  requests: BloodRequest[];
  applications: DonorApplication[];
  donationHistory: DonationRecord[];
  isLoading: boolean;
  error: string | null;
  requestsChannel: RealtimeChannel | null;
  applicationsChannel: RealtimeChannel | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (
    profileData: Partial<Omit<DonorProfile, 'id' | 'is_eligible' | 'created_at' | 'updated_at'>>
  ) => Promise<void>;
  uploadAvatar: (uri: string) => Promise<string>;
  clearProfile: () => void;
  fetchRequests: () => Promise<void>;
  fetchRequestById: (id: string) => Promise<BloodRequest | null>;
  subscribeToRequests: () => void;
  unsubscribeFromRequests: () => void;
  fetchApplications: () => Promise<void>;
  subscribeToApplications: () => void;
  unsubscribeFromApplications: () => void;
  applyToRequest: (requestId: string, message?: string) => Promise<DonorApplication>;
  fetchApplicationForRequest: (requestId: string) => Promise<DonorApplication | null>;
  fetchAppointmentForApplication: (applicationId: string) => Promise<Appointment | null>;
  fetchAppointmentById: (id: string) => Promise<(Appointment & { hospital?: HospitalProfile }) | null>;
  refreshProfile: () => Promise<void>;
  fetchDonationHistory: () => Promise<void>;
  deleteDonationHistory: (id: string) => Promise<void>;
  fetchAppointment: (applicationId: string) => Promise<Appointment | null>;
}

export const useDonorStore = create<DonorStore>((set, get) => ({
  profile: null,
  requests: [],
  applications: [],
  donationHistory: [],
  isLoading: false,
  error: null,
  requestsChannel: null,
  applicationsChannel: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Query the computed field `is_eligible` from PostgREST
      const { data, error } = await supabase
        .from('donors')
        .select('*, is_eligible')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      set({ profile: data as DonorProfile | null });
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
        .from('donors')
        .upsert(upsertData);

      if (error) throw error;

      // Re-fetch profile from database to get correct computed field is_eligible
      await get().fetchProfile();
    } catch (err: any) {
      set({ error: err.message || 'Failed to update profile' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  uploadAvatar: async (uri) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Read the local image file using expo-file-system's File class
      const file = new File(uri);
      const arrayBuffer = await file.arrayBuffer();

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      // Upload file to avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Check if profile exists in database
      const { data: existingProfile } = await supabase
        .from('donors')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (existingProfile) {
        // Update only the avatar_url column (not a full upsert, to avoid NOT NULL constraint issues)
        const { error: updateError } = await supabase
          .from('donors')
          .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (updateError) throw updateError;

        // Re-fetch profile to sync state
        await get().fetchProfile();
      }

      return avatarUrl;
    } catch (err: any) {
      set({ error: err.message || 'Failed to upload avatar' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  clearProfile: () => {
    get().unsubscribeFromRequests();
    get().unsubscribeFromApplications();
    set({ profile: null, requests: [], applications: [], donationHistory: [], error: null, isLoading: false });
  },

  fetchRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      let donorProfile = get().profile;
      if (!donorProfile) {
        await get().fetchProfile();
        donorProfile = get().profile;
      }
      if (!donorProfile) {
        throw new Error('Donor profile not found');
      }

      const compatibleGroups = getCompatibleRecipientGroups(donorProfile.blood_group);

      const { data, error } = await supabase
        .from('blood_requests')
        .select('*, hospital:hospitals(*)')
        .eq('status', 'active')
        .in('blood_group', compatibleGroups);

      if (error) throw error;

      const donorLat = donorProfile.latitude;
      const donorLon = donorProfile.longitude;

      const requestsWithDistance = (data || []).map((req: any) => {
        let distance: number | null = null;
        if (
          donorLat != null &&
          donorLon != null &&
          req.hospital?.latitude != null &&
          req.hospital?.longitude != null
        ) {
          distance = getDistanceKm(
            Number(donorLat),
            Number(donorLon),
            Number(req.hospital.latitude),
            Number(req.hospital.longitude)
          );
        }
        return {
          ...req,
          distance,
        } as BloodRequest;
      });

      const sortedRequests = requestsWithDistance.sort((a, b) => {
        const isEmergencyA = a.is_emergency || a.urgency_level === 'emergency';
        const isEmergencyB = b.is_emergency || b.urgency_level === 'emergency';

        if (isEmergencyA && !isEmergencyB) return -1;
        if (!isEmergencyA && isEmergencyB) return 1;

        if (a.distance !== null && a.distance !== undefined && b.distance !== null && b.distance !== undefined) {
          return a.distance - b.distance;
        }

        if (a.distance !== null && a.distance !== undefined) return -1;
        if (b.distance !== null && b.distance !== undefined) return 1;

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      set({ requests: sortedRequests });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch requests' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRequestById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('blood_requests')
        .select('*, hospital:hospitals(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      const donorProfile = get().profile;
      let request = data as BloodRequest;
      if (
        donorProfile &&
        donorProfile.latitude != null &&
        donorProfile.longitude != null &&
        request.hospital?.latitude != null &&
        request.hospital?.longitude != null
      ) {
        const distance = getDistanceKm(
          Number(donorProfile.latitude),
          Number(donorProfile.longitude),
          Number(request.hospital.latitude),
          Number(request.hospital.longitude)
        );
        request = { ...request, distance };
      }

      return request;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch request details' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  subscribeToRequests: () => {
    const existingChannel = get().requestsChannel;
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel('blood_requests_feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'blood_requests',
        },
        async (payload) => {
          const newReq = payload.new as any;
          if (newReq.status !== 'active') return;

          let donorProfile = get().profile;
          if (!donorProfile) {
            await get().fetchProfile();
            donorProfile = get().profile;
          }
          if (!donorProfile) return;

          const compatibleGroups = getCompatibleRecipientGroups(donorProfile.blood_group);
          if (!compatibleGroups.includes(newReq.blood_group)) return;

          try {
            const { data, error } = await supabase
              .from('blood_requests')
              .select('*, hospital:hospitals(*)')
              .eq('id', newReq.id)
              .single();

            if (error || !data) return;

            const donorLat = donorProfile.latitude;
            const donorLon = donorProfile.longitude;
            let distance: number | null = null;
            
            if (
              donorLat != null &&
              donorLon != null &&
              data.hospital?.latitude != null &&
              data.hospital?.longitude != null
            ) {
              distance = getDistanceKm(
                Number(donorLat),
                Number(donorLon),
                Number(data.hospital.latitude),
                Number(data.hospital.longitude)
              );
            }

            const requestWithDistance = { ...data, distance } as BloodRequest;
            const currentRequests = get().requests;
            if (currentRequests.some((r) => r.id === requestWithDistance.id)) return;

            const updatedRequests = [requestWithDistance, ...currentRequests];

            const sortedRequests = updatedRequests.sort((a, b) => {
              const isEmergencyA = a.is_emergency || a.urgency_level === 'emergency';
              const isEmergencyB = b.is_emergency || b.urgency_level === 'emergency';

              if (isEmergencyA && !isEmergencyB) return -1;
              if (!isEmergencyA && isEmergencyB) return 1;

              if (a.distance !== null && a.distance !== undefined && b.distance !== null && b.distance !== undefined) {
                return a.distance - b.distance;
              }

              if (a.distance !== null && a.distance !== undefined) return -1;
              if (b.distance !== null && b.distance !== undefined) return 1;

              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            set({ requests: sortedRequests });
          } catch (fetchErr) {
            // Ignore fetch errors during subscription callback
          }
        }
      )
      .subscribe();

    set({ requestsChannel: channel });
  },

  unsubscribeFromRequests: () => {
    const channel = get().requestsChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ requestsChannel: null });
    }
  },

  applyToRequest: async (requestId: string, message?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('donor_applications')
        .insert({
          donor_id: user.id,
          request_id: requestId,
          status: 'pending',
          message: message || null,
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already applied to this blood request.');
        }
        throw error;
      }

      return data as DonorApplication;
    } catch (err: any) {
      const errMsg = err.message || 'Failed to submit application';
      set({ error: errMsg });
      throw new Error(errMsg);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchApplicationForRequest: async (requestId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('donor_applications')
        .select('*')
        .eq('donor_id', user.id)
        .eq('request_id', requestId)
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

  fetchAppointmentForApplication: async (applicationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('application_id', applicationId)
        .maybeSingle();

      if (error) throw error;
      return data as Appointment | null;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch appointment' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAppointmentById: async (appointmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, hospital:hospitals(*)')
        .eq('id', appointmentId)
        .maybeSingle();

      if (error) throw error;
      return data as (Appointment & { hospital?: HospitalProfile }) | null;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch appointment' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchApplications: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('donor_applications')
        .select('*, request:blood_requests(*, hospital:hospitals(*)), appointments(*)')
        .eq('donor_id', user.id)
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

  subscribeToApplications: () => {
    const existingChannel = get().applicationsChannel;
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const { profile } = get();
    if (!profile) return;

    const channel = supabase
      .channel('donor_applications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donor_applications',
          filter: `donor_id=eq.${profile.id}`,
        },
        async () => {
          await get().fetchApplications();
        }
      )
      .subscribe();

    set({ applicationsChannel: channel });
  },

  unsubscribeFromApplications: () => {
    const channel = get().applicationsChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ applicationsChannel: null });
    }
  },

  refreshProfile: async () => {
    await get().fetchProfile();
  },

  fetchDonationHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('donation_history')
        .select('*, hospital:hospitals(*)')
        .eq('donor_id', user.id)
        .order('donation_date', { ascending: false });

      if (error) throw error;
      set({ donationHistory: (data || []) as DonationRecord[] });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch donation history' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteDonationHistory: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('donation_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        donationHistory: state.donationHistory.filter((rec) => rec.id !== id),
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete donation record' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAppointment: async (applicationId: string) => {
    return get().fetchAppointmentForApplication(applicationId);
  },
}));
