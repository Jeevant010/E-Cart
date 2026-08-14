# Developer Manual: E-Cart Codebase Architecture

This manual provides a detailed technical reference of the **E-Cart** codebase. It covers the data models, backend API routes, security guards, and the bookkeeping dues engine.

---

## 1. Technical Stack Overview

The project is structured as a MERN stack application with decoupled repositories:
- **Frontend SPA**: React 19, Vite, Tailwind CSS, Axios Client, React Router v7.
- **Backend API**: Node.js, Express.js, Mongoose ODM, Passport.js authentication.
- **Database**: MongoDB (Local or Atlas cloud cluster).

---

## 2. Database Models Schema (`Backend/models/`)

MongoDB documents use embedded arrays (sub-documents) to optimize load speed and reduce database `$lookup` joins.

### A. User Schema (`models/User.js`)
- `firstName`, `lastName`, `email`, `phone`, `password`: Core profile records.
- `cart`: Array of items currently selected by the customer.
  - `product`: Reference ObjectId (`ref: 'Product'`).
  - `quantity`: Number.
- `dues`: Array of credit ledger accounts. When a customer orders via COD, they accrue "dues" that are settled manually:
  - `date`: Timestamp.
  - `items`: Products purchased.
  - `dueAmount`: Outstanding monetary balance.
  - `fullyPaid`: Boolean tracker flag.
- `purchased_history`: Array recording successfully settled invoice checkouts.

### B. Admin Schema (`models/Admin.js`)
- `firstName`, `lastName`, `phone`, `password`, `email`: Profile values.
- `role`: Roles distinguish authorization access (`admin` vs `webappAdmin`).

### C. Product Schema (`models/Product.js`)
- `name`, `category`, `description`: Details.
- `stock`: Object tracking units (`type` e.g. piece/kg, `value` available stock, `unit`).
- `selling_Price` & `buying_Price`: Sub-objects containing price values. Used by admin panels to calculate total profit margins.

### D. Receipt Schema (`models/Receipt.js`)
- `user`: Customer Reference ObjectId.
- `amountPaid`: Amount received.
- `date`: Timestamp.
- `receivedBy`: Admin reference ObjectId.

---

## 3. Backend Routes & Middleware Flow

### A. Authentication Strategies (`Backend/index.js`)
- The server runs two independent Passport JWT strategies to maintain role separation:
  - **`user-jwt`**: Authenticates customers.
  - **`admin-jwt`**: Authenticates administrators.
- These strategies parse the JSON Web Token from the `Authorization: Bearer <token>` HTTP header.

### B. API Protections
- **CORS**: Restricts credentials and request origins. Only whitelisted clients (e.g. `http://localhost:5173`) are allowed.
- **Helmet**: Secures response headers to block cross-site scripting (XSS) and content sniffing.
- **CSRF**: Restricts state-changing operations by verifying cookie tokens.
- **Rate Limit**: Imposes a 1000 requests/hour limit on the `/admin` routes.

---

## 4. Frontend Client Architecture (`Ecommerce_Platform/src/`)

### A. Axios Client & Interceptors (`src/utils/api.js`)
- Custom client instance with default base URL `http://localhost:8080`.
- **Request Interceptor**: Reads the token from storage and appends it to headers automatically.
- **Response Interceptor**: Automatically intercepts `401 Unauthorized` responses:
  - For admin users: Sends a refresh token request to `/admin/token` and updates local storage.
  - For regular users: Clears tokens and sets `isAuthenticated` to `false` (triggering automatic redirection to the login page).

### B. Router Guards (`src/App.jsx`)
Defines two wrapper components:
1. **`<AdminRoute>`**: Checks if the user is authenticated and if the `role` is `'admin'` in localStorage. If not, it redirects them to `/admin/login`, preventing unauthorized `403 Forbidden` API states.
2. **`<AdminLoginRoute>`**: Redirects already-logged-in admins away from the login page directly to `/admin/main`.

---

## 5. Core Ledger Bookkeeping Mechanics

The app runs on a credit-book concept:

1. **Placing a COD Order**:
   - Customer clicks "Cash on Delivery" in Cart.
   - Frontend triggers `POST /order` on the backend.
   - Backend deducts product stock counts, appends the order to `user.orders` and a credit item in `user.dues`, and clears `user.cart`.

2. **Settling Balances**:
   - Admin receives cash offline from the customer.
   - Admin goes to the Admin Panel user details page and triggers **Receive Payment** (`POST /admin/user/:id/receive-payment`).
   - Backend processes payment using FIFO (First-In, First-Out) logic, deducting the balance from oldest unpaid dues, and generates a database `Receipt`.
