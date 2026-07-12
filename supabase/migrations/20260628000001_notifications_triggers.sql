-- Enable pg_net extension for async HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper function to map recipient blood group to compatible donor groups in SQL
CREATE OR REPLACE FUNCTION public.get_compatible_donor_groups(recipient_group public.blood_group)
RETURNS public.blood_group[] AS $$
BEGIN
  CASE recipient_group
    WHEN 'O-' THEN RETURN ARRAY['O-']::public.blood_group[];
    WHEN 'O+' THEN RETURN ARRAY['O-', 'O+']::public.blood_group[];
    WHEN 'A-' THEN RETURN ARRAY['O-', 'A-']::public.blood_group[];
    WHEN 'A+' THEN RETURN ARRAY['O-', 'O+', 'A-', 'A+']::public.blood_group[];
    WHEN 'B-' THEN RETURN ARRAY['O-', 'B-']::public.blood_group[];
    WHEN 'B+' THEN RETURN ARRAY['O-', 'O+', 'B-', 'B+']::public.blood_group[];
    WHEN 'AB-' THEN RETURN ARRAY['O-', 'A-', 'B-', 'AB-']::public.blood_group[];
    WHEN 'AB+' THEN RETURN ARRAY['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']::public.blood_group[];
    ELSE RETURN ARRAY[]::public.blood_group[];
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper RPC to find eligible donors for a list of compatible blood groups
CREATE OR REPLACE FUNCTION public.get_eligible_donors_by_blood_groups(groups public.blood_group[])
RETURNS TABLE (id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id FROM public.donors d
  WHERE d.blood_group = ANY(groups)
    AND public.is_eligible(d) = true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger function to invoke Supabase Edge Function via pg_net
CREATE OR REPLACE FUNCTION public.handle_notification_trigger()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  service_role_key TEXT;
BEGIN
  -- Construct payload based on source table
  IF TG_TABLE_NAME = 'blood_requests' THEN
    payload := jsonb_build_object(
      'type', CASE WHEN NEW.is_emergency THEN 'emergency' ELSE 'new_request' END,
      'record_id', NEW.id
    );
  ELSIF TG_TABLE_NAME = 'donor_applications' THEN
    -- Only trigger on status updates that change to approved or rejected
    IF (TG_OP = 'UPDATE') THEN
      IF (NEW.status = OLD.status OR NEW.status NOT IN ('approved', 'rejected')) THEN
        RETURN NEW;
      END IF;
    END IF;
    payload := jsonb_build_object(
      'type', 'application_status',
      'record_id', NEW.id
    );
  ELSIF TG_TABLE_NAME = 'appointments' THEN
    IF (TG_OP = 'INSERT') THEN
      payload := jsonb_build_object(
        'type', 'appointment',
        'record_id', NEW.id
      );
    ELSIF (TG_OP = 'UPDATE') THEN
      -- Only trigger on appointment status transition to completed
      IF (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed') THEN
        payload := jsonb_build_object(
          'type', 'donation_confirmed',
          'record_id', NEW.id
        );
      ELSE
        RETURN NEW;
      END IF;
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Safely fetch the service_role key from Supabase Vault
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  -- If vault key is not found, raise warning and skip HTTP dispatch
  IF service_role_key IS NULL THEN
    RAISE WARNING 'service_role_key not found in vault.decrypted_secrets. Skipping notifications HTTP post.';
    RETURN NEW;
  END IF;

  -- Fire the Edge Function asynchronously via pg_net
  PERFORM net.http_post(
    url := 'https://lbkbgwevmnngojnwguro.supabase.co/functions/v1/dispatch-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_blood_request_notification ON public.blood_requests;
CREATE TRIGGER trigger_blood_request_notification
  AFTER INSERT ON public.blood_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_notification_trigger();

DROP TRIGGER IF EXISTS trigger_application_notification ON public.donor_applications;
CREATE TRIGGER trigger_application_notification
  AFTER UPDATE OF status ON public.donor_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_notification_trigger();

DROP TRIGGER IF EXISTS trigger_appointment_notification ON public.appointments;
CREATE TRIGGER trigger_appointment_notification
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_notification_trigger();
