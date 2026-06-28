-- Create core database tables

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role public.user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donors table
CREATE TABLE public.donors (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  blood_group public.blood_group NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  weight NUMERIC NOT NULL CHECK (weight >= 0),
  phone TEXT,
  email TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  last_donation_date DATE,
  health_declaration BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hospitals table
CREATE TABLE public.hospitals (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  type public.hospital_type NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  logo_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blood Requests table
CREATE TABLE public.blood_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL,
  blood_group public.blood_group NOT NULL,
  quantity_needed INTEGER NOT NULL CHECK (quantity_needed > 0),
  urgency_level public.urgency_level NOT NULL DEFAULT 'normal',
  contact_info TEXT,
  hospital_address TEXT,
  notes TEXT,
  status public.blood_request_status NOT NULL DEFAULT 'active',
  is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donor Applications table
CREATE TABLE public.donor_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id UUID REFERENCES public.donors(id) ON DELETE CASCADE NOT NULL,
  request_id UUID REFERENCES public.blood_requests(id) ON DELETE CASCADE NOT NULL,
  status public.application_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (donor_id, request_id)
);

-- Appointments table
CREATE TABLE public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES public.donor_applications(id) ON DELETE CASCADE NOT NULL,
  donor_id UUID REFERENCES public.donors(id) NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id) NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT,
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donation History table
CREATE TABLE public.donation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id UUID REFERENCES public.donors(id) NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id) NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  blood_group public.blood_group NOT NULL,
  units_donated INTEGER NOT NULL DEFAULT 1 CHECK (units_donated > 0),
  donation_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blood Inventory table
CREATE TABLE public.blood_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL,
  blood_group public.blood_group NOT NULL,
  units_available INTEGER NOT NULL DEFAULT 0 CHECK (units_available >= 0),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (hospital_id, blood_group)
);

-- In-app Notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type public.notification_type NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expo Push Tokens table
CREATE TABLE public.expo_push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, token)
);
