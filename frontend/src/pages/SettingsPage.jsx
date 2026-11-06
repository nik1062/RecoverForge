
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { updateProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    role: user?.role || '',
    tone: user?.preferences?.tone || 'professional',
    industry: user?.preferences?.industry || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateProfile({
        name: form.name,
        role: form.role,
        preferences: { tone: form.tone, industry: form.industry }
      });
      updateUser(res.data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white font-display">Settings</h1>
          <p className="text-text-secondary mt-1">Manage your profile and preferences</p>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-8 p-6 bg-surface-dark border border-border-dark rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary font-bold text-2xl font-display">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-white font-semibold text-lg">{user?.name}</p>
            <p className="text-text-secondary text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${user?.plan === 'premium' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-text-secondary'}`}>
                {user?.plan === 'premium' ? '⚡ Premium' : 'Free Plan'}
              </span>
              <span className="text-xs text-text-secondary">{user?.credits} credits</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-surface-dark border border-border-dark rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-6">Profile Settings</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Full Name</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 bg-surface-lighter border border-border-dark rounded-lg text-white placeholder-text-secondary focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Email Address</label>
              <input type="email" value={user?.email} disabled
                className="w-full px-4 py-3 bg-surface-lighter border border-border-dark rounded-lg text-text-secondary cursor-not-allowed" />
              <p className="text-text-secondary text-xs mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Your Role / Title</label>
              <input type="text" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                placeholder="e.g., Sales Director, Founder, BDR"
                className="w-full px-4 py-3 bg-surface-lighter border border-border-dark rounded-lg text-white placeholder-text-secondary focus:outline-none focus:border-primary transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Default Tone</label>
              <select value={form.tone} onChange={e => setForm(p => ({ ...p, tone: e.target.value }))}
                className="w-full px-4 py-3 bg-surface-lighter border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary transition-colors appearance-none">
                {['professional', 'friendly', 'confident', 'casual', 'direct', 'empathetic'].map(t => (
                  <option key={t} value={t} className="bg-surface-dark capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Industry Focus</label>
              <input type="text" value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
                placeholder="e.g., B2B SaaS, FinTech, E-commerce"
                className="w-full px-4 py-3 bg-surface-lighter border border-border-dark rounded-lg text-white placeholder-text-secondary focus:outline-none focus:border-primary transition-colors" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-primary text-background-dark font-bold rounded-lg hover:bg-primary-hover transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> Saving...</> : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
