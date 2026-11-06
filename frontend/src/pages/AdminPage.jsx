import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

// ── helpers ────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString();
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtRupees = (n) => `₹${(Number(n || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

// ── tiny UI atoms ───────────────────────────────────────────────
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

// ── sidebar nav ─────────────────────────────────────────────────
const TABS = [
  { id: 'overview', icon: 'dashboard', label: 'Overview' },
  { id: 'users', icon: 'group', label: 'Users' },
  { id: 'emails', icon: 'mail', label: 'Email Logs' },
  { id: 'transactions', icon: 'payments', label: 'Transactions' },
];

// ══════════════════════════════════════════════════════════════════
//  OVERVIEW TAB
// ══════════════════════════════════════════════════════════════════
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
  if (!stats) return <p className="text-red-400 p-8">Failed to load stats.</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Platform Overview</h2>
        <p className="text-[#c4cc8e] text-sm">Real-time metrics for MailForge</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="group" label="Total Users" value={fmt(stats.totalUsers)} sub={`+${stats.newUsersThisWeek} this week`} />
        <StatCard icon="verified_user" label="Verified Users" value={fmt(stats.verifiedUsers)} sub={`${Math.round((stats.verifiedUsers / (stats.totalUsers || 1)) * 100)}% verified`} color="text-green-400" />
        <StatCard icon="workspace_premium" label="Premium Users" value={fmt(stats.premiumUsers)} sub="Paid subscribers" color="text-blue-400" />
        <StatCard icon="mail" label="Emails Generated" value={fmt(stats.totalEmails)} sub={`+${stats.emailsThisWeek} this week`} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard icon="currency_rupee" label="Total Revenue" value={fmtRupees(stats.totalRevenue)} sub="All successful payments" color="text-yellow-400" />
        <StatCard icon="trending_up" label="Emails This Week" value={fmt(stats.emailsThisWeek)} sub="7-day period" color="text-orange-400" />
        <StatCard icon="person_add" label="New Users This Week" value={fmt(stats.newUsersThisWeek)} sub="7-day period" color="text-cyan-400" />
      </div>

      {/* Daily signups table */}
      {stats.dailySignups?.length > 0 && (
        <div className="bg-[#1a1c0d] border border-[#34381b] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Daily Signups (Last 7 Days)</h3>
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

// ══════════════════════════════════════════════════════════════════
//  USERS TAB
// ══════════════════════════════════════════════════════════════════
const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ verified: '', plan: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getUsers({ page, search, ...filter })
      .then(r => { setUsers(r.data.data); setPagination(r.data.pagination); })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [page, search, filter]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (id, updates) => {
    setUpdating(true);
    try {
      await adminAPI.updateUser(id, updates);
      toast.success('User updated!');
      load();
      setSelectedUser(null);
    } catch { toast.error('Update failed'); }
    finally { setUpdating(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">User Management</h2>
        <span className="text-[#c4cc8e] text-sm">{pagination?.total || 0} users</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email..."
          className="flex-1 min-w-[200px] px-4 py-2 bg-[#2b2f14] border border-[#34381b] rounded-lg text-white text-sm placeholder-[#c4cc8e]/50 focus:outline-none focus:border-primary"
        />
        <select value={filter.verified} onChange={e => setFilter(p => ({ ...p, verified: e.target.value }))}
          className="px-3 py-2 bg-[#2b2f14] border border-[#34381b] rounded-lg text-white text-sm focus:outline-none focus:border-primary">
          <option value="">All Verification</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <select value={filter.plan} onChange={e => setFilter(p => ({ ...p, plan: e.target.value }))}
          className="px-3 py-2 bg-[#2b2f14] border border-[#34381b] rounded-lg text-white text-sm focus:outline-none focus:border-primary">
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {/* Table */}
      {loading ? <Spinner /> : (
        <div className="bg-[#1a1c0d] border border-[#34381b] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[#34381b]">
              <tr className="text-[#c4cc8e] text-xs uppercase">
                <th className="text-left py-3 px-4">User</th>
                <th className="text-left py-3 px-4">Joined</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Plan</th>
                <th className="text-left py-3 px-4">Credits</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-[#c4cc8e]">No users found</td></tr>
              )}
              {users.map(u => (
                <tr key={u._id} className="border-b border-[#34381b]/50 hover:bg-[#2b2f14]/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                        {u.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="text-white font-medium">{u.name}</div>
                        <div className="text-[#c4cc8e] text-xs">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#c4cc8e]">{fmtDate(u.createdAt)}</td>
                  <td className="py-3 px-4">
                    {u.isBanned ? <Badge color="red">Banned</Badge>
                      : u.isVerified ? <Badge color="green">Verified</Badge>
                      : <Badge color="yellow">Pending</Badge>}
                  </td>
                  <td className="py-3 px-4">
                    <Badge color={u.plan === 'premium' ? 'blue' : 'gray'}>{u.plan}</Badge>
                  </td>
                  <td className="py-3 px-4 text-white font-bold">{u.credits}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => setSelectedUser(u)}
                      className="text-xs px-3 py-1.5 bg-[#2b2f14] border border-[#34381b] text-white rounded-lg hover:border-primary transition-colors">
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 bg-[#2b2f14] border border-[#34381b] text-white text-sm rounded-lg disabled:opacity-40 hover:border-primary transition-colors">
            Previous
          </button>
          <span className="text-[#c4cc8e] text-sm">Page {page} of {pagination.pages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
            className="px-3 py-1.5 bg-[#2b2f14] border border-[#34381b] text-white text-sm rounded-lg disabled:opacity-40 hover:border-primary transition-colors">
            Next
          </button>
        </div>
      )}

      {/* User modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1c0d] border border-[#34381b] rounded-2xl p-6 w-full max-w-md relative">
            <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 text-[#c4cc8e] hover:text-white">
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary font-bold">
                {selectedUser.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div className="text-white font-bold">{selectedUser.name}</div>
                <div className="text-[#c4cc8e] text-sm">{selectedUser.email}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleUpdate(selectedUser._id, { isVerified: !selectedUser.isVerified })} disabled={updating}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${selectedUser.isVerified ? 'border-yellow-700/50 text-yellow-400 hover:bg-yellow-900/20' : 'border-green-700/50 text-green-400 hover:bg-green-900/20'}`}>
                  {selectedUser.isVerified ? '✗ Unverify Account' : '✓ Verify Account'}
                </button>
                <button onClick={() => handleUpdate(selectedUser._id, { isBanned: !selectedUser.isBanned })} disabled={updating}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${selectedUser.isBanned ? 'border-green-700/50 text-green-400 hover:bg-green-900/20' : 'border-red-700/50 text-red-400 hover:bg-red-900/20'}`}>
                  {selectedUser.isBanned ? '↩ Unban User' : '⊘ Ban User'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleUpdate(selectedUser._id, { plan: selectedUser.plan === 'premium' ? 'free' : 'premium' })} disabled={updating}
                  className="py-2.5 rounded-lg text-sm font-medium border border-blue-700/50 text-blue-400 hover:bg-blue-900/20 transition-all">
                  {selectedUser.plan === 'premium' ? '↓ Set to Free' : '↑ Set Premium'}
                </button>
                <button onClick={() => { const c = prompt('Add credits (enter number):', '50'); if (c) handleUpdate(selectedUser._id, { credits: (selectedUser.credits || 0) + parseInt(c) }); }} disabled={updating}
                  className="py-2.5 rounded-lg text-sm font-medium border border-[#34381b] text-white hover:border-primary transition-all">
                  + Add Credits
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
//  EMAIL LOGS TAB
// ══════════════════════════════════════════════════════════════════
const EmailLogsTab = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getEmailLogs({ page, search, type: typeFilter })
      .then(r => { setEmails(r.data.data); setPagination(r.data.pagination); })
      .catch(() => toast.error('Failed to load emails'))
      .finally(() => setLoading(false));
  }, [page, search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Email Logs</h2>
        <span className="text-[#c4cc8e] text-sm">{pagination?.total || 0} total emails</span>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by subject or company..."
          className="flex-1 min-w-[200px] px-4 py-2 bg-[#2b2f14] border border-[#34381b] rounded-lg text-white text-sm placeholder-[#c4cc8e]/50 focus:outline-none focus:border-primary"
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-[#2b2f14] border border-[#34381b] rounded-lg text-white text-sm focus:outline-none focus:border-primary">
          <option value="">All Types</option>
          <option value="cold_email">Cold Email</option>
          <option value="follow_up">Follow-up</option>
        </select>
      </div>

      {loading ? <Spinner /> : (
        <div className="space-y-2">
          {emails.length === 0 && <p className="text-center py-12 text-[#c4cc8e]">No emails found</p>}
          {emails.map(e => (
            <div key={e._id} className="bg-[#1a1c0d] border border-[#34381b] rounded-xl overflow-hidden">
              <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[#2b2f14]/40 transition-colors"
                onClick={() => setExpanded(expanded === e._id ? null : e._id)}>
                <Badge color={e.emailType === 'cold_email' ? 'purple' : 'blue'}>
                  {e.emailType === 'cold_email' ? 'Cold' : 'Follow-up'}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{e.subject}</div>
                  <div className="text-[#c4cc8e] text-xs">
                    by {e.userId?.name || 'Unknown'} ({e.userId?.email || '—'}) · {fmtDate(e.createdAt)}
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#c4cc8e] text-[18px]">
                  {expanded === e._id ? 'expand_less' : 'expand_more'}
                </span>
              </div>
              {expanded === e._id && (
                <div className="px-4 pb-4 border-t border-[#34381b]/50 pt-3">
                  <pre className="text-sm text-[#c4cc8e] whitespace-pre-wrap font-sans leading-relaxed">{e.body}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 bg-[#2b2f14] border border-[#34381b] text-white text-sm rounded-lg disabled:opacity-40">Previous</button>
          <span className="text-[#c4cc8e] text-sm">Page {page} of {pagination.pages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
            className="px-3 py-1.5 bg-[#2b2f14] border border-[#34381b] text-white text-sm rounded-lg disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
//  TRANSACTIONS TAB
// ══════════════════════════════════════════════════════════════════
const TransactionsTab = () => {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getTransactions({ page })
      .then(r => { setTxns(r.data.data); setPagination(r.data.pagination); })
      .catch(() => toast.error('Failed to load transactions'))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Transactions</h2>
        <span className="text-[#c4cc8e] text-sm">{pagination?.total || 0} total</span>
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-[#1a1c0d] border border-[#34381b] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[#34381b]">
              <tr className="text-[#c4cc8e] text-xs uppercase">
                <th className="text-left py-3 px-4">User</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Plan</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Order ID</th>
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-[#c4cc8e]">No transactions yet</td></tr>
              )}
              {txns.map(t => (
                <tr key={t._id} className="border-b border-[#34381b]/50 hover:bg-[#2b2f14]/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="text-white font-medium">{t.userId?.name || '—'}</div>
                    <div className="text-[#c4cc8e] text-xs">{t.userId?.email || '—'}</div>
                  </td>
                  <td className="py-3 px-4 text-[#c4cc8e]">{fmtDate(t.createdAt)}</td>
                  <td className="py-3 px-4 text-primary font-bold">{fmtRupees(t.amount)}</td>
                  <td className="py-3 px-4"><Badge color="blue">{t.plan || 'premium'}</Badge></td>
                  <td className="py-3 px-4">
                    <Badge color={t.status === 'success' ? 'green' : t.status === 'failed' ? 'red' : 'yellow'}>
                      {t.status || 'pending'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-[#c4cc8e] text-xs font-mono truncate max-w-[140px]">{t.orderId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 bg-[#2b2f14] border border-[#34381b] text-white text-sm rounded-lg disabled:opacity-40">Previous</button>
          <span className="text-[#c4cc8e] text-sm">Page {page} of {pagination.pages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
            className="px-3 py-1.5 bg-[#2b2f14] border border-[#34381b] text-white text-sm rounded-lg disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
//  MAIN ADMIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return (
    <div className="min-h-screen bg-[#212310] flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-[#c4cc8e] mb-6">You need admin privileges to view this page.</p>
        <NavLink to="/dashboard" className="px-5 py-2.5 bg-primary text-[#212310] font-bold rounded-lg text-sm">
          Go to Dashboard
        </NavLink>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#212310]">
      {/* Admin Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-[#0A0A0F] border-r border-[#34381b] h-screen">
        <div className="p-5 border-b border-[#34381b]">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-2xl">bolt</span>
            <span className="text-lg font-bold text-white">MailForge</span>
          </div>
          <span className="text-xs px-2 py-0.5 bg-red-900/40 text-red-400 border border-red-700/50 rounded-md font-semibold">
            ADMIN PANEL
          </span>
        </div>
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full
                ${activeTab === tab.id ? 'bg-[#2b2f14] text-white border border-[#34381b]' : 'text-[#c4cc8e] hover:bg-[#1a1c0d] hover:text-white'}`}>
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-[#34381b]">
          <NavLink to="/dashboard" className="flex items-center gap-2 px-3 py-2 text-[#c4cc8e] hover:text-white text-sm transition-colors rounded-lg hover:bg-[#1a1c0d]">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to App
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'emails' && <EmailLogsTab />}
        {activeTab === 'transactions' && <TransactionsTab />}
      </main>
    </div>
  );
}
