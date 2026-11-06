import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.login(form);
      login(res.data.token, res.data.user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      if (err.response?.data?.requireVerification) {
        toast.error('Please verify your email first.');
        navigate('/verify', { state: { email: form.email } });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8 hover:opacity-80 transition-opacity">
          <span className="text-primary text-2xl">⚡</span>
          <span className="text-xl font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>RecoverForge</span>
        </Link>
        <div className="bg-surface-dark border border-border-dark rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-text-muted text-sm mb-7">Sign in to your RecoverForge account</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-text-muted mb-1.5 block">Email</label>
              <input type="email" placeholder="you@company.com" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="input-field" required />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1.5 block">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password}
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-text-muted mt-6">
            No account?{' '}
            <Link to="/signup" className="text-primary font-medium hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
