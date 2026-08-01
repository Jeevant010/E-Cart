import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Icon } from '@iconify/react';

export default function ConfirmPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
  const { success = false, invoice = null, error = '' } = state;

  return (
    <div className="max-w-[600px] mx-auto min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 font-sans text-black">
      {success ? (
        <div className="w-full bg-white rounded-2xl shadow-xl p-8 border border-green-100 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon icon="mdi:check-decagram" className="text-4xl text-green-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-green-700 mb-2">Payment Successful!</h1>
          <p className="text-gray-500 mb-8 text-sm">Thank you for your payment. Your transaction was processed successfully.</p>

          {invoice && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left border border-gray-100 text-sm space-y-3 font-mono">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Invoice ID:</span>
                <span className="font-bold text-gray-800">{invoice.id}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Transaction ID:</span>
                <span className="font-bold text-gray-800">{invoice.paymentId || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Payment Gateway:</span>
                <span className="font-bold text-blue-600">{invoice.gateway || 'Online'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Total Paid:</span>
                <span className="font-bold text-green-700">₹{invoice.total?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span className="font-bold text-gray-800">
                  {invoice.date ? new Date(invoice.date).toLocaleString() : new Date().toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/orders"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition shadow"
            >
              View My Orders
            </Link>
            <Link
              to="/"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl transition"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon icon="mdi:close-circle" className="text-4xl text-red-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-red-700 mb-2">Payment Failed</h1>
          <p className="text-gray-500 mb-6 text-sm">
            We couldn't process your transaction. {error || 'Please verify details and try again.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button
              onClick={() => navigate(-1)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition shadow"
            >
              Retry Payment
            </button>
            <Link
              to="/cart"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl transition"
            >
              Back to Cart
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
