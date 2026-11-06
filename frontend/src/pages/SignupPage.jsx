import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters.');
    setLoading(true);
    try {
      await authAPI.signup(form);
      toast.success('OTP sent to your email!');
      navigate('/verify', { state: { email: form.email } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8 hover:opacity-80 transition-opacity">
          <span className="text-primary text-2xl">⚡</span>
          <span className="text-xl font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>MailForge</span>
        </Link>
        <div className="bg-surface-dark border border-border-dark rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-lighter border border-border-dark mb-6">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse block" />
            <span className="text-xs text-text-muted">50 free credits — no card required</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-text-muted text-sm mb-7">Start writing cold emails that actually convert</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-text-muted mb-1.5 block">Full Name</label>
              <input type="text" placeholder="John Smith" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="input-field" required />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1.5 block">Work Email</label>
              <input type="email" placeholder="you@company.com" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="input-field" required />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1.5 block">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters" value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  className="input-field pr-10" required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
                  <span className="ms text-[18px]">{showPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2">
              {loading ? <span className="animate-spin ms text-[18px]">sync</span> : null}
              {loading ? 'Creating account...' : 'Create Free Account'}
            </button>
          </form>
          <p className="text-center text-xs text-text-muted mt-5">
            By signing up, you agree to our Terms of Service & Privacy Policy.
          </p>
          <p className="text-center text-sm text-text-muted mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
