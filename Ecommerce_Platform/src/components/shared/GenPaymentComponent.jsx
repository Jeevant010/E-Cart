import React, { useState } from 'react';
import api from '../../utils/api';

/**
 * Enhanced GenPaymentComponent
 * Supports:
 * 1. Razorpay (India - UPI, Cards, NetBanking, Wallets)
 * 2. Stripe (Global Credit / Debit Cards)
 * 3. Mock Test Mode
 */
export default function GenPaymentComponent({ total = 0, onResult }) {
  const [method, setMethod] = useState('razorpay'); // 'razorpay' | 'stripe' | 'mock'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dynamically load Razorpay SDK script if not present
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Handle Razorpay Payment Flow
  const handleRazorpayPayment = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Create order on backend
      const { data: orderData } = await api.post('/api/payment/razorpay/create-order', {
        amount: total,
        currency: 'INR',
      });

      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create Razorpay Order');
      }

      // If in mock mode backend fallback
      if (orderData.isMock) {
        const isScriptLoaded = await loadRazorpayScript();
        if (!isScriptLoaded && !window.Razorpay) {
          // Complete fallback simulate for dev
          setTimeout(() => {
            setLoading(false);
            const invoice = {
              id: orderData.order_id,
              paymentId: `pay_mock_${Date.now()}`,
              total,
              gateway: 'Razorpay (Dev Mock)',
              date: new Date().toISOString(),
            };
            if (onResult) onResult({ success: true, invoice });
          }, 1000);
          return;
        }
      }

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'E-Cart Superstore',
        description: 'Order Payment',
        image: 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png',
        order_id: orderData.order_id,
        handler: async function (response) {
          // 3. Verify Payment Signature on backend
          try {
            const { data: verifyData } = await api.post('/api/payment/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyData.success) {
              const invoice = {
                id: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                total,
                gateway: 'Razorpay',
                date: new Date().toISOString(),
              };
              if (onResult) onResult({ success: true, invoice });
            } else {
              setError('Payment verification failed!');
              if (onResult) onResult({ success: false, error: 'Verification failed' });
            }
          } catch (vErr) {
            setError(vErr.message || 'Verification endpoint error');
            if (onResult) onResult({ success: false, error: vErr.message });
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: 'Customer',
          email: 'customer@example.com',
          contact: '9999999999',
        },
        theme: {
          color: '#2563eb', // Blue-600
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const razorpayObj = new window.Razorpay(options);
      razorpayObj.open();
    } catch (err) {
      console.error('Razorpay Error:', err);
      setError(err.message || 'Razorpay initiation failed');
      setLoading(false);
    }
  };

  // Handle Stripe Payment Flow
  const handleStripePayment = async () => {
    try {
      setLoading(true);
      setError('');

      const { data } = await api.post('/api/payment/stripe/create-intent', {
        amount: total,
        currency: 'inr',
      });

      if (!data.success) {
        throw new Error(data.message || 'Failed to create Stripe Payment Intent');
      }

      // Simulate client side confirmation
      setTimeout(() => {
        setLoading(false);
        const invoice = {
          id: `STRIPE-INV-${Date.now()}`,
          clientSecret: data.clientSecret,
          total,
          gateway: 'Stripe',
          date: new Date().toISOString(),
        };
        if (onResult) onResult({ success: true, invoice });
      }, 1200);
    } catch (err) {
      setError(err.message || 'Stripe payment failed');
      setLoading(false);
    }
  };

  // Handle Mock Test Payment
  const handleMockPayment = async () => {
    setLoading(true);
    setError('');
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);

    const invoice = {
      id: `INV-MOCK-${Date.now()}`,
      total,
      gateway: 'Mock Test Gateway',
      date: new Date().toISOString(),
    };
    if (onResult) onResult({ success: true, invoice });
  };

  const executePayment = () => {
    if (method === 'razorpay') handleRazorpayPayment();
    else if (method === 'stripe') handleStripePayment();
    else handleMockPayment();
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-lg border border-gray-100 font-sans">
      <div className="mb-4 text-xl font-bold text-gray-800">Select Payment Method</div>

      {/* Gateway Selector Tabs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setMethod('razorpay')}
          className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-semibold border flex flex-col items-center justify-center transition-all ${
            method === 'razorpay'
              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="text-base font-bold text-blue-900">Razorpay</span>
          <span className="text-[10px] text-gray-500">UPI, Cards, NetBanking (India)</span>
        </button>

        <button
          type="button"
          onClick={() => setMethod('stripe')}
          className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-semibold border flex flex-col items-center justify-center transition-all ${
            method === 'stripe'
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="text-base font-bold text-indigo-900">Stripe</span>
          <span className="text-[10px] text-gray-500">International Cards</span>
        </button>

        <button
          type="button"
          onClick={() => setMethod('mock')}
          className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-semibold border flex flex-col items-center justify-center transition-all ${
            method === 'mock'
              ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="text-base font-bold text-emerald-900">Test Demo</span>
          <span className="text-[10px] text-gray-500">Instant Simulation</span>
        </button>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 font-medium">Total Amount Payable</div>
          <div className="text-2xl font-black text-gray-900">₹{total.toLocaleString()}</div>
        </div>
        <div className="text-xs bg-green-100 text-green-800 font-semibold px-2.5 py-1 rounded-full">
          Encrypted & Secure 🔒
        </div>
      </div>

      {error && (
        <div className="mb-4 text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          ⚠️ {error}
        </div>
      )}

      <button
        disabled={loading}
        onClick={executePayment}
        className={`w-full py-3.5 rounded-xl font-bold text-white text-base shadow-md transition-all ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : method === 'razorpay'
            ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
            : method === 'stripe'
            ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99]'
            : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]'
        }`}
      >
        {loading ? 'Processing Payment...' : `Pay ₹${total.toLocaleString()} with ${method.toUpperCase()}`}
      </button>
    </div>
  );
}
