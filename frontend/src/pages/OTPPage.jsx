import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { verifyOTP, resendOTP } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function OTPPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const email = location.state?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef([]);

  useEffect(() => {
    if (!email) navigate('/signup');
    inputs.current[0]?.focus();
    const interval = setInterval(() => {
      setResendTimer(t => { if (t <= 1) { setCanResend(true); clearInterval(interval); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const newOtp = [...otp]; newOtp[i] = v; setOtp(newOtp);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) return toast.error('Enter all 6 digits');
    setLoading(true);
    try {
      const { data } = await verifyOTP({ email, otp: code });
      login(data.token, data.user);
      toast.success('Email verified!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      await resendOTP({ email });
      toast.success('OTP resent!');
      setResendTimer(60); setCanResend(false);
      const interval = setInterval(() => setResendTimer(t => { if (t <= 1) { setCanResend(true); clearInterval(interval); return 0; } return t - 1; }), 1000);
    } catch { toast.error('Failed to resend'); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/30 blur-[120px]" />
      </div>
      <header className="relative z-10 flex items-center justify-between border-b border-[#1f1f2e] px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-[#0a0a0f]">
            <span className="material-symbols-outlined text-2xl">bolt</span>
          </div>
          <h2 className="text-xl font-bold font-syne uppercase">MailForge</h2>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md bg-[#12121a] border border-[#1f1f2e] p-8 md:p-10 rounded-xl shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center size-14 rounded-full bg-primary/10 text-primary mb-6">
              <span className="material-symbols-outlined text-3xl">mark_email_unread</span>
            </div>
            <h1 className="text-3xl font-bold font-syne mb-3">Verify your email</h1>
            <p className="text-slate-400 leading-relaxed">We sent a 6-digit code to <span className="text-white font-medium">{email}</span></p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex justify-between gap-2">
              {otp.map((digit, i) => (
                <input key={i} ref={el => inputs.current[i] = el}
                  className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold bg-[#0a0a0f] border-2 border-[#1f1f2e] rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-white"
                  maxLength={1} placeholder="·" type="text" inputMode="numeric" value={digit}
                  onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} />
              ))}
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-[#0a0a0f] font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {loading ? <span className="material-symbols-outlined animate-spin">autorenew</span> : <><span>Verify Code</span><span className="material-symbols-outlined">arrow_forward</span></>}
            </button>
          </form>
          <div className="mt-8 text-center flex flex-col items-center gap-3">
            <p className="text-slate-400 text-sm">Didn't receive a code?
              <button onClick={handleResend} disabled={!canResend} className="text-white font-bold hover:text-primary transition-colors ml-2 disabled:text-slate-600">Resend</button>
            </p>
            {!canResend && <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-widest bg-[#0a0a0f] px-3 py-1.5 rounded-full border border-[#1f1f2e]"><span className="material-symbols-outlined text-sm">schedule</span><span>Resend in 0:{String(resendTimer).padStart(2, '0')}</span></div>}
          </div>
        </div>
      </main>
    </div>
  );
}
