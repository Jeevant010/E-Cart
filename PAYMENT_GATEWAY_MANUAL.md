# Developer Reference Manual: Payment Gateway Integration

This manual explains the payment gateway integration architecture (Razorpay & Stripe) implemented in the **E-Cart** application. It serves as a study guide for understanding how the frontend client interacts with the backend payment endpoints and payment processor APIs.

---

## 1. Architectural Architecture Flow

The payment sequence consists of three main stages:
1. **Session/Order Initialization**: Frontend requests the backend to initialize an order session.
2. **Checkout Presentation**: Frontend uses the gateway SDK or modal (Stripe Elements or Razorpay Checkout) to collect payment.
3. **Transaction Settlement**: The transaction is verified, and backend `/order` is invoked to create the order and clear the cart.

```
[ Frontend: React Cart Page ]
            │
            ├── 1. POST /api/payment/[gateway]/create-order
            ▼
[ Backend: Node.js Server ] ──── Request to Gateway API ────► [ Gateway Servers ]
            │                                                      │
            ◄─── Returns Key ID, Secret, ClientSecret ─────────────┘
            │
[ Frontend: Present Modal ] ◄─── Card / UPI details submitted
            │
            ├── 2. Success callback received from client SDK
            ├── 3. POST /order (Method: Card/Razorpay, details: invoice)
            ▼
[ Backend: Finalise Order ] ──── Deducts inventory stock ───► [ Mark Paid & Save Order ]
```

---

## 2. Razorpay Integration Details (India Local Payments)

Razorpay is integrated for handling UPI (GPay, PhonePe, Paytm), NetBanking, and credit/debit card transactions in India.

### A. Endpoint List
- **`POST /api/payment/razorpay/create-order`**: Creates a Razorpay Order ID.
- **`POST /api/payment/razorpay/verify`**: Verifies the HMAC SHA256 payment signature.

### B. MOCK/Simulation Mode Behavior
If `RAZORPAY_KEY_ID` is missing from the `.env` file, the server returns:
- `order_id`: `order_simulated_[timestamp]`
- `key_id`: `rzp_test_simulatedKey123`
- `isMock`: `true`

On the frontend, `GenPaymentComponent.jsx` detects `isMock: true`. If the Razorpay Checkout script fails to load (e.g. offline), it bypasses opening the script modal and simulates success after 1 second.

### C. Signature Verification Formula
To confirm that a transaction is authentic, the backend computes an HMAC SHA256 digest:
$$\text{Signature} = \text{HMAC-SHA256}(\text{order\_id} + "|" + \text{payment\_id}, \text{RAZORPAY\_KEY\_SECRET})$$

It compares this value with `razorpay_signature` submitted by the checkout modal.

---

## 3. Stripe Integration Details (Global Payments)

Stripe is integrated to process credit and debit cards globally.

### A. Endpoint List
- **`POST /api/payment/stripe/create-intent`**: Returns a Stripe `clientSecret`.

### B. MOCK/Simulation Mode Behavior
If `STRIPE_SECRET_KEY` is not configured, the backend returns:
- `clientSecret`: `pi_simulated_secret_[timestamp]`
- `isMock`: `true`

The frontend mock handler detects this and simulates checkout completion.

---

## 4. Re-enabling Production Gateways
To switch from simulation mode to active payment gateways:

1. Open your **Backend `.env`** file.
2. Replace mock placeholders with real keys:
   ```env
   # Razorpay Keys
   RAZORPAY_KEY_ID=rzp_test_YourKeyId
   RAZORPAY_KEY_SECRET=YourKeySecret

   # Stripe Keys
   STRIPE_SECRET_KEY=sk_test_YourSecretKey
   ```
3. Run `npm install razorpay stripe` in the `Backend` folder to ensure the Node packages are fully configured.
