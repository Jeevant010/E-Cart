const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Optional dynamic import / require for SDKs
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

// Initialize Razorpay Instance helper
const getRazorpayInstance = () => {
  if (!Razorpay) {
    throw new Error('Razorpay SDK not installed. Run: npm install razorpay');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'mockKeySecret',
  });
};

// Initialize Stripe Instance helper
const getStripeInstance = () => {
  if (!Stripe) {
    throw new Error('Stripe SDK not installed. Run: npm install stripe');
  }
  return Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mockSecretKey');
};

// =========================================================================
// 1. RAZORPAY ENDPOINTS (Primary for India)
// =========================================================================

/**
 * @route   POST /api/payment/razorpay/create-order
 * @desc    Creates a Razorpay Order ID for frontend checkout modal
 */
router.post('/razorpay/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receiptId } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    // Razorpay expects amount in paise (1 INR = 100 paise)
    const options = {
      amount: Math.round(amount * 100),
      currency: currency,
      receipt: receiptId || `receipt_${Date.now()}`,
      payment_capture: 1, // Auto capture
    };

    // If SDK is present and keys are real, execute real SDK request; otherwise return clean mock order for dev testing
    if (Razorpay && process.env.RAZORPAY_KEY_ID) {
      const razorpay = getRazorpayInstance();
      const order = await razorpay.orders.create(options);
      return res.json({
        success: true,
        order_id: order.id,
        currency: order.currency,
        amount: order.amount,
        key_id: process.env.RAZORPAY_KEY_ID,
      });
    }

    // Mock fallback when key is not yet added in .env
    return res.json({
      success: true,
      order_id: `order_mock_${Date.now()}`,
      currency,
      amount: options.amount,
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_demoKey123',
      isMock: true,
    });
  } catch (error) {
    console.error('[Razorpay Order Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/payment/razorpay/verify
 * @desc    Verifies HMAC SHA256 Signature after customer pays on frontend
 */
router.post('/razorpay/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'mockKeySecret';
    const body = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic || razorpay_order_id.startsWith('order_mock_')) {
      // TODO: Save order / update receipt status in MongoDB here
      return res.json({
        success: true,
        message: 'Payment verified successfully!',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid payment signature!' });
    }
  } catch (error) {
    console.error('[Razorpay Verify Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 2. STRIPE ENDPOINTS (International)
// =========================================================================

/**
 * @route   POST /api/payment/stripe/create-intent
 * @desc    Creates a Stripe PaymentIntent and returns clientSecret
 */
router.post('/stripe/create-intent', async (req, res) => {
  try {
    const { amount, currency = 'inr' } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    if (Stripe && process.env.STRIPE_SECRET_KEY) {
      const stripe = getStripeInstance();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
      });

      return res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
      });
    }

    // Mock fallback
    return res.json({
      success: true,
      clientSecret: `pi_mock_secret_${Date.now()}`,
      isMock: true,
    });
  } catch (error) {
    console.error('[Stripe Intent Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
