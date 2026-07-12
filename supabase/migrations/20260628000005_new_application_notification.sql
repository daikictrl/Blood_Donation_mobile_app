-- Update trigger function to support new_application inserts
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
    IF (TG_OP = 'INSERT') THEN
      payload := jsonb_build_object(
        'type', 'new_application',
        'record_id', NEW.id
      );
    ELSIF (TG_OP = 'UPDATE') THEN
      IF (NEW.status = OLD.status OR NEW.status NOT IN ('approved', 'rejected')) THEN
        RETURN NEW;
      END IF;
      payload := jsonb_build_object(
        'type', 'application_status',
        'record_id', NEW.id
      );
    ELSE
      RETURN NEW;
    END IF;
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

-- Recreate trigger on donor_applications to fire on both INSERT and UPDATE OF status
DROP TRIGGER IF EXISTS trigger_application_notification ON public.donor_applications;
CREATE TRIGGER trigger_application_notification
  AFTER INSERT OR UPDATE OF status ON public.donor_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_notification_trigger();
