import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

// Format paise to Rupees
const fmt = (n) => Number(n || 0).toLocaleString();
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtRupees = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const Badge = ({ color, children }) => {
  const colors = {
    green: 'bg-green-900/40 text-green-400 border-green-700/50',
    red: 'bg-red-900/40 text-red-400 border-red-700/50',
    yellow: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50',
    blue: 'bg-blue-900/40 text-blue-400 border-blue-700/50',
    purple: 'bg-purple-900/40 text-purple-400 border-purple-700/50',
    gray: 'bg-gray-800/60 text-gray-400 border-gray-700/50',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
};

const StatCard = ({ icon, label, value, sub, color = 'text-primary' }) => (
  <div className="bg-[#1a1c0d] border border-[#34381b] rounded-xl p-5 flex flex-col gap-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[#c4cc8e] text-xs font-medium">{label}</span>
      <span className={`material-symbols-outlined ${color} text-[20px]`}>{icon}</span>
    </div>
    <div className="text-3xl font-bold text-white">{value}</div>
    {sub && <div className="text-[#c4cc8e] text-xs">{sub}</div>}
  </div>
);

const Spinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const TABS = [
  { id: 'overview', icon: 'dashboard', label: 'Overview' },
  { id: 'users', icon: 'group', label: 'Merchants' },
  { id: 'transactions', icon: 'payments', label: 'Transactions' },
];

const OverviewTab = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getStats()
      .then(r => setStats(r.data.data))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!stats) return <p className="text-red-400 p-8">Failed to load platform stats.</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">RecoverForge Operator Overview</h2>
        <p className="text-[#c4cc8e] text-sm">System metrics and platform-wide revenue telemetry</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="group" label="Total Merchants" value={fmt(stats.totalUsers)} sub={`+${stats.newUsersThisWeek} this week`} />
        <StatCard icon="verified_user" label="Verified Merchants" value={fmt(stats.verifiedUsers)} sub={`${Math.round((stats.verifiedUsers / (stats.totalUsers || 1)) * 100)}% verified`} color="text-green-400" />
        <StatCard icon="workspace_premium" label="Premium Subscribers" value={fmt(stats.premiumUsers)} sub="Active paid tier" color="text-blue-400" />
        <StatCard icon="currency_rupee" label="Total Revenue (Platform)" value={fmtRupees(stats.totalRevenue)} sub="All verified payments" color="text-yellow-400" />
      </div>

      {stats.dailySignups?.length > 0 && (
        <div className="bg-[#1a1c0d] border border-[#34381b] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Daily Merchant Registrations (Last 7 Days)</h3>
          <div className="space-y-2">
            {stats.dailySignups.map(d => (
              <div key={d._id} className="flex items-center gap-3">
                <span className="text-[#c4cc8e] text-xs w-24">{d._id}</span>
                <div className="flex-1 h-2 bg-[#34381b] rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((d.count / 10) * 100, 100)}%` }}></div>
                </div>
                <span className="text-white text-xs font-bold w-6">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getUsers({ page, search })
      .then(r => { setUsers(r.data.data); setPagination(r.data.pagination); })
      .catch(() => toast.error('Failed to load merchants'))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Merchant Accounts</h2>
        <span className="text-[#c4cc8e] text-sm">{pagination?.total || 0} total</span>
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-[#1a1c0d] border border-[#34381b] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[#34381b]">
              <tr className="text-[#c4cc8e] text-xs uppercase">
                <th className="text-left py-3 px-4">Merchant Name</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Plan</th>
                <th className="text-left py-3 px-4">Credits</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="border-b border-[#34381b]/50 hover:bg-[#2b2f14]/40">
                  <td className="py-3 px-4 text-white font-medium">{u.businessName || u.name}</td>
                  <td className="py-3 px-4 text-[#c4cc8e]">{u.email}</td>
                  <td className="py-3 px-4"><Badge color="blue">{u.plan}</Badge></td>
                  <td className="py-3 px-4 text-primary font-bold">{u.credits}</td>
                  <td className="py-3 px-4">
                    <Badge color={u.isVerified ? 'green' : 'yellow'}>{u.isVerified ? 'Verified' : 'Pending'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const TransactionsTab = () => {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getTransactions({ limit: 50 })
      .then(r => setTxns(r.data.data))
      .catch(() => toast.error('Failed to load transactions'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-white">All Platform Transactions</h2>
      {loading ? <Spinner /> : (
        <div className="bg-[#1a1c0d] border border-[#34381b] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[#34381b]">
              <tr className="text-[#c4cc8e] text-xs uppercase">
                <th className="text-left py-3 px-4">Merchant</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {txns.map(t => (
                <tr key={t._id} className="border-b border-[#34381b]/50">
                  <td className="py-3 px-4 text-white">{t.userId?.email || '—'}</td>
                  <td className="py-3 px-4 text-[#c4cc8e]">{fmtDate(t.createdAt)}</td>
                  <td className="py-3 px-4 text-primary font-bold">{fmtRupees(t.amount)}</td>
                  <td className="py-3 px-4"><Badge color="green">{t.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-[#212310] flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-[#c4cc8e] text-sm">Operator administrative privileges required.</p>
          <NavLink to="/dashboard" className="inline-block px-4 py-2 bg-primary text-slate-900 font-bold rounded-lg text-xs">
            Return to Dashboard
          </NavLink>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#212310]">
      <aside className="w-60 flex-shrink-0 flex flex-col bg-[#0A0A0F] border-r border-[#34381b] h-screen p-4 justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">autorenew</span>
            <span className="text-lg font-bold text-white">RecoverForge</span>
          </div>
          <nav className="space-y-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${
                  activeTab === t.id ? 'bg-[#2b2f14] text-white border border-[#34381b]' : 'text-[#c4cc8e] hover:bg-[#1a1c0d]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <NavLink to="/dashboard" className="text-xs text-[#c4cc8e] hover:text-white flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Dashboard
        </NavLink>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'transactions' && <TransactionsTab />}
      </main>
    </div>
  );
}
