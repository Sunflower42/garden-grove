import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Phone number required.' });

  // Normalize to E.164
  let cleaned = phone.replace(/[^+\d]/g, '');
  if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
  if (!/^\+\d{10,15}$/.test(cleaned)) {
    return res.status(400).json({ error: 'Enter a valid phone number.' });
  }

  try {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    const twilioRes = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: cleaned, Channel: 'sms' }),
      }
    );

    if (!twilioRes.ok) {
      const err = await twilioRes.json().catch(() => ({}));
      console.error('Twilio Verify error:', err);
      return res.status(400).json({ error: 'Failed to send code. Check your phone number.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('send-code error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}
