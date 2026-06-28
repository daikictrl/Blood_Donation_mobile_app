-- Create custom ENUM types
CREATE TYPE public.user_role AS ENUM ('donor', 'hospital');
CREATE TYPE public.blood_group AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
CREATE TYPE public.urgency_level AS ENUM ('normal', 'urgent', 'emergency');
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.hospital_type AS ENUM ('hospital', 'blood_bank');
CREATE TYPE public.blood_request_status AS ENUM ('active', 'fulfilled', 'cancelled');
CREATE TYPE public.notification_type AS ENUM ('new_request', 'application_status', 'appointment', 'emergency', 'donation_confirmed');
