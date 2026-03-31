import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function derivePassword(phone, secret) {
  return crypto.createHmac('sha256', secret).update(phone).digest('hex');
}

// Convert phone to a fake email for Supabase auth
// This avoids all Phone provider complications
function phoneToEmail(phone) {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@gardengrove.phone`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, code } = req.body || {};
  if (!phone || !code) return res.status(400).json({ error: 'Phone and code required.' });

  let cleaned = phone.replace(/[^+\d]/g, '');
  if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;

  try {
    // Verify the code with Twilio
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    const twilioRes = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: cleaned, Code: code }),
      }
    );

    const twilioData = await twilioRes.json().catch(() => ({}));
    if (!twilioRes.ok || twilioData.status !== 'approved') {
      return res.status(400).json({ error: 'Invalid or expired code.' });
    }

    // Code verified — sign user into Supabase using email-based auth
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const email = phoneToEmail(cleaned);
    const password = derivePassword(cleaned, process.env.AUTH_SECRET);

    // Try to create the user
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { phone: cleaned },
    });

    if (createError) {
      if (createError.message.includes('already been registered')) {
        // User exists — update password in case AUTH_SECRET changed
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const existing = (listData?.users || []).find(u => u.email === email);
        if (existing) {
          await supabaseAdmin.auth.admin.updateUser(existing.id, { password });
        }
      } else {
        console.error('Create user error:', createError.message);
        return res.status(500).json({ error: 'Failed to create account: ' + createError.message });
      }
    }

    // Return credentials for client-side sign-in
    return res.status(200).json({ email, password });
  } catch (err) {
    console.error('verify-code error:', err.message);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}
