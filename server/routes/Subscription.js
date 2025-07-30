const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Subscription = require('../models/subscriptionModel');
const User = require('../models/userModel');
const { protect } = require('../middleware/protect'); // 1. Import the protect middleware

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order for subscription payment
// 2. Add the 'protect' middleware to secure this route
router.post('/create-order', protect, async (req, res) => {
  // 3. Remove userId from the body and get the authenticated user from req.user
  const { amount, currency = 'INR', receipt, plan } = req.body;
  const user = req.user; // This is the logged-in user from the token

  if (!plan) {
    return res.status(400).json({ error: 'plan is required' });
  }

  try {
    const options = {
      amount: amount * 100, // Amount in the smallest currency unit (paise)
      currency,
      receipt,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    // Create a subscription record linked to the authenticated user
    const subscription = await Subscription.create({
      user: user._id,
      plan,
      startDate: new Date(),
      isActive: false, // Will be activated after payment verification
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

// Verify Razorpay payment and activate subscription
// This route is called by Razorpay's webhook, so it should remain public
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
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
