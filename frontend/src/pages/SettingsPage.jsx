import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { failureAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    businessName: user?.businessName || '',
    senderName: user?.senderName || user?.name || '',
    replyToEmail: user?.replyToEmail || user?.email || '',
    agentActive: user?.agentActive !== false // default true
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await failureAPI.updateSettings(form);
      updateUser(res.data.user);
      toast.success('Agent settings successfully updated! ⚡');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white font-syne">Agent & Merchant Settings</h1>
          <p className="text-text-muted text-sm mt-1">Configure your recovery agent identity, customer communications, and safety kill switch.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Master Kill Switch Card */}
          <div className={`p-6 rounded-2xl border-2 transition-all ${
            form.agentActive
              ? 'bg-primary/5 border-primary/40'
              : 'bg-red-500/5 border-red-500/40'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white font-syne">Agent Kill Switch</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    form.agentActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {form.agentActive ? 'ARMED & ACTIVE' : 'STOPPED'}
                  </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed max-w-lg">
                  When enabled, incoming failed payment webhooks trigger autonomous classification, link generation, and scheduled recovery emails. Disabling immediately suspends all automated outreach.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.agentActive}
                  onChange={(e) => setForm({ ...form, agentActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-border-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          {/* Merchant Identity & Communications */}
          <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-bold text-white font-syne">Merchant Communication Profile</h2>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Business / Store Name
              </label>
              <input
                type="text"
                placeholder="e.g. Apex Cloud Solutions"
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className="w-full h-11 px-4 bg-background-dark border border-border-dark rounded-xl text-white text-sm focus:border-primary focus:outline-none transition-colors"
                required
              />
              <p className="text-[11px] text-text-muted mt-1">Used in personalized email subjects, greetings, and Razorpay payment descriptions.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Sender Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Apex Support Team"
                value={form.senderName}
                onChange={(e) => setForm({ ...form, senderName: e.target.value })}
                className="w-full h-11 px-4 bg-background-dark border border-border-dark rounded-xl text-white text-sm focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Customer Reply-To Email
              </label>
              <input
                type="email"
                placeholder="billing@yourdomain.com"
                value={form.replyToEmail}
                onChange={(e) => setForm({ ...form, replyToEmail: e.target.value })}
                className="w-full h-11 px-4 bg-background-dark border border-border-dark rounded-xl text-white text-sm focus:border-primary focus:outline-none transition-colors"
              />
              <p className="text-[11px] text-text-muted mt-1">Where replies from your customers will be directed.</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary text-slate-900 font-bold rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(232,255,71,0.25)]"
          >
            {loading ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
