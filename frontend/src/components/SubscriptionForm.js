import React, { useState, useEffect } from 'react';

const PLANS = [
  {
    name: 'Basic',
    amount: 799,
    description: 'For individuals & small businesses',
    features: ['3 domains', 'Email alerts', 'Basic dashboard'],
  },
  {
    name: 'Pro',
    amount: 1999,
    description: 'For teams & growing companies',
    features: ['10 domains', 'Automation', 'Analytics', 'Weekly threat insights'],
  },
  {
    name: 'Enterprise',
    amount: 2999,
    description: 'For enterprises & SaaS platforms',
    features: ['Unlimited domains', '24/7 support', 'Custom API', 'Advanced ML security', 'Audit tools'],
  },
];

const SubscriptionForm = () => {
  const [loadingPlan, setLoadingPlan] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(payload.sub || payload._id || payload.id || '');
      } catch {
        setUserId('');
      }
    }
  }, []);

  const handlePayment = async (plan) => {
    setLoadingPlan(plan.name);
    setPaymentError('');
    setPaymentSuccess(false);
    setSuccessDetails(null);

    try {
      const res = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: plan.amount,
          plan: plan.name,
          userId,
          receipt: `receipt_${plan.name}_${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (data.orderId && window.Razorpay) {
        const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY_ID;

        const options = {
          key: razorpayKey,
          amount: data.amount,
          currency: data.currency,
          name: 'CyberSentinel Subscription',
          description: plan.description,
          order_id: data.orderId,
          handler: async function (response) {
            try {
              const verifyRes = await fetch('/api/subscription/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  subscriptionId: data.subscriptionId,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                setPaymentSuccess(true);
                setSuccessDetails({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  plan: plan.name,
                  amount: plan.amount,
                });
              } else {
                setPaymentError(verifyData.error || 'Payment verification failed');
              }
            } catch (err) {
              setPaymentError('Payment verification failed');
            }
          },
          theme: { color: '#4F46E5' },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        setPaymentError(data.error || 'Order creation failed');
      }
    } catch (err) {
      setPaymentError('Error: ' + err.message);
    }

    setLoadingPlan('');
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Segoe UI, sans-serif', background: '#f9fafb', minHeight: '100vh' }}>
      <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 'bold', marginBottom: '16px' }}>Choose Your Security Plan</h2>
      <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '40px' }}>
        Comprehensive web application security solutions for businesses of all sizes. Protect your digital assets with our advanced threat detection and monitoring.
      </p>

      {paymentSuccess && successDetails && (
        <div style={{ color: 'green', textAlign: 'center', marginBottom: '24px' }}>
          <h3>✅ Payment Successful!</h3>
          <p><b>Plan:</b> {successDetails.plan}</p>
          <p><b>Amount:</b> ₹{successDetails.amount}</p>
          <p><b>Payment ID:</b> {successDetails.razorpay_payment_id}</p>
          <p><b>Order ID:</b> {successDetails.razorpay_order_id}</p>
        </div>
      )}

      {paymentError && (
        <div style={{ color: 'red', textAlign: 'center', marginBottom: '24px' }}>
          {paymentError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '24px' }}>
        {PLANS.map((plan) => (
          <div key={plan.name} style={{
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: 28,
            width: 280,
            backgroundColor: '#fff',
            boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
            textAlign: 'center',
            transition: 'transform 0.3s',
          }}>
            <h3 style={{ fontSize: '22px', fontWeight: '600' }}>{plan.name}</h3>
            <p style={{ fontSize: 16, color: '#6b7280', margin: '8px 0' }}>{plan.description}</p>
            <h2 style={{ margin: '16px 0', fontSize: 28, fontWeight: '700' }}>
              ₹{plan.amount} <span style={{ fontSize: 14, color: '#6b7280' }}>/month</span>
            </h2>
            <ul style={{ textAlign: 'left', marginTop: 16, paddingLeft: 20, color: '#374151', fontSize: 14 }}>
              {plan.features.map((f, idx) => (
                <li key={idx}>✔ {f}</li>
              ))}
            </ul>
            <button
              onClick={() => handlePayment(plan)}
              disabled={loadingPlan === plan.name}
              style={{
                marginTop: 20,
                padding: '12px 24px',
                backgroundColor: '#4F46E5',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: '600',
                width: '100%',
              }}
            >
              {loadingPlan === plan.name ? 'Processing...' : `Choose ${plan.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionForm;
