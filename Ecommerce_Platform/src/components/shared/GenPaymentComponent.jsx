import React, { useState } from 'react';
import api from '../../utils/api';

/**
 * GenPaymentComponent
 * Handles payment selections, dynamic SDK script injection (Razorpay),
 * communication with backend intents, and redirects to confirmation handlers.
 * 
 * Mode defaults to 'mock' if backend API keys are not supplied.
 */
export default function GenPaymentComponent({ total = 0, onResult }) {
  const [method, setMethod] = useState('razorpay'); // 'razorpay' | 'stripe' | 'mock'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dynamically inject Razorpay Checkout SDK Script
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

  // 1. RAZORPAY PAYMENT FLOW
  const handleRazorpayPayment = async () => {
    try {
      setLoading(true);
      setError('');

      // A. Create Order ID from Backend API
      const { data: orderData } = await api.post('/api/payment/razorpay/create-order', {
        amount: total,
        currency: 'INR',
      });

      if (!orderData || !orderData.success) {
        throw new Error(orderData.message || 'Error creating Razorpay Order');
      }

      // B. Check if Backend returned a Simulated/Mock Order ID
      if (orderData.isMock) {
        console.log('[Razorpay] Running in simulated mode.');
        const isScriptLoaded = await loadRazorpayScript();
        if (!isScriptLoaded && !window.Razorpay) {
          // If script fails to load, simulate locally
          setTimeout(() => {
            setLoading(false);
            const invoice = {
              id: orderData.order_id,
              paymentId: `pay_simulated_${Date.now()}`,
              total,
              gateway: 'Razorpay (Simulated Mode)',
              date: new Date().toISOString(),
            };
            if (onResult) onResult({ success: true, invoice });
          }, 1000);
          return;
        }
      } else {
        // Load script for production
        await loadRazorpayScript();
      }

      // C. Launch Checkout Modal
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'E-Cart Inc.',
        description: 'Order Credit / Due Payment',
        image: 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png',
        order_id: orderData.order_id,
        handler: async function (response) {
          // D. Send verification token to Backend
          try {
            setLoading(true);
            const { data: verifyData } = await api.post('/api/payment/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyData && verifyData.success) {
              const invoice = {
                id: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                total,
                gateway: verifyData.isMock ? 'Razorpay (Simulated)' : 'Razorpay',
                date: new Date().toISOString(),
              };
              if (onResult) onResult({ success: true, invoice });
            } else {
              setError('Payment verification failed.');
              if (onResult) onResult({ success: false, error: 'Verification failed' });
            }
          } catch (vErr) {
            setError(vErr.message || 'Signature verification API error');
            if (onResult) onResult({ success: false, error: vErr.message });
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: 'Demo Account',
          email: 'demo@ecart.com',
          contact: '9999999999',
        },
        theme: {
          color: '#2563eb', // Indigo Blue
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.open();
    } catch (err) {
      console.error('[Razorpay Error]:', err);
      setError(err.message || 'Razorpay initialization failed.');
      setLoading(false);
    }
  };

  // 2. STRIPE PAYMENT FLOW
  const handleStripePayment = async () => {
    try {
      setLoading(true);
      setError('');

      // A. Create PaymentIntent ClientSecret on Backend
      const { data } = await api.post('/api/payment/stripe/create-intent', {
        amount: total,
        currency: 'inr',
      });

      if (!data || !data.success) {
        throw new Error(data.message || 'Error creating Stripe Payment Intent');
      }

      // B. Simulate client-side Stripe checkout completion
      setTimeout(() => {
        setLoading(false);
        const invoice = {
          id: `STRIPE-INV-${Date.now()}`,
          paymentId: data.clientSecret,
          total,
          gateway: data.isMock ? 'Stripe (Simulated)' : 'Stripe',
          date: new Date().toISOString(),
        };
        if (onResult) onResult({ success: true, invoice });
      }, 1200);
    } catch (err) {
      console.error('[Stripe Error]:', err);
      setError(err.message || 'Stripe initialization failed.');
      setLoading(false);
    }
  };

  // 3. DIRECT MOCK SIMULATION FLOW (Instant Success)
  const handleInstantMockPayment = async () => {
    setLoading(true);
    setError('');
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLoading(false);

    const invoice = {
      id: `MOCK-INV-${Date.now()}`,
      paymentId: `pay_mock_${Date.now()}`,
      total,
      gateway: 'Mock Test Gateway',
      date: new Date().toISOString(),
    };
    if (onResult) onResult({ success: true, invoice });
  };

  const handlePaySubmit = () => {
    if (method === 'razorpay') {
      handleRazorpayPayment();
    } else if (method === 'stripe') {
      handleStripePayment();
    } else {
      handleInstantMockPayment();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-lg border border-gray-100 font-sans text-black">
      <div className="mb-4 text-lg font-bold text-gray-800">Select Gateway</div>

      {/* Gateway selector tabs */}
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
          <span className="text-[9px] text-gray-400">UPI/Cards (India)</span>
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
          <span className="text-[9px] text-gray-400">Intl Cards (Global)</span>
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
          <span className="text-base font-bold text-emerald-900">Test Mock</span>
          <span className="text-[9px] text-gray-400">Instant Success</span>
        </button>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 font-medium">Grand Total Due:</div>
          <div className="text-2xl font-black text-gray-900">₹{total.toLocaleString()}</div>
        </div>
        <div className="text-xs bg-green-100 text-green-800 font-semibold px-2.5 py-1 rounded-full">
          Secure Socket Layer 🔒
        </div>
      </div>

      {error && (
        <div className="mb-4 text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          ⚠️ {error}
        </div>
      )}

      <button
        disabled={loading}
        onClick={handlePaySubmit}
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
        {loading ? 'Processing Transaction...' : `Pay ₹${total.toLocaleString()} using ${method.toUpperCase()}`}
      </button>
    </div>
  );
}
