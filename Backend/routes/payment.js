const express = require('express');
const router = express.Router();
const crypto = require('crypto');

let Razorpay;
try {
  Razorpay = require('razorpay');
} catch (e) {
  Razorpay = null;
}

let Stripe;
try {
  Stripe = require('stripe');
} catch (e) {
  Stripe = null;
}

// Helper to initialize Razorpay
const getRazorpayInstance = () => {
  if (!Razorpay) {
    throw new Error('Razorpay SDK not installed. Please run npm install.');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'mock_key_id',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret',
  });
};

// Helper to initialize Stripe
const getStripeInstance = () => {
  if (!Stripe) {
    throw new Error('Stripe SDK not installed. Please run npm install.');
  }
  return Stripe(process.env.STRIPE_SECRET_KEY || 'mock_secret_key');
};

// ==========================================
// Razorpay Order Creation Route
// ==========================================
router.post('/razorpay/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receiptId } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    // Razorpay expects amount in paise (1 INR = 100 paise)
    const options = {
      amount: Math.round(amount * 100),
      currency: currency,
      receipt: receiptId || `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    // Check if we have real credentials. If not, trigger clean simulation.
    const isMock = !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'mock_key_id';

    if (!isMock && Razorpay) {
      const razorpay = getRazorpayInstance();
      const order = await razorpay.orders.create(options);
      return res.json({
        success: true,
        order_id: order.id,
        currency: order.currency,
        amount: order.amount,
        key_id: process.env.RAZORPAY_KEY_ID,
        isMock: false,
      });
    }

    // Simulated response for local development/testing without keys
    return res.json({
      success: true,
      order_id: `order_simulated_${Date.now()}`,
      currency: currency,
      amount: options.amount,
      key_id: 'rzp_test_simulatedKey123',
      isMock: true,
    });
  } catch (error) {
    console.error('[Razorpay Order Creation Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// Razorpay Verification Route
// ==========================================
router.post('/razorpay/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Check if it's a simulated order
    if (razorpay_order_id && razorpay_order_id.startsWith('order_simulated_')) {
      return res.json({
        success: true,
        message: 'Simulated payment verified successfully!',
        paymentId: razorpay_payment_id || `pay_simulated_${Date.now()}`,
        orderId: razorpay_order_id,
        isMock: true,
      });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      return res.status(500).json({ success: false, message: 'RAZORPAY_KEY_SECRET is not set in backend .env' });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      return res.json({
        success: true,
        message: 'Payment verified successfully!',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        isMock: false,
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('[Razorpay Verification Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// Stripe Intent Creation Route
// ==========================================
router.post('/stripe/create-intent', async (req, res) => {
  try {
    const { amount, currency = 'inr' } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const isMock = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'mock_secret_key';

    if (!isMock && Stripe) {
      const stripe = getStripeInstance();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
      });

      return res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        isMock: false,
      });
    }

    // Simulated response for local development/testing without keys
    return res.json({
      success: true,
      clientSecret: `pi_simulated_secret_${Date.now()}`,
      isMock: true,
    });
  } catch (error) {
    console.error('[Stripe Intent Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
