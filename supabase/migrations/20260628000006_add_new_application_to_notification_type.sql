-- Add 'new_application' to public.notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'new_application';
