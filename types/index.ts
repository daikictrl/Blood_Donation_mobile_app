export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type UserRole = 'donor' | 'hospital';
export type UrgencyLevel = 'normal' | 'urgent' | 'emergency';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type NotificationType =
  | 'new_request'
  | 'application_status'
  | 'appointment'
  | 'emergency'
  | 'donation_confirmed';

export interface DonorProfile {
  id: string;
  full_name: string;
  blood_group: BloodGroup;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  weight: number;
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  last_donation_date: string | null;
  health_declaration: boolean;
  avatar_url: string | null;
  is_eligible: boolean;
  created_at: string;
  updated_at: string;
}

export interface HospitalProfile {
  id: string;
  name: string;
  type: 'hospital' | 'blood_bank';
  phone: string | null;
  email: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface BloodRequest {
  id: string;
  hospital_id: string;
  blood_group: BloodGroup;
  quantity_needed: number;
  urgency_level: UrgencyLevel;
  contact_info: string | null;
  hospital_address: string | null;
  notes: string | null;
  status: 'active' | 'fulfilled' | 'cancelled';
  is_emergency: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  hospital?: HospitalProfile;
  distance?: number | null;
  pending_applications_count?: number;
  total_applications_count?: number;
  approved_applications_count?: number;
  rejected_applications_count?: number;
}

export interface DonorApplication {
  id: string;
  donor_id: string;
  request_id: string;
  status: ApplicationStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
  donor?: DonorProfile;
  request?: BloodRequest;
  appointments?: Appointment[];
}

export interface Appointment {
  id: string;
  application_id: string;
  donor_id: string;
  hospital_id: string;
  scheduled_date: string;
  location: string | null;
  notes: string | null;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}

export interface DonationRecord {
  id: string;
  donor_id: string;
  hospital_id: string;
  appointment_id: string | null;
  blood_group: BloodGroup;
  units_donated: number;
  donation_date: string;
  notes: string | null;
  created_at: string;
  hospital?: HospitalProfile;
}

export interface BloodInventoryItem {
  id: string;
  hospital_id: string;
  blood_group: BloodGroup;
  units_available: number;
  last_updated: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}
