import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { Leaf, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function AuthGate({ children }) {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setConfirmSent(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmSent) {
    return (
      <div className="h-screen flex items-center justify-center bg-cream grain-texture">
        <div className="w-full max-w-sm text-center" style={{ padding: 32 }}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-forest to-forest-deep flex items-center justify-center shadow-lg mx-auto">
            <Mail className="w-8 h-8 text-cream" />
          </div>
          <h2 className="font-display text-xl font-semibold text-forest-deep" style={{ marginTop: 24 }}>Check your email</h2>
          <p className="text-sm text-sage-dark" style={{ marginTop: 12 }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back here to sign in.
          </p>
          <button
            onClick={() => { setConfirmSent(false); setMode('signin'); }}
            className="text-sm text-forest font-medium hover:text-forest-deep transition-colors"
            style={{ marginTop: 24 }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

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
            {mode === 'signin' ? 'Welcome back to your garden' : 'Start planning your paradise'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-dark/50" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-sage/20 bg-white text-sm text-soil focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest/40 placeholder:text-sage/50"
              style={{ padding: '12px 12px 12px 40px' }}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-dark/50" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-sage/20 bg-white text-sm text-soil focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest/40 placeholder:text-sage/50"
              style={{ padding: '12px 12px 12px 40px' }}
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
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-sage-dark" style={{ marginTop: 20 }}>
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button onClick={() => { setMode('signup'); setError(''); }} className="text-forest font-medium hover:text-forest-deep transition-colors">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setMode('signin'); setError(''); }} className="text-forest font-medium hover:text-forest-deep transition-colors">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
