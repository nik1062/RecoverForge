import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { failureAPI } from '../services/api';

export default function DemoStorePage() {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState({ name: 'Pro SaaS Subscription', pricePaise: 199900, priceDisplay: '₹1,999' });
  const [simulating, setSimulating] = useState(false);
  const [simulateCategory, setSimulateCategory] = useState('insufficient_funds');

  const handleSimulateDirectFailure = async () => {
    setSimulating(true);
    const toastId = toast.loading('Simulating failure via live agent pipeline...');
    try {
      const errorMap = {
        insufficient_funds: { code: 'BAD_REQUEST_ERROR', reason: 'insufficient_funds' },
        bank_decline: { code: 'GATEWAY_ERROR', reason: 'payment_declined_by_bank' },
        user_dropoff: { code: 'USER_DROPPED_OUT', reason: 'otp_screen_dismissed' },
        technical_error: { code: 'GATEWAY_TIMEOUT', reason: 'network_timeout_at_gateway' },
        fraud_suspected: { code: 'SECURITY_VIOLATION', reason: 'stolen_card_blacklisted' }
      };
      const sel = errorMap[simulateCategory] || errorMap.insufficient_funds;

      await failureAPI.simulateFailure({
        amount: selectedPlan.pricePaise,
        customerEmail: `customer.${Date.now().toString().slice(-4)}@buyer.io`,
        errorCode: sel.code,
        errorReason: sel.reason
      });

      toast.success('Failure recorded! Check your Recovery Dashboard to inspect the live AI Agent timeline.', { id: toastId, duration: 5000 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Simulation error', { id: toastId });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Razorpay AI Buildathon — Live Demo Environment
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white font-syne">Demo Store Checkout</h1>
          <p className="text-text-muted text-sm max-w-xl mx-auto">
            Experience how RecoverForge perceives payment failure events from Razorpay in real-time, classifies the failure root cause, and initiates personalized recovery actions.
          </p>
        </div>

        {/* Product Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { id: 'p1', name: 'Standard Pro Plan', pricePaise: 99900, priceDisplay: '₹999', desc: '10,000 API calls/month + priority compute' },
            { id: 'p2', name: 'Enterprise SaaS Tier', pricePaise: 249900, priceDisplay: '₹2,499', desc: 'Unlimited workloads + dedicated Slack connect' }
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedPlan(item)}
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedPlan.name === item.name
                  ? 'bg-primary/5 border-primary shadow-[0_0_25px_rgba(232,255,71,0.15)]'
                  : 'bg-surface-dark border-border-dark hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white font-syne">{item.name}</h3>
                <span className="text-xl font-bold text-primary font-mono">{item.priceDisplay}</span>
              </div>
              <p className="text-xs text-text-muted mb-4">{item.desc}</p>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                Instant Razorpay Test Checkout
              </div>
            </div>
          ))}
        </div>

        {/* Live Simulator Trigger Box */}
        <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 lg:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">smart_toy</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-syne">Simulate Live Payment Failure</h2>
              <p className="text-xs text-text-muted">Directly invoke the full end-to-end recovery pipeline</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Select Failure Category to Test
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'insufficient_funds', label: 'Insufficient Funds' },
                  { id: 'bank_decline', label: 'Bank Decline' },
                  { id: 'user_dropoff', label: 'User Drop-off' },
                  { id: 'technical_error', label: 'Technical Glitch' },
                  { id: 'fraud_suspected', label: 'Suspected Fraud (Safety Test)' }
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSimulateCategory(c.id)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                      simulateCategory === c.id
                        ? 'bg-primary text-slate-900 border-primary shadow-sm'
                        : 'bg-background-dark border-border-dark text-slate-300 hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-background-dark border border-border-dark rounded-xl space-y-2 text-xs">
              <span className="font-semibold text-white block">What will happen:</span>
              <ul className="list-disc pl-5 space-y-1 text-text-muted">
                <li>A realistic Razorpay payment failure event is registered for <strong className="text-white">{selectedPlan.priceDisplay}</strong>.</li>
                <li>OpenAI <strong className="text-primary font-mono">gpt-4o-mini</strong> classifies root cause & decides optimal recovery timing.</li>
                <li>Fresh Razorpay Payment Link is created with 48h expiration.</li>
                <li>Personalized recovery email is synthesized with opt-out link.</li>
                <li>Everything appears in real-time on your Recovery Dashboard audit trail.</li>
              </ul>
            </div>

            <button
              onClick={handleSimulateDirectFailure}
              disabled={simulating}
              className="w-full py-4 bg-primary text-slate-900 font-bold rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(232,255,71,0.25)] disabled:opacity-60"
            >
              <span className={`material-symbols-outlined ${simulating ? 'animate-spin' : ''}`}>
                {simulating ? 'sync' : 'play_arrow'}
              </span>
              <span>{simulating ? 'Processing Recovery Pipeline...' : `Trigger ${selectedPlan.priceDisplay} Failure Event`}</span>
            </button>
          </div>
        </div>

        {/* Razorpay Test Mode Card Guide */}
        <div className="bg-background-dark border border-border-dark rounded-xl p-5 text-xs text-text-muted space-y-2">
          <span className="font-bold text-white uppercase tracking-wider block">Razorpay Standard Test Cards Reference</span>
          <p>When running the standard Razorpay Checkout modal in Test Mode, use these official credentials to trigger specific outcomes:</p>
          <div className="font-mono bg-[#07070b] p-3 rounded border border-border-dark/60 text-slate-300 space-y-1">
            <div>• Insufficient Balance: Card ending in <span className="text-amber-400 font-bold">3335</span> (or any valid test card with OTP cancelled)</div>
            <div>• Bank Decline: Card ending in <span className="text-red-400 font-bold">0002</span></div>
            <div>• Success: Card ending in <span className="text-emerald-400 font-bold">1111</span> with OTP 123456</div>
          </div>
        </div>

      </div>
    </div>
  );
}
