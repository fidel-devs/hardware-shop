// M-Pesa Daraja STK Push backend (Node.js + Express)
// Install: npm install express axios dotenv
// Start: node server.js

require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const {
  MPESA_ENV = 'sandbox',
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  MPESA_CALLBACK_URL,
  PORT = 3000,
} = process.env;

const baseUrl = MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

async function getAccessToken() {
  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
    throw new Error('Set MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET in .env');
  }
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  const response = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  return response.data.access_token;
}

function timestampNow() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/mpesa/stk', async (req, res) => {
  try {
    const { phone, amount, accountReference = 'Order', transactionDesc = 'Payment' } = req.body;
    // Safaricom expects a Kenyan number in 2547XXXXXXXX or 2541XXXXXXXX format.
    const normalizedPhone = String(phone || '').replace(/^0/, '254').replace(/^\+/, '');
    const numericAmount = Number(amount);
    if (!/^254[17]\d{8}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: 'Enter a valid Kenyan phone number, e.g. 0712345678.' });
    }
    if (!Number.isInteger(numericAmount) || numericAmount < 1) {
      return res.status(400).json({ error: 'Amount must be a whole number of at least KSh 1.' });
    }
    if (!MPESA_SHORTCODE || !MPESA_PASSKEY || !MPESA_CALLBACK_URL) {
      return res.status(500).json({ error: 'Set MPESA_SHORTCODE, MPESA_PASSKEY and MPESA_CALLBACK_URL in .env.' });
    }

    const token = await getAccessToken();
    const timestamp = timestampNow();
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
    const response = await axios.post(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: numericAmount,
      PartyA: normalizedPhone,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: normalizedPhone,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: String(accountReference).slice(0, 12),
      TransactionDesc: String(transactionDesc).slice(0, 13),
    }, { headers: { Authorization: `Bearer ${token}` } });

    res.json({ message: 'STK Push request submitted. Check the phone for the M-Pesa prompt.', data: response.data });
  } catch (error) {
    console.error('STK Push error:', error.response?.data || error.message);
    res.status(502).json({ error: 'Could not start M-Pesa payment. Check server configuration and logs.' });
  }
});

app.post('/api/mpesa/callback', (req, res) => {
  // Save the callback to your database and verify ResultCode === 0 before marking an order paid.
  console.log('M-Pesa callback:', JSON.stringify(req.body, null, 2));
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
