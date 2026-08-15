import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GenPaymentComponent from '../components/shared/GenPaymentComponent';
import api from '../utils/api';

function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const total = location?.state?.total ?? 0;
  const [placingOrder, setPlacingOrder] = useState(false);

  const handleResult = async ({ success, invoice, error }) => {
    if (!success) {
      navigate('/checkout/confirm', { state: { success: false, error } });
      return;
    }

    setPlacingOrder(true);
    try {
      // Call backend /order endpoint to save the order and clear the cart
      const response = await api.post('/order', {
        method: invoice?.gateway || 'Online Card',
        paymentDetails: invoice,
      });

      if (response && (response.status === 200 || response.data)) {
        navigate('/checkout/confirm', { state: { success: true, invoice } });
      } else {
        throw new Error('Failed to finalise order on the server.');
      }
    } catch (err) {
      console.error('[Payment Checkout Finalisation Error]:', err);
      const serverError = err.response?.data?.message || err.message || 'Payment received, but failed to create your order.';
      navigate('/checkout/confirm', { state: { success: false, error: serverError } });
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="max-w-[900px] mx-auto min-h-screen px-4 md:px-8 py-12 md:py-16 font-sans text-black relative">
      {placingOrder && (
        <div className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center z-50 rounded-2xl">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-bold text-gray-800">Finalising your Order...</h2>
          <p className="text-sm text-gray-500 mt-1">Please do not refresh the page or click back.</p>
        </div>
      )}

      <h1 className="text-3xl font-extrabold text-gray-900 mb-2 text-center">E-Cart Secure Checkout</h1>
      <p className="text-center text-gray-500 text-sm mb-8">
        Verify your total and select your preferred payment mode below.
      </p>

      <GenPaymentComponent
        total={total > 0 ? total : 499}
        onResult={handleResult}
      />
    </div>
  );
}

export default PaymentPage;
