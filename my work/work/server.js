require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "30kb" }));
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.MPESA_ENV === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";
const payments = new Map(); // Demo storage only. Use a database for production.
const MENU = {
  1: { name: "Nyama Choma Plate", price: 850 },
  2: { name: "Creamy Chicken Pasta", price: 650 },
  3: { name: "Classic Beef Burger", price: 550 },
  4: { name: "Grilled Chicken", price: 700 },
  5: { name: "Crispy Masala Chips", price: 250 },
  6: { name: "Fresh Garden Salad", price: 300 },
  7: { name: "Pilau & Kachumbari", price: 450 },
  8: { name: "Fresh Mango Juice", price: 180 },
  9: { name: "Iced Lemon Mint", price: 150 }
};

function requiredEnv() {
  const keys = ["MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_SHORTCODE", "MPESA_PASSKEY", "MPESA_CALLBACK_URL"];
  return keys.filter(key => !process.env[key]);
}
function timestampNow() {
  const d = new Date();
  return d.getFullYear().toString() + String(d.getMonth()+1).padStart(2,"0") + String(d.getDate()).padStart(2,"0") + String(d.getHours()).padStart(2,"0") + String(d.getMinutes()).padStart(2,"0") + String(d.getSeconds()).padStart(2,"0");
}
async function getAccessToken() {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64");
  const response = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.errorMessage || "Daraja authentication failed.");
  return data.access_token;
}

app.post("/api/mpesa/stkpush", async (req, res) => {
  const missing = requiredEnv();
  if (missing.length) return res.status(503).json({ error: "M-Pesa is not configured on the server yet." });
  const { phone, items } = req.body || {};
  if (!/^254[17]\d{8}$/.test(String(phone || ""))) return res.status(400).json({ error: "Enter a valid Kenyan M-Pesa phone number." });
  if (!Array.isArray(items) || items.length < 1 || items.length > 30) return res.status(400).json({ error: "Your order is empty or invalid." });
  let amount = 0;
  for (const line of items) {
    const item = MENU[Number(line.id)];
    const quantity = Number(line.quantity);
    if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) return res.status(400).json({ error: "One or more order items are invalid." });
    amount += item.price * quantity;
  }
  if (!Number.isSafeInteger(amount) || amount < 1) return res.status(400).json({ error: "Invalid payment amount." });

  try {
    const token = await getAccessToken();
    const timestamp = timestampNow();
    const shortcode = process.env.MPESA_SHORTCODE;
    const password = Buffer.from(`${shortcode}${process.env.MPESA_PASSKEY}${timestamp}`).toString("base64");
    const transactionType = process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline";
    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: amount,
      PartyA: phone,
      PartyB: process.env.MPESA_PARTY_B || shortcode,
      PhoneNumber: phone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: `SB${Date.now().toString().slice(-8)}`,
      TransactionDesc: "Savanna Bites order"
    };
    const response = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || data.ResponseCode !== "0" || !data.CheckoutRequestID) {
      console.error("Daraja STK Push rejected:", data);
      return res.status(502).json({ error: data.errorMessage || data.ResponseDescription || "Safaricom could not start the payment. Check your Daraja settings." });
    }
    payments.set(data.CheckoutRequestID, { status: "pending", amount, phone, receipt: null, createdAt: Date.now() });
    return res.json({ status: "pending", checkoutRequestId: data.CheckoutRequestID, customerMessage: data.CustomerMessage || "Check your phone for the M-Pesa prompt." });
  } catch (error) {
    console.error("STK Push error:", error.message);
    return res.status(502).json({ error: "Could not connect to M-Pesa. Please try again shortly." });
  }
});

app.post("/api/mpesa/callback", (req, res) => {
  try {
    const callback = req.body?.Body?.stkCallback;
    if (!callback?.CheckoutRequestID) return res.status(400).json({ ResultCode: 1, ResultDesc: "Invalid callback" });
    const payment = payments.get(callback.CheckoutRequestID);
    if (payment) {
      if (Number(callback.ResultCode) === 0) {
        const meta = callback.CallbackMetadata?.Item || [];
        const value = name => meta.find(item => item.Name === name)?.Value;
        const paidAmount = Number(value("Amount"));
        const receipt = value("MpesaReceiptNumber");
        // Do not mark paid unless callback amount matches server-calculated order amount.
        if (paidAmount === payment.amount && receipt) {
          payment.status = "paid";
          payment.receipt = String(receipt);
        } else {
          payment.status = "failed";
          payment.message = "Payment details could not be verified. Contact the restaurant before retrying.";
        }
      } else {
        payment.status = "failed";
        payment.message = callback.ResultDesc || "M-Pesa payment was cancelled or failed.";
      }
      payments.set(callback.CheckoutRequestID, payment);
    }
    return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("Callback processing error:", error.message);
    return res.status(500).json({ ResultCode: 1, ResultDesc: "Callback processing failed" });
  }
});

app.get("/api/mpesa/status/:checkoutRequestId", (req, res) => {
  const payment = payments.get(req.params.checkoutRequestId);
  if (!payment) return res.status(404).json({ error: "Payment request not found. Please start payment again." });
  if (Date.now() - payment.createdAt > 15 * 60 * 1000 && payment.status === "pending") {
    payment.status = "failed";
    payment.message = "Payment request expired. Please try again.";
  }
  return res.json({ status: payment.status, receipt: payment.receipt, message: payment.message });
});

app.listen(PORT, () => console.log(`Savanna Bites running at http://localhost:${PORT}`));
