
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { createOrder, verifyPayment, getTransactions } from '../services/api';
import { useAuth } from '../context/AuthContext';

const BillingPage = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    getTransactions().then(res => setTransactions(res.data.transactions || [])).catch(() => {}).finally(() => setTxLoading(false));
  }, []);

  const handleUpgrade = async () => {
    if (user?.plan === 'premium') return toast.error('Already on Premium!');
    
    // 1. Check if Razorpay SDK is loaded
    if (!window.Razorpay) {
      return toast.error('Razorpay SDK not loaded. Please check your internet connection.');
    }

    setLoading(true);
    try {
      // 1. Fetch order from backend
      const orderRes = await createOrder();
      console.log('--- PAYMENT INITIALIZATION START ---');
      console.log('RAW API DATA:', orderRes.data);
      
      // 2. Defensive Extraction: try multiple paths for the key and order
      const data = orderRes.data;
      const order = data.order || data;
      const rzpKey = order.key || data.key || (data.order && data.order.key);
      
      console.log('EXTRACTED DATA:', { 
        orderId: order?.id, 
        keyFound: !!rzpKey, 
        keyPrefix: rzpKey ? String(rzpKey).substring(0, 8) : 'NONE' 
      });

      if (!order || !order.id || !rzpKey) {
        console.error('CRITICAL ERROR: Missing payment data.', { order, rzpKey });
        throw new Error("Payment data incomplete. Check server logs and environment variables.");
      }

      const options = {
        key: String(rzpKey).trim(), // RESOLVED: Using robust string-trimmed key
        amount: order.amount,
        currency: order.currency,
        name: 'MailForge',
        description: 'Premium Plan - 1000 credits/month',
        order_id: order.id,
        handler: async (response) => {
          console.log('RAZORPAY SUCCESS:', response);
          try {
            const verifyRes = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            updateUser(verifyRes.data.user);
            toast.success('Payment successful! 🎉');
            const txRes = await getTransactions();
            setTransactions(txRes.data.transactions || []);
          } catch (err) {
            console.error('VERIFICATION ERROR:', err);
            toast.error(err.response?.data?.message || 'Verification failed');
          }
        },
        prefill: { 
          name: user?.name || '', 
          email: user?.email || '' 
        },
        theme: { color: '#E8FF47' },
        modal: { 
          ondismiss: () => {
            console.log('User closed Razorpay modal');
            toast('Payment cancelled', { icon: 'ℹ️' });
          }
        }
      };

      console.log('FINAL RAZORPAY OPTIONS:', { ...options, key: 'HIDDEN' });
      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', (response) => {
        console.error('RAZORPAY FAILED EVENT:', response.error);
        toast.error(`Payment failed: ${response.error.description}`);
      });

      razorpay.open();
    } catch (err) {
      console.error('UPGRADE FLOW ERROR:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const isPremium = user?.plan === 'premium';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white font-display">Billing & Plan</h1>
          <p className="text-text-secondary mt-1">Manage your subscription and credits</p>
        </div>

        {/* Current Plan */}
        <div className={`rounded-2xl p-6 border-2 mb-8 ${isPremium ? 'bg-primary/5 border-primary' : 'bg-surface-dark border-border-dark'}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-2xl font-bold font-display ${isPremium ? 'text-primary' : 'text-white'}`}>
                  {isPremium ? 'Premium Plan' : 'Free Plan'}
                </span>
                {isPremium && (
                  <span className="px-2 py-0.5 bg-primary text-background-dark text-xs font-bold rounded-full">ACTIVE</span>
                )}
              </div>
              <p className="text-text-secondary">{isPremium ? '1,000 credits/month · Priority AI generation' : '50 total credits · Basic features'}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-3xl font-bold text-white font-display">{user?.credits || 0}</span>
                <span className="text-text-secondary">credits remaining</span>
              </div>
            </div>
            {!isPremium && (
              <button onClick={handleUpgrade} disabled={loading}
                className="px-8 py-3 bg-primary text-background-dark font-bold rounded-xl hover:bg-primary-hover transition-all shadow-[0_0_30px_rgba(232,255,71,0.3)] disabled:opacity-60 flex items-center gap-2 text-lg">
                {loading ? <><span className="material-symbols-outlined animate-spin">refresh</span> Processing...</> : <>Upgrade to Premium</>}
              </button>
            )}
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Free */}
          <div className={`p-6 rounded-2xl border ${!isPremium ? 'border-white/20 bg-surface-lighter' : 'border-border-dark bg-surface-dark'}`}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-white font-display">Free</h3>
              {!isPremium && <span className="text-xs bg-white/10 border border-white/20 text-white px-2 py-0.5 rounded-full">Current</span>}
            </div>
            <div className="text-3xl font-bold text-white mb-5">₹0</div>
            <ul className="space-y-2.5">
              {['50 total credits', '5 credits per cold email', '3 credits per follow-up', 'Email history', 'Basic support'].map(f => (
                <li key={f} className="flex items-center gap-2 text-text-secondary text-sm">
                  <span className="material-symbols-outlined text-[16px]">check</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Premium */}
          <div className={`p-6 rounded-2xl border-2 relative ${isPremium ? 'border-primary bg-primary/5' : 'border-primary/50 bg-surface-lighter'}`}>
            <div className="absolute -top-3 left-6 px-3 py-1 bg-primary text-background-dark text-xs font-bold rounded-full">BEST VALUE</div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-white font-display">Premium</h3>
              {isPremium && <span className="text-xs bg-primary/20 border border-primary/30 text-primary px-2 py-0.5 rounded-full">Active</span>}
            </div>
            <div className="text-3xl font-bold text-primary mb-5">₹999<span className="text-base text-text-secondary font-normal">/mo</span></div>
            <ul className="space-y-2.5">
              {['1,000 credits/month', '5 credits per cold email', '3 credits per follow-up', 'Priority AI generation', 'Full history & search', 'Follow-up sequences', 'Priority support'].map(f => (
                <li key={f} className="flex items-center gap-2 text-white text-sm">
                  <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span> {f}
                </li>
              ))}
            </ul>
            {!isPremium && (
              <button onClick={handleUpgrade} disabled={loading}
                className="mt-6 w-full py-3 bg-primary text-background-dark font-bold rounded-xl hover:bg-primary-hover transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? 'Processing...' : 'Upgrade Now →'}
              </button>
            )}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-surface-dark border border-border-dark rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Transaction History</h2>
          {txLoading ? (
            <div className="py-8 text-center text-text-secondary">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-text-secondary text-3xl">receipt_long</span>
              <p className="text-text-secondary mt-2 text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border-dark">
              {transactions.map(tx => (
                <div key={tx._id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.status === 'success' ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30'}`}>
                      <span className={`material-symbols-outlined text-[16px] ${tx.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.status === 'success' ? 'check' : 'close'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium capitalize">{tx.plan} Plan</p>
                      <p className="text-text-secondary text-xs">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-medium">₹{(tx.amount / 100).toFixed(0)}</p>
                    <p className={`text-xs capitalize ${tx.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>{tx.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
