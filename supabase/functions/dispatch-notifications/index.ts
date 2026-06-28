import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  type: string;
  record_id: string;
}

const COMPATIBILITY_RECEIVE_MAP: Record<string, string[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();
    const { type, record_id: recordId } = payload;

    console.log(`Processing notification dispatch for type: ${type}, record_id: ${recordId}`);

    let recipientIds: string[] = [];
    let title = '';
    let body = '';
    let notificationType = '';
    let notificationData: any = {};

    if (type === 'new_request' || type === 'emergency') {
      // 1. Fetch Blood Request details
      const { data: request, error: requestError } = await supabase
        .from('blood_requests')
        .select('*, hospitals(name)')
        .eq('id', recordId)
        .single();

      if (requestError || !request) {
        throw new Error(`Failed to fetch blood request: ${requestError?.message}`);
      }

      const hospitalName = request.hospitals?.name || 'Hospital';
      const bloodGroup = request.blood_group;
      const urgency = request.urgency_level;
      const isEmergency = request.is_emergency;

      // Determine compatible groups
      const compatibleGroups = COMPATIBILITY_RECEIVE_MAP[bloodGroup] || [];

      // Query eligible compatible donors
      const { data: eligibleDonors, error: donorError } = await supabase
        .rpc('get_eligible_donors_by_blood_groups', { groups: compatibleGroups });

      if (donorError) {
        throw new Error(`Failed to fetch eligible compatible donors: ${donorError.message}`);
      }

      recipientIds = (eligibleDonors || []).map((d: { id: string }) => d.id);
      notificationType = isEmergency ? 'emergency' : 'new_request';
      
      title = isEmergency ? '🚨 EMERGENCY BLOOD REQUEST' : '🩸 New Blood Request';
      body = `${hospitalName} urgently requires ${request.quantity_needed} units of ${bloodGroup} (${urgency} priority).`;
      notificationData = { request_id: recordId };

    } else if (type === 'application_status') {
      // 2. Fetch Application details
      const { data: application, error: appError } = await supabase
        .from('donor_applications')
        .select('*, blood_requests(*, hospitals(name))')
        .eq('id', recordId)
        .single();

      if (appError || !application) {
        throw new Error(`Failed to fetch application: ${appError?.message}`);
      }

      const hospitalName = application.blood_requests?.hospitals?.name || 'Hospital';
      const status = application.status;
      recipientIds = [application.donor_id];
      notificationType = 'application_status';

      if (status === 'approved') {
        title = '🎉 Application Approved!';
        body = `Congratulations! Your application to donate blood at ${hospitalName} was approved. You can now schedule an appointment.`;
      } else {
        title = 'Application Status Update';
        body = `Thank you for applying. Unfortunately, your application to donate at ${hospitalName} was not accepted at this time.`;
      }
      notificationData = { application_id: recordId, request_id: application.request_id };

    } else if (type === 'appointment') {
      // 3. Fetch Appointment details
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*, hospitals(name)')
        .eq('id', recordId)
        .single();

      if (appointmentError || !appointment) {
        throw new Error(`Failed to fetch appointment: ${appointmentError?.message}`);
      }

      const hospitalName = appointment.hospitals?.name || 'Hospital';
      recipientIds = [appointment.donor_id];
      notificationType = 'appointment';

      const scheduledDate = new Date(appointment.scheduled_date);
      const dateString = scheduledDate.toLocaleDateString(undefined, { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      title = '📅 Appointment Scheduled';
      body = `Your donation appointment at ${hospitalName} has been scheduled for ${dateString}.`;
      notificationData = { appointment_id: recordId, application_id: appointment.application_id };

    } else if (type === 'donation_confirmed') {
      // 4. Fetch Completed Appointment details
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*, hospitals(name)')
        .eq('id', recordId)
        .single();

      if (appointmentError || !appointment) {
        throw new Error(`Failed to fetch completed appointment: ${appointmentError?.message}`);
      }

      const hospitalName = appointment.hospitals?.name || 'Hospital';
      recipientIds = [appointment.donor_id];
      notificationType = 'donation_confirmed';

      title = '❤️ Donation Confirmed';
      body = `Thank you! Your blood donation at ${hospitalName} has been successfully verified. Your contribution saves lives!`;
      notificationData = { appointment_id: recordId, application_id: appointment.application_id };
    }

    if (recipientIds.length === 0) {
      console.log('No recipients found for this notification. Exiting.');
      return new Response(JSON.stringify({ success: true, message: 'No recipients' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${recipientIds.length} recipient(s). Creating in-app notification rows.`);

    // 1. Insert in-app notifications in database (batch)
    const inAppNotifications = recipientIds.map(userId => ({
      user_id: userId,
      title,
      body,
      type: notificationType,
      data: notificationData,
      read: false
    }));

    // Split inserts into chunks of 100 to avoid limits
    const chunkSize = 100;
    for (let i = 0; i < inAppNotifications.length; i += chunkSize) {
      const chunk = inAppNotifications.slice(i, i + chunkSize);
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(chunk);
      if (insertError) {
        console.error(`Error inserting notifications batch: ${insertError.message}`);
      }
    }

    // 2. Fetch push tokens for these recipients
    const { data: tokenRows, error: tokenError } = await supabase
      .from('expo_push_tokens')
      .select('user_id, token')
      .in('user_id', recipientIds);

    if (tokenError) {
      console.error(`Error fetching push tokens: ${tokenError.message}`);
    }

    const pushTokens = tokenRows || [];
    console.log(`Found ${pushTokens.length} push token(s) registered for these recipients.`);

    if (pushTokens.length > 0) {
      // 3. Send notifications via Expo Push API
      const expoMessages = pushTokens.map(item => ({
        to: item.token,
        sound: 'default',
        title,
        body,
        data: notificationData,
        priority: type === 'emergency' ? 'high' : 'normal',
      }));

      // Send to Expo in batches of 100
      for (let i = 0; i < expoMessages.length; i += chunkSize) {
        const chunk = expoMessages.slice(i, i + chunkSize);
        try {
          const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'accept': 'application/json',
              'accept-encoding': 'gzip, deflate',
            },
            body: JSON.stringify(chunk),
          });

          const responseData = await expoResponse.json();
          console.log(`Expo Push API response for batch:`, JSON.stringify(responseData));

          // Check for tickets with DeviceNotRegistered errors
          if (responseData.data && Array.isArray(responseData.data)) {
            const badTokens: string[] = [];
            responseData.data.forEach((ticket: any, index: number) => {
              if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
                const badToken = chunk[index].to;
                console.log(`Registering bad push token for deletion: ${badToken}`);
                badTokens.push(badToken);
              }
            });

            if (badTokens.length > 0) {
              const { error: deleteError } = await supabase
                .from('expo_push_tokens')
                .delete()
                .in('token', badTokens);
              
              if (deleteError) {
                console.error(`Error cleaning up bad push tokens: ${deleteError.message}`);
              } else {
                console.log(`Cleaned up ${badTokens.length} invalid push token(s).`);
              }
            }
          }
        } catch (pushErr) {
          console.error(`HTTP request to Expo Push API failed for batch:`, pushErr);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, recipientsCount: recipientIds.length, pushTokensCount: pushTokens.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error(`Fatal error in dispatch-notifications function:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
