const Subscription = require('../models/Subscription');

exports.saveSubscription = async (req, res) => {
  const { userId, plan, amount, razorpay_payment_id, razorpay_order_id, subscribedAt } = req.body;

  if (!userId || !plan || !razorpay_payment_id || !razorpay_order_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const existing = await Subscription.findOne({ userId });

    if (existing) {
      existing.plan = plan;
      existing.amount = amount;
      existing.razorpay_payment_id = razorpay_payment_id;
      existing.razorpay_order_id = razorpay_order_id;
      existing.subscribedAt = new Date(subscribedAt);
      await existing.save();
      return res.json({ success: true, updated: true });
    }

    const newSub = new Subscription({
      userId,
      plan,
      amount,
      razorpay_payment_id,
      razorpay_order_id,
      subscribedAt: new Date(subscribedAt),
    });

    await newSub.save();
    res.json({ success: true, saved: true });
  } catch (err) {
    console.error('Save subscription error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
