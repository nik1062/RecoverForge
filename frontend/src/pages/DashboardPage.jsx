import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { failureAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Currency Formatter: Converts paise to Rupees (e.g. 149900 paise -> ₹1,499.00)
const fmtRupees = (paise) => {
  const rupees = Number(paise || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(rupees);
};

// Category Badges & Colors
const CATEGORY_MAP = {
  insufficient_funds: { label: 'Insufficient Funds', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  bank_decline: { label: 'Bank Decline', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  user_dropoff: { label: 'User Drop-off', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  technical_error: { label: 'Technical Glitch', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  fraud_suspected: { label: 'Suspected Fraud', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
  unclassified: { label: 'Analyzing', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' }
};

// Status Badges
const STATUS_MAP = {
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  recovering: { label: 'Recovering', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  recovered: { label: 'Recovered', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  abandoned: { label: 'Abandoned', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
  opted_out: { label: 'Opted Out', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30' }
};

const StatCard = ({ icon, label, value, sub, color = 'text-primary' }) => (
  <div className="bg-surface-dark border border-border-dark rounded-xl p-5 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-text-muted text-xs font-medium uppercase tracking-wider">{label}</span>
      <span className={`material-symbols-outlined ${color} text-[22px]`}>{icon}</span>
    </div>
    <div className="text-2xl sm:text-3xl font-bold text-white font-syne">{value}</div>
    {sub && <div className="text-text-muted text-xs">{sub}</div>}
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const [failures, setFailures] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDemoData, setShowDemoData] = useState(true);

  // Selected Detail Drawer
  const [selectedFailure, setSelectedFailure] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Simulation State
  const [simulating, setSimulating] = useState(false);
  const [activePreviewEmail, setActivePreviewEmail] = useState(null);

  const pollingRef = useRef(null);

  const fetchDashboardData = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await failureAPI.getFailures({
        page,
        limit: 15,
        search,
        status: statusFilter,
        category: categoryFilter,
        includeDemo: showDemoData ? 'true' : 'false'
      });
      setFailures(res.data.data);
      setMetrics(res.data.metrics);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load recovery dashboard');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, showDemoData]);

  useEffect(() => {
    fetchDashboardData(1);
  }, [fetchDashboardData]);

  // Load Timeline for selected failure
  const loadTimeline = useCallback(async (id) => {
    try {
      setTimelineLoading(true);
      const res = await failureAPI.getTimeline(id);
      setSelectedFailure(res.data.data.payment);
      setTimeline(res.data.data.timeline);
    } catch (err) {
      toast.error('Failed to load failure timeline');
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  // Poll timeline every 2s when drawer is open during active recovery
  useEffect(() => {
    if (selectedFailure && selectedFailure.status === 'recovering') {
      pollingRef.current = setInterval(() => {
        loadTimeline(selectedFailure._id);
      }, 2000);
    }
    return () => clearInterval(pollingRef.current);
  }, [selectedFailure, loadTimeline]);

  // Simulate Payment Failure Demo Tool
  const handleSimulateFailure = async () => {
    setSimulating(true);
    const toastId = toast.loading('Simulating Razorpay webhook failure...');
    try {
      const amounts = [149900, 299900, 499900, 999900];
      const randomAmount = amounts[Math.floor(Math.random() * amounts.length)];
      
      const res = await failureAPI.simulateFailure({
        amount: randomAmount,
        customerEmail: `buyer.${Date.now().toString().slice(-4)}@customer.io`,
        errorCode: 'BAD_REQUEST_ERROR',
        errorReason: 'insufficient_funds'
      });

      toast.success('Simulation executed through live AI recovery pipeline! 🚀', { id: toastId });
      fetchDashboardData(1);
      // Immediately open drawer for the newly simulated failure
      if (res.data.data?.payment?._id) {
        loadTimeline(res.data.data.payment._id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Simulation failed', { id: toastId });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Top Header & Demo Simulation Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-bold text-white font-syne">Revenue Recovery Engine</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/30 text-primary">
                AI Autonomous Agent
              </span>
            </div>
            <p className="text-text-muted text-sm mt-1">
              Active recovery for {user?.businessName || 'Your Razorpay Store'}
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            {/* Show Demo Data Toggle */}
            <label className="flex items-center gap-2 bg-surface-dark border border-border-dark px-3.5 py-2 rounded-xl text-xs font-medium text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDemoData}
                onChange={(e) => setShowDemoData(e.target.checked)}
                className="accent-primary w-4 h-4 rounded cursor-pointer"
              />
              <span>Show demo data</span>
            </label>

            {/* Simulate Failure Button */}
            <button
              onClick={handleSimulateFailure}
              disabled={simulating}
              className="px-4 py-2.5 rounded-xl bg-primary text-slate-900 font-bold text-xs hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(232,255,71,0.2)] disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-[18px] ${simulating ? 'animate-spin' : ''}`}>
                {simulating ? 'sync' : 'smart_toy'}
              </span>
              <span>{simulating ? 'Simulating Pipeline...' : 'Simulate Payment Failure'}</span>
              <span className="bg-slate-900/20 text-slate-900 px-1.5 py-0.5 rounded text-[10px] uppercase font-mono">Demo</span>
            </button>
          </div>
        </div>

        {/* 1. Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon="error_outline"
            label="Total Failed"
            value={metrics?.totalFailed ?? 0}
            sub="Failed checkouts detected"
            color="text-red-400"
          />
          <StatCard
            icon="task_alt"
            label="Recovered"
            value={metrics?.totalRecovered ?? 0}
            sub="Payments retrieved"
            color="text-emerald-400"
          />
          <StatCard
            icon="trending_up"
            label="Recovery Rate"
            value={`${metrics?.recoveryRate ?? 0}%`}
            sub="Conversion efficiency"
            color="text-primary"
          />
          <StatCard
            icon="payments"
            label="Recovered Revenue"
            value={fmtRupees(metrics?.revenueRecovered)}
            sub="Saved via AI links"
            color="text-green-400"
          />
          <StatCard
            icon="warning"
            label="Revenue at Risk"
            value={fmtRupees(metrics?.revenueAtRisk)}
            sub="Unsettled failures"
            color="text-amber-400"
          />
        </div>

        {/* 2. Recovery Funnel */}
        {metrics?.funnel && (
          <div className="bg-surface-dark border border-border-dark rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white text-sm font-semibold font-syne">Recovery Funnel Conversion</span>
              <span className="text-xs text-text-muted">Real-time pipeline flow</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-background-dark border border-border-dark rounded-lg">
                <div className="text-xs text-text-muted uppercase">1. Failed</div>
                <div className="text-xl font-bold text-white mt-1">{metrics.funnel.failed}</div>
              </div>
              <div className="p-3 bg-background-dark border border-border-dark rounded-lg">
                <div className="text-xs text-text-muted uppercase">2. Contacted (Link Sent)</div>
                <div className="text-xl font-bold text-yellow-400 mt-1">{metrics.funnel.contacted}</div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {metrics.funnel.failed > 0 ? `${Math.round((metrics.funnel.contacted / metrics.funnel.failed) * 100)}% outreach` : '0%'}
                </div>
              </div>
              <div className="p-3 bg-background-dark border border-border-dark rounded-lg">
                <div className="text-xs text-text-muted uppercase">3. Recovered</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">{metrics.funnel.recovered}</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">
                  {metrics.funnel.failed > 0 ? `${Math.round((metrics.funnel.recovered / metrics.funnel.failed) * 100)}% success` : '0%'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Failures Filters & Table */}
        <div className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-border-dark flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search by customer email or payment ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-lg bg-background-dark border border-border-dark text-white text-xs placeholder-text-muted focus:border-primary focus:outline-none"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">
                search
              </span>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 px-3 bg-background-dark border border-border-dark rounded-lg text-white text-xs focus:border-primary focus:outline-none"
              >
                <option value="all">All Root Causes</option>
                <option value="insufficient_funds">Insufficient Funds</option>
                <option value="bank_decline">Bank Decline</option>
                <option value="user_dropoff">User Drop-off</option>
                <option value="technical_error">Technical Glitch</option>
                <option value="fraud_suspected">Suspected Fraud</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 bg-background-dark border border-border-dark rounded-lg text-white text-xs focus:border-primary focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="recovering">Recovering</option>
                <option value="recovered">Recovered</option>
                <option value="failed">Failed (New)</option>
                <option value="abandoned">Abandoned</option>
                <option value="opted_out">Opted Out</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12121a] text-text-muted uppercase tracking-wider border-b border-border-dark">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Customer / ID</th>
                  <th className="py-3.5 px-4 font-semibold">Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Root Cause (AI)</th>
                  <th className="py-3.5 px-4 font-semibold">Recovery Status</th>
                  <th className="py-3.5 px-4 font-semibold">Attempts</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      <span className="material-symbols-outlined animate-spin text-2xl text-primary mb-2">autorenew</span>
                      <p>Loading recovery transactions...</p>
                    </td>
                  </tr>
                ) : failures.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      <span className="material-symbols-outlined text-4xl text-border-dark mb-2">inbox</span>
                      <p>No failed transactions match your active filters.</p>
                      <button
                        onClick={handleSimulateFailure}
                        className="mt-3 px-3 py-1.5 bg-primary/20 border border-primary/30 text-primary rounded-lg text-xs font-semibold hover:bg-primary/30"
                      >
                        Simulate one now
                      </button>
                    </td>
                  </tr>
                ) : (
                  failures.map((f) => {
                    const cat = CATEGORY_MAP[f.classification?.category] || CATEGORY_MAP.unclassified;
                    const st = STATUS_MAP[f.status] || STATUS_MAP.failed;

                    return (
                      <tr
                        key={f._id}
                        onClick={() => loadTimeline(f._id)}
                        className={`hover:bg-surface-lighter/50 transition-colors cursor-pointer ${
                          selectedFailure?._id === f._id ? 'bg-primary/5' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{f.customerEmail}</span>
                            {f.isDemoData && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono">
                                Demo
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-text-muted font-mono">{f.razorpayPaymentId}</div>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-white font-mono">
                          {fmtRupees(f.amount)}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${cat.color}`}>
                            {cat.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${st.color}`}>
                            {st.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-text-muted">
                          <span className="font-semibold text-white">{f.attempts || 0}</span> / 3
                        </td>

                        <td className="py-3.5 px-4 text-text-muted whitespace-nowrap">
                          {new Date(f.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              loadTimeline(f._id);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-lighter hover:bg-border-dark text-white border border-border-dark text-xs flex items-center gap-1.5 ml-auto"
                          >
                            <span className="material-symbols-outlined text-[16px] text-primary">visibility</span>
                            <span>Audit Trail</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="p-4 border-t border-border-dark flex items-center justify-between text-xs text-text-muted">
              <span>Showing {failures.length} of {pagination.total} records</span>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchDashboardData(pagination.page - 1)}
                  className="px-3 py-1.5 rounded bg-background-dark border border-border-dark text-white disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-white font-medium">Page {pagination.page} of {pagination.pages}</span>
                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => fetchDashboardData(pagination.page + 1)}
                  className="px-3 py-1.5 rounded bg-background-dark border border-border-dark text-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. DETAIL DRAWER (Live AgentAction Timeline) */}
      {selectedFailure && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#0e0e16] border-l border-border-dark h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-border-dark flex items-center justify-between bg-surface-dark">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white font-syne">Agent Recovery Audit Trail</h3>
                  {selectedFailure.isDemoData && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      Demo Data
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-1 font-mono">{selectedFailure.razorpayPaymentId}</p>
              </div>
              <button
                onClick={() => setSelectedFailure(null)}
                className="text-text-muted hover:text-white p-1 rounded-lg hover:bg-surface-lighter"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Payment Summary Box */}
              <div className="bg-surface-dark border border-border-dark rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Transaction Amount</span>
                  <span className="text-xl font-bold text-primary font-mono">{fmtRupees(selectedFailure.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Customer Email:</span>
                  <span className="text-white font-medium">{selectedFailure.customerEmail}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Recovery Status:</span>
                  <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold uppercase ${
                    (STATUS_MAP[selectedFailure.status] || STATUS_MAP.failed).color
                  }`}>
                    {selectedFailure.status}
                  </span>
                </div>
                {selectedFailure.paymentLinkUrl && (
                  <div className="pt-2 border-t border-border-dark/60 flex items-center justify-between text-xs">
                    <span className="text-text-muted">Generated Link:</span>
                    <a
                      href={selectedFailure.paymentLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono truncate max-w-[260px]"
                    >
                      {selectedFailure.paymentLinkUrl}
                    </a>
                  </div>
                )}
              </div>

              {/* AI Classifier Reasoning Card */}
              {selectedFailure.classification && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">psychology</span>
                      AI Classifier Diagnosis
                    </span>
                    <span className="text-xs text-text-muted">
                      Confidence: {Math.round((selectedFailure.classification.confidence || 0.8) * 100)}%
                    </span>
                  </div>
                  <p className="text-white text-xs leading-relaxed font-medium">
                    {selectedFailure.classification.reasoning || 'Classified based on gateway response and error semantics.'}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-text-muted">Recommended Action:</span>
                    <span className="text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {selectedFailure.classification.recommendedAction}
                    </span>
                  </div>
                </div>
              )}

              {/* Timeline Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Live Agent Actions</h4>
                  {timelineLoading && (
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <span className="material-symbols-outlined animate-spin text-[14px]">autorenew</span>
                      Syncing...
                    </span>
                  )}
                </div>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-dark">
                  {timeline.map((item, idx) => (
                    <div key={item._id || idx} className="relative group">
                      {/* Timeline Dot */}
                      <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-[#0e0e16] border-2 border-primary flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      </span>

                      <div className="bg-surface-dark border border-border-dark rounded-xl p-3.5 space-y-2 hover:border-primary/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white uppercase font-mono">
                            {item.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {new Date(item.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{item.detail}</p>

                        {/* Email Preview trigger if available in metadata */}
                        {item.meta?.emailPreview && (
                          <div className="pt-2">
                            <button
                              onClick={() => setActivePreviewEmail(item.meta.emailPreview)}
                              className="px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold hover:bg-primary/20 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">mail</span>
                              Preview Generated Email
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 5. EMAIL PREVIEW MODAL */}
      {activePreviewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#12121a] border border-border-dark rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-dark pb-3">
              <div>
                <h3 className="text-base font-bold text-white font-syne">Customer Recovery Email</h3>
                <span className="text-xs text-amber-400 font-medium">
                  {activePreviewEmail.status?.includes('simulated')
                    ? 'Email preview (sending disabled: RESEND_API_KEY missing)'
                    : 'Dispatched via Resend'}
                </span>
              </div>
              <button
                onClick={() => setActivePreviewEmail(null)}
                className="text-text-muted hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-text-muted block mb-1">Subject Line:</span>
                <div className="bg-background-dark border border-border-dark rounded-lg p-2.5 text-xs text-white font-medium">
                  {activePreviewEmail.subject}
                </div>
              </div>

              <div>
                <span className="text-xs text-text-muted block mb-1">Email Body:</span>
                <div className="bg-background-dark border border-border-dark rounded-lg p-3 text-xs text-slate-200 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                  {activePreviewEmail.body}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActivePreviewEmail(null)}
                className="px-4 py-2 bg-primary text-slate-900 rounded-lg text-xs font-bold hover:bg-primary-hover"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
