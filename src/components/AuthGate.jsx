import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { ArrowRight, Loader2, Phone } from 'lucide-react';

// Same botanical background as Onboarding
function BotanicalBg() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(160deg, #1A2E1A 0%, #2D4A2D 30%, #3A5A3A 60%, #2D4A2D 100%)',
      }} />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(139,158,126,0.15) 0%, transparent 70%)' }} />
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.08" stroke="#A8B99C" fill="none" strokeWidth="1.5">
          <path d="M-20 200 Q80 180 120 80 Q140 20 200 -20" />
          <path d="M-20 200 Q60 200 100 140" />
          <path d="M-20 200 Q40 160 80 100" />
          <path d="M-20 200 Q80 220 160 180 Q200 160 240 100" />
          <path d="M-20 200 Q60 240 140 220" />
        </g>
        <g opacity="0.06" stroke="#8B9E7E" fill="none" strokeWidth="1" transform="translate(1200, 100)">
          <path d="M100 0 Q80 60 60 120 Q40 200 50 300 Q60 400 40 500" />
          <path d="M100 0 Q120 40 160 60" />
          <path d="M90 50 Q110 80 150 100" />
          <path d="M80 100 Q100 130 140 140" />
          <path d="M70 150 Q90 170 130 180" />
          <path d="M65 200 Q85 220 120 225" />
          <path d="M60 250 Q80 265 110 268" />
          <path d="M55 300 Q75 310 100 310" />
          <path d="M50 350 Q65 355 85 350" />
          <path d="M100 0 Q70 30 30 20" />
          <path d="M90 50 Q60 70 20 60" />
          <path d="M80 100 Q50 110 10 95" />
          <path d="M70 150 Q40 155 0 140" />
          <path d="M65 200 Q35 200 -5 185" />
        </g>
        <g opacity="0.05" stroke="#A8B99C" fill="none" strokeWidth="1">
          <ellipse cx="200" cy="750" rx="30" ry="12" transform="rotate(-20 200 750)" />
          <ellipse cx="250" cy="770" rx="25" ry="10" transform="rotate(15 250 770)" />
          <ellipse cx="1100" cy="700" rx="35" ry="14" transform="rotate(-35 1100 700)" />
        </g>
        <g opacity="0.06" stroke="#D4869C" fill="none" strokeWidth="1" transform="translate(1100, 50)">
          <circle cx="0" cy="0" r="8" />
          <circle cx="0" cy="0" r="14" />
          <circle cx="20" cy="15" r="6" />
          <circle cx="20" cy="15" r="11" />
          <path d="M0 14 L0 60" stroke="#8B9E7E" />
          <path d="M20 26 L20 55" stroke="#8B9E7E" />
        </g>
      </svg>
    </div>
  );
}

export default function AuthGate({ children }) {
  const { user, loading } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'code'
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If supabase isn't configured, skip auth entirely (local dev without env vars)
  if (!supabase) return children;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(160deg, #1A2E1A 0%, #2D4A2D 30%, #3A5A3A 60%, #2D4A2D 100%)',
      }}>
        <Loader2 className="w-8 h-8 text-sage-light animate-spin" />
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
      const res = await fetch('/api/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
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
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      // Sign in with the credentials returned by the API
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (signInError) throw signInError;
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full overflow-auto">
      <BotanicalBg />

      <div className="relative z-10 w-full min-h-full flex flex-col items-center justify-center px-6">
        {/* Logo — matches Onboarding */}
        <motion.div
          className="text-center" style={{ marginBottom: 48 }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <div className="inline-block mb-5">
            <svg width="64" height="64" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="28" r="27" stroke="#A8B99C" strokeWidth="1" opacity="0.4" />
              <path d="M28 40 L28 22" stroke="#A8B99C" strokeWidth="2" strokeLinecap="round" />
              <path d="M28 28 Q20 22 16 14 Q22 18 28 22" stroke="#A8B99C" strokeWidth="1.5" fill="#8B9E7E" fillOpacity="0.3" strokeLinecap="round" />
              <path d="M28 25 Q36 18 40 10 Q34 16 28 20" stroke="#A8B99C" strokeWidth="1.5" fill="#8B9E7E" fillOpacity="0.3" strokeLinecap="round" />
              <path d="M28 32 Q22 28 18 22 Q24 26 28 28" stroke="#A8B99C" strokeWidth="1.2" fill="#8B9E7E" fillOpacity="0.2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="font-display text-6xl font-light text-cream tracking-tight leading-none">
            Garden Grove
          </h1>
          <p className="text-sage-light/60 font-light text-sm tracking-[0.15em] uppercase" style={{ marginTop: 16 }}>
            Plan my paradise
          </p>
        </motion.div>

        {/* Auth card */}
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="rounded-2xl border border-white/8 bg-white/5 backdrop-blur-sm shadow-2xl"
            style={{ padding: '32px' }}>
            <p className="text-center text-cream/70 text-sm font-light" style={{ marginBottom: 24 }}>
              {step === 'phone' ? 'Sign in with your phone number' : 'Enter the code we sent you'}
            </p>

            {step === 'phone' ? (
              <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-light/40" />
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/8 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/30 placeholder:text-cream/30"
                    style={{ padding: '12px 12px 12px 40px' }}
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400" style={{ padding: '0 4px' }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center rounded-xl text-sm font-medium text-cream hover:brightness-110 transition-all disabled:opacity-60"
                  style={{ padding: '12px 16px', gap: 8, marginTop: 4, background: 'linear-gradient(135deg, #4A5E3A 0%, #3A4E2A 100%)' }}
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
                <p className="text-xs text-cream/50 text-center" style={{ marginBottom: 4 }}>
                  Code sent to <strong className="text-cream/80">{phone}</strong>
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  className="w-full rounded-xl border border-white/10 bg-white/8 text-sm text-cream text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/30 placeholder:text-cream/25 placeholder:tracking-normal"
                  style={{ padding: '12px 16px', fontSize: 18 }}
                  autoFocus
                />

                {error && (
                  <p className="text-xs text-red-400" style={{ padding: '0 4px' }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || code.length < 6}
                  className="w-full flex items-center justify-center rounded-xl text-sm font-medium text-cream hover:brightness-110 transition-all disabled:opacity-60"
                  style={{ padding: '12px 16px', gap: 8, marginTop: 4, background: 'linear-gradient(135deg, #4A5E3A 0%, #3A4E2A 100%)' }}
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
                  onClick={() => { setStep('phone'); setCode(''); setError(''); }}
                  className="text-xs text-sage-light/50 font-light hover:text-sage-light/80 transition-colors text-center"
                  style={{ marginTop: 4 }}
                >
                  Use a different number
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
