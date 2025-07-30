// backend/routes/subscriptionRoutes.js
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Subscription = require('../models/subscriptionModel');
const User = require('../models/userModel'); // Assuming you have a User model

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ---------------------------
// POST /create-order
// ---------------------------
router.post('/create-order', async (req, res) => {
  const { amount, currency = 'INR', receipt, userId, plan } = req.body;

  if (!userId || !plan) {
    console.error('Missing userId or plan:', { userId, plan });
    return res.status(400).json({ error: 'userId and plan are required' });
  }

  try {
    const user = await User.findOne({ firebaseUid: userId });

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const options = {
      amount: amount * 100,
      currency,
      receipt,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    const subscription = await Subscription.create({
      user: user._id,
      plan,
      startDate: new Date(),
      isActive: false,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      subscriptionId: subscription._id,
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ---------------------------
// POST /verify-payment
// ---------------------------
router.post('/verify-payment', async (req, res) => {
  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    subscriptionId,
  } = req.body;

  try {
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const subscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      { isActive: true },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      razorpay_payment_id,
      razorpay_order_id,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ---------------------------
// POST /save – Store subscription after payment
// ---------------------------
router.post('/save', async (req, res) => {
  const { userId, plan, amount, razorpay_payment_id, razorpay_order_id, subscribedAt } = req.body;

  if (!userId || !plan || !razorpay_payment_id || !razorpay_order_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await User.findOne({ firebaseUid: userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existing = await Subscription.findOne({ user: user._id });

    if (existing) {
      existing.plan = plan;
      existing.amount = amount;
      existing.razorpay_payment_id = razorpay_payment_id;
      existing.razorpay_order_id = razorpay_order_id;
      existing.subscribedAt = new Date(subscribedAt);
      existing.isActive = true;
      await existing.save();
      return res.json({ success: true, updated: true });
    }

    await Subscription.create({
      user: user._id,
      plan,
      amount,
      razorpay_payment_id,
      razorpay_order_id,
      subscribedAt: new Date(subscribedAt),
      isActive: true,
    });

    res.json({ success: true, saved: true });
  } catch (err) {
    console.error('Subscription save error:', err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// ---------------------------
// GET /status?userId=xyz
// ---------------------------
router.get('/status', async (req, res) => {
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const user = await User.findOne({ firebaseUid: userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const subscription = await Subscription.findOne({ user: user._id, isActive: true });

    if (subscription) {
      res.json({
        subscribed: true,
        subscription: {
          plan: subscription.plan,
          amount: subscription.amount,
          razorpay_payment_id: subscription.razorpay_payment_id,
          razorpay_order_id: subscription.razorpay_order_id,
        },
      });
    } else {
      res.json({ subscribed: false });
    }
  } catch (err) {
    console.error('Status check error:', err);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;
