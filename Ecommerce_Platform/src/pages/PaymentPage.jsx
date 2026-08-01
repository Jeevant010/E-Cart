import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GenPaymentComponent from '../components/shared/GenPaymentComponent';

function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const total = location?.state?.total ?? 0;

  const handleResult = ({ success, invoice, error }) => {
    if (success) {
      navigate('/checkout/confirm', { state: { success: true, invoice } });
    } else {
      navigate('/checkout/confirm', { state: { success: false, error } });
    }
  };

  return (
    <div className="max-w-[900px] mx-auto min-h-screen px-4 md:px-8 py-12 md:py-16 font-sans">
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
