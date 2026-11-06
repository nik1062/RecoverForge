import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { paymentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function BillingPage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    paymentAPI.getTransactions()
      .then(res => setTransactions(res.data.data?.transactions || []))
      .catch(() => {})
      .finally(() => setTxLoading(false));
  }, []);

  const handleUpgrade = async () => {
    if (user?.plan === 'premium') return toast.error('You are already subscribed to RecoverForge Premium!');
    
    if (!window.Razorpay) {
      return toast.error('Razorpay SDK not loaded. Please check your internet connection.');
    }

    setLoading(true);
    try {
      const orderRes = await paymentAPI.createOrder('premium');
      const order = orderRes.data.order;

      const options = {
        key: order.key,
        amount: order.amount, // in paise (99900)
        currency: order.currency,
        name: 'RecoverForge',
        description: 'RecoverForge Premium Tier (1,000 monthly credits)',
        order_id: order.id,
        handler: async (response) => {
          try {
            const verifyRes = await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: 'premium'
            });
            updateUser(verifyRes.data.user);
            toast.success('Payment verified! Premium tier activated. 🎉');
            const txRes = await paymentAPI.getTransactions();
            setTransactions(txRes.data.data?.transactions || []);
          } catch (err) {
            toast.error(err.response?.data?.message || 'Verification failed');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || ''
        },
        theme: { color: '#E8FF47' }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate Razorpay checkout');
    } finally {
      setLoading(false);
    }
  };

  const isPremium = user?.plan === 'premium';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white font-syne">Billing & Platform Credits</h1>
          <p className="text-text-muted text-sm mt-1">Manage your merchant recovery tier and Razorpay transactions.</p>
        </div>

        {/* Current Plan Card */}
        <div className={`rounded-2xl p-6 border-2 ${isPremium ? 'bg-primary/5 border-primary' : 'bg-surface-dark border-border-dark'}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-2xl font-bold font-syne ${isPremium ? 'text-primary' : 'text-white'}`}>
                  {isPremium ? 'Premium Merchant Tier' : 'Free Starter Tier'}
                </span>
                {isPremium && (
                  <span className="px-2.5 py-0.5 bg-primary text-slate-900 text-xs font-bold rounded-full">ACTIVE</span>
                )}
              </div>
              <p className="text-text-muted text-xs">
                {isPremium ? '1,000 monthly credits · Full autonomous follow-up sequences' : '50 free recovery credits · Basic single-step recovery'}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-2xl font-bold text-white font-mono">{user?.credits ?? 50}</span>
                <span className="text-xs text-text-muted">recovery credits remaining</span>
              </div>
            </div>

            {!isPremium && (
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="px-6 py-3 bg-primary text-slate-900 font-bold rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-60 text-sm shadow-[0_0_20px_rgba(232,255,71,0.2)]"
              >
                {loading ? 'Processing...' : 'Upgrade to Premium (₹999)'}
              </button>
            )}
          </div>
        </div>

        {/* Transaction History (Stored in Paise, Displayed in Rupees) */}
        <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white font-syne">Billing Transactions</h2>
          {txLoading ? (
            <p className="text-xs text-text-muted">Loading transaction history...</p>
          ) : transactions.length === 0 ? (
            <p className="text-xs text-text-muted">No transactions on record yet.</p>
          ) : (
            <div className="divide-y divide-border-dark">
              {transactions.map(tx => (
                <div key={tx._id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-white font-medium capitalize block">{tx.plan} Plan</span>
                    <span className="text-text-muted font-mono">{new Date(tx.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-right">
                    {/* Convert paise to Rupees accurately: 99900 paise / 100 = ₹999 */}
                    <span className="text-white font-bold font-mono block">
                      ₹{Number(tx.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-emerald-400 capitalize font-medium">{tx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
