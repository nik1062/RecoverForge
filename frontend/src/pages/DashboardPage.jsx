
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHistory } from '../services/api';

const StatCard = ({ icon, label, value, sub, color = 'text-primary' }) => (
  <div className="bg-surface-dark border border-border-dark rounded-xl p-5 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-text-secondary text-sm">{label}</span>
      <span className={`material-symbols-outlined ${color} text-[20px]`}>{icon}</span>
    </div>
    <div className="text-3xl font-bold text-white font-display">{value}</div>
    {sub && <div className="text-text-secondary text-xs">{sub}</div>}
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory({ limit: 5 }).then(res => {
      setRecent(res.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const credits = user?.credits ?? 0;
  const maxCredits = user?.plan === 'premium' ? 1000 : 50;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white font-display">Dashboard</h1>
            <p className="text-text-secondary mt-1">Welcome back, {user?.name?.split(' ')[0]}! 👋</p>
          </div>
          <Link to="/generate" className="flex items-center gap-2 px-5 py-2.5 bg-primary text-background-dark font-bold rounded-lg hover:bg-primary-hover transition-all shadow-[0_0_20px_rgba(232,255,71,0.2)]">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Email
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard icon="bolt" label="Credits Left" value={credits} sub={`of ${maxCredits} total`} />
          <StatCard icon="mail" label="Plan" value={user?.plan === 'premium' ? 'Premium' : 'Free'} sub={user?.plan === 'premium' ? '1000 credits/mo' : 'Upgrade for more'} color="text-blue-400" />
          <StatCard icon="history" label="Emails Generated" value={recent.length > 0 ? recent.length + '+' : '0'} sub="All time" color="text-green-400" />
          <StatCard icon="trending_up" label="Credits Used" value={maxCredits - credits} sub="This period" color="text-orange-400" />
        </div>

        {/* Credit bar */}
        <div className="bg-surface-dark border border-border-dark rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-medium">Credit Usage</span>
            <span className="text-primary font-bold">{credits} / {maxCredits}</span>
          </div>
          <div className="h-3 bg-border-dark rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full transition-all duration-700" style={{ width: `${(credits/maxCredits)*100}%` }}></div>
          </div>
          {user?.plan !== 'premium' && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-text-secondary text-sm">Running low? Upgrade to get 1000 credits/month.</p>
              <Link to="/billing" className="text-primary text-sm font-medium hover:underline">Upgrade →</Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            { to: '/generate', icon: 'auto_awesome', title: 'Generate Email', desc: 'Create a personalized cold email', cost: '5 credits', color: 'border-primary/30 hover:border-primary' },
            { to: '/followup', icon: 'reply', title: 'Follow-up Generator', desc: 'Create follow-up sequences', cost: '3 credits', color: 'border-blue-500/30 hover:border-blue-500' },
            { to: '/history', icon: 'history', title: 'View History', desc: 'Browse past emails', cost: 'Free', color: 'border-border-dark hover:border-white/30' }
          ].map(a => (
            <Link key={a.to} to={a.to} className={`group p-5 bg-surface-dark border ${a.color} rounded-xl transition-all`}>
              <div className="flex items-start justify-between mb-3">
                <span className="material-symbols-outlined text-primary text-[24px]">{a.icon}</span>
                <span className="text-xs bg-surface-lighter border border-border-dark text-text-secondary px-2 py-1 rounded-full">{a.cost}</span>
              </div>
              <h3 className="text-white font-semibold mb-1">{a.title}</h3>
              <p className="text-text-secondary text-sm">{a.desc}</p>
            </Link>
          ))}
        </div>

        {/* Recent history */}
        <div className="bg-surface-dark border border-border-dark rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Recent Emails</h2>
            <Link to="/history" className="text-primary text-sm hover:underline">View all →</Link>
          </div>
          {loading ? (
            <div className="py-8 text-center text-text-secondary">Loading...</div>
          ) : recent.length === 0 ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-text-secondary text-4xl">mail_outline</span>
              <p className="text-text-secondary mt-2">No emails generated yet</p>
              <Link to="/generate" className="mt-3 inline-block text-primary hover:underline text-sm">Generate your first email →</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recent.map(email => (
                <div key={email._id} className="flex items-center justify-between p-3 rounded-lg bg-surface-lighter border border-border-dark">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="material-symbols-outlined text-primary text-[18px]">mail</span>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{email.subject}</p>
                      <p className="text-text-secondary text-xs">{email.inputs?.companyName} · {new Date(email.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="text-text-secondary text-xs shrink-0 ml-3">{email.creditsUsed} cr</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
