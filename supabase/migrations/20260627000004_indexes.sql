-- Create indexes for foreign keys and common query filters

-- Blood Requests
CREATE INDEX idx_blood_requests_hospital_id ON public.blood_requests(hospital_id);
CREATE INDEX idx_blood_requests_status ON public.blood_requests(status);

-- Donor Applications
CREATE INDEX idx_donor_applications_donor_id ON public.donor_applications(donor_id);
CREATE INDEX idx_donor_applications_request_id ON public.donor_applications(request_id);

-- Appointments
CREATE INDEX idx_appointments_application_id ON public.appointments(application_id);
CREATE INDEX idx_appointments_donor_id ON public.appointments(donor_id);
CREATE INDEX idx_appointments_hospital_id ON public.appointments(hospital_id);

-- Donation History
CREATE INDEX idx_donation_history_donor_id ON public.donation_history(donor_id);
CREATE INDEX idx_donation_history_hospital_id ON public.donation_history(hospital_id);
CREATE INDEX idx_donation_history_appointment_id ON public.donation_history(appointment_id);

-- Blood Inventory
CREATE INDEX idx_blood_inventory_hospital_id ON public.blood_inventory(hospital_id);

-- Notifications
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- Expo Push Tokens
CREATE INDEX idx_expo_push_tokens_user_id ON public.expo_push_tokens(user_id);
