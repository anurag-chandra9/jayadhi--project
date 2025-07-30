import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

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
  const { user } = useAuth(); // 1. Get the user object from our corrected AuthContext
  const [loadingPlan, setLoadingPlan] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Load the Razorpay script
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
    setTimeout(() => setAnimate(true), 50);
  }, []);

  const handlePayment = async (plan) => {
    setLoadingPlan(plan.name);
    setPaymentError('');
    setPaymentSuccess(false);

    // 2. Validate the user is logged into our application
    if (!user || !user.token) {
      setPaymentError('Authentication required. Please log in first.');
      setLoadingPlan('');
      return;
    }

    const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      setPaymentError('Payment configuration error. Please contact support.');
      setLoadingPlan('');
      return;
    }

    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.REACT_APP_API_URL || 'https://jayadhi-project-hyrv.onrender.com')
        : 'http://localhost:3000';
      
      // 3. Create the order using our application's JWT for authentication
      const res = await fetch(`${apiUrl}/api/subscription/create-order`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`, // <-- THE FIX: Use the app's token
        },
        body: JSON.stringify({
          amount: plan.amount,
          plan: plan.name,
          receipt: `receipt_${plan.name}_${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (data.orderId && window.Razorpay) {
        const options = {
          key: razorpayKey,
          amount: data.amount,
          currency: data.currency,
          name: 'CyberSentinel Subscription',
          description: `Payment for ${plan.name} Plan`,
          order_id: data.orderId,
          handler: async function (response) {
            try {
              // The /verify-payment route is a public webhook, but we can still call it
              const verifyRes = await fetch(`${apiUrl}/api/subscription/verify-payment`, {
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
                  plan: plan.name,
                  amount: plan.amount,
                  razorpay_payment_id: response.razorpay_payment_id,
                });
              } else {
                setPaymentError(verifyData.error || 'Payment verification failed');
              }
            } catch (err) {
              setPaymentError('Payment verification failed');
            }
          },
          prefill: {
            email: user.email, // Prefill user's email
          },
          theme: { color: '#6366f1' },
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
    <div
      style={{
        backgroundColor: '#181818',
        color: '#fff',
        minHeight: '100vh',
        padding: '40px 20px',
        fontFamily: 'Segoe UI, sans-serif',
        opacity: animate ? 1 : 0,
        transform: animate ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
      }}
    >
      <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: '700' }}>Choose Your Security Plan</h2>
      <p style={{ textAlign: 'center', fontSize: '16px', marginBottom: '40px', color: '#d1d5db' }}>
        Comprehensive web application security solutions for businesses of all sizes.
      </p>

      {paymentSuccess && successDetails && (
        <div
          style={{
            backgroundColor: '#1f9d55',
            color: '#fff',
            textAlign: 'center',
            marginBottom: '24px',
            padding: 16,
            borderRadius: 8,
          }}
        >
          <h3>✅ Payment Successful!</h3>
          <p><b>Plan:</b> {successDetails.plan}</p>
          <p><b>Amount:</b> ₹{successDetails.amount}</p>
          <p><b>Payment ID:</b> {successDetails.razorpay_payment_id}</p>
        </div>
      )}

      {paymentError && (
        <div
          style={{
            backgroundColor: '#dc2626',
            color: '#fff',
            textAlign: 'center',
            marginBottom: '24px',
            padding: 16,
            borderRadius: 8,
          }}
        >
          {paymentError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '24px' }}>
        {PLANS.map((plan, index) => (
          <div
            key={plan.name}
            style={{
              border: '1px solid #ffffff',
              borderRadius: 12,
              padding: 28,
              width: 300,
              backgroundColor: index === 1 ? '#1E3A8A' : '#111827',
              textAlign: 'center',
              position: 'relative',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
              transition: `all 0.5s ease ${index * 0.2}s`,
            }}
          >
            {index === 1 && (
              <div style={{
                position: 'absolute',
                top: '-14px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#f59e0b',
                color: '#000',
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '999px',
                fontWeight: '600',
              }}>
                Most Popular
              </div>
            )}
            <h3 style={{ fontSize: '20px', fontWeight: '600' }}>{plan.name}</h3>
            <p style={{ fontSize: 14, marginBottom: 12, color: '#e5e7eb' }}>{plan.description}</p>
            <h2 style={{ margin: '16px 0', fontSize: 24, fontWeight: '700' }}>
              ₹{plan.amount} <span style={{ fontSize: 14, color: '#e5e7eb' }}>/month</span>
            </h2>
            <ul style={{ textAlign: 'left', marginTop: 16, paddingLeft: 20, color: '#e5e7eb', fontSize: 14 }}>
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
                backgroundColor: '#3B82F6',
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
