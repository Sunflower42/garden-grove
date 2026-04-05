import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { Leaf, Phone, ArrowRight, Loader2 } from 'lucide-react';

export default function AuthGate({ children }) {
  const { user, loading } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'code'
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If supabase isn't configured, skip auth entirely (local dev without env vars)
  if (!supabase) return children;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-cream">
        <Loader2 className="w-8 h-8 text-forest animate-spin" />
      </div>
    );
  }

  if (user) return children;

  // Normalize phone to E.164 format
  const normalizePhone = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;
    if (raw.startsWith('+')) return raw;
    return `+${digits}`;
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const normalized = normalizePhone(phone);
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalized });
      if (otpError) throw otpError;
      setPhone(normalized);
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });
      if (verifyError) throw verifyError;
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-cream grain-texture">
      <div className="w-full max-w-sm" style={{ padding: 32 }}>
        {/* Logo */}
        <div className="text-center" style={{ marginBottom: 32 }}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-forest to-forest-deep flex items-center justify-center shadow-lg mx-auto">
            <Leaf className="w-8 h-8 text-cream" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-forest-deep" style={{ marginTop: 16 }}>
            Garden Grove
          </h1>
          <p className="text-sm text-sage-dark" style={{ marginTop: 4 }}>
            {step === 'phone' ? 'Sign in with your phone number' : 'Enter the code we sent you'}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-dark/50" />
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                className="w-full rounded-xl border border-sage/20 bg-white text-sm text-soil focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest/40 placeholder:text-sage/50"
                style={{ padding: '12px 12px 12px 40px' }}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-xs text-bloom-red" style={{ padding: '0 4px' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center rounded-xl bg-forest text-cream text-sm font-medium hover:bg-forest-deep transition-colors disabled:opacity-60"
              style={{ padding: '12px 16px', gap: 8, marginTop: 4 }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Send Code
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="text-xs text-sage-dark text-center" style={{ marginBottom: 4 }}>
              Code sent to <strong>{phone}</strong>
            </p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              className="w-full rounded-xl border border-sage/20 bg-white text-sm text-soil text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest/40 placeholder:text-sage/50 placeholder:tracking-normal"
              style={{ padding: '12px 16px', fontSize: 18 }}
              autoFocus
            />

            {error && (
              <p className="text-xs text-bloom-red" style={{ padding: '0 4px' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || otp.length < 6}
              className="w-full flex items-center justify-center rounded-xl bg-forest text-cream text-sm font-medium hover:bg-forest-deep transition-colors disabled:opacity-60"
              style={{ padding: '12px 16px', gap: 8, marginTop: 4 }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Verify & Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              className="text-xs text-forest font-medium hover:text-forest-deep transition-colors text-center"
              style={{ marginTop: 4 }}
            >
              Use a different number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
