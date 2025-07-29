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
  const { user, isLoggedIn } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
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
    setSuccessDetails(null);

    // Debug authentication state
    console.log('🔍 Auth State Check:', { 
      isLoggedIn, 
      user: !!user, 
      userUid: user?.uid
    });

    // Validate user authentication - check Firebase auth state
    if (!isLoggedIn || !user || !user.uid) {
      setPaymentError('Authentication required. Please log in first.');
      setLoadingPlan('');
      return;
    }

    // Validate Razorpay key
    const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      setPaymentError('Payment configuration error. Please contact support.');
      setLoadingPlan('');
      return;
    }

    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.REACT_APP_API_URL || 'https://jayadhi-project-hyrv.onrender.com')
        : (process.env.REACT_APP_API_URL || 'http://localhost:3000');
      
      // Get Firebase ID token instead of localStorage token
      const token = await user.getIdToken();
      console.log('🔑 Firebase token obtained:', !!token);
      
      if (!token) {
        setPaymentError('Authentication required. Please log in first.');
        setLoadingPlan('');
        return;
      }

      const res = await fetch(`${apiUrl}/api/subscription/create-order`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          amount: plan.amount,
          plan: plan.name,
          userId: user.uid,
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
              // Get fresh Firebase token for verification
              const verifyToken = await user.getIdToken();
              const verifyRes = await fetch(`${apiUrl}/api/subscription/verify-payment`, {
                method: 'POST',
                mode: 'cors',
                credentials: 'include',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${verifyToken}`,
                  'Origin': window.location.origin
                },
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
            transform: animate ? 'translateY(0)' : 'translateY(-20px)',
            opacity: animate ? 1 : 0,
            transition: 'all 0.5s ease',
          }}
        >
          <h3>✅ Payment Successful!</h3>
          <p><b>Plan:</b> {successDetails.plan}</p>
          <p><b>Amount:</b> ₹{successDetails.amount}</p>
          <p><b>Payment ID:</b> {successDetails.razorpay_payment_id}</p>
          <p><b>Order ID:</b> {successDetails.razorpay_order_id}</p>
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
            transform: animate ? 'translateY(0)' : 'translateY(-20px)',
            opacity: animate ? 1 : 0,
            transition: 'all 0.5s ease',
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
              transform: animate ? 'scale(1)' : 'scale(0.9)',
              opacity: animate ? 1 : 0,
              transition: `all 0.5s ease ${index * 0.2}s`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
            }}
          >
            {index === 1 && (
              <div style={{
                position: 'absolute',
                top: animate ? '-14px' : '-40px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#f59e0b',
                color: '#000',
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '999px',
                fontWeight: '600',
                transition: 'top 0.6s ease',
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
                transition: 'all 0.3s ease',
                boxShadow: '0 0 0 transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
                e.currentTarget.style.boxShadow = '0 0 10px #3B82F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3B82F6';
                e.currentTarget.style.boxShadow = '0 0 0 transparent';
              }}
            >
              {loadingPlan === plan.name ? 'Processing...' : `Choose ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: '14px', color: '#e5e7eb', marginTop: '40px' }}>
        ✅ 24/7 Security Monitoring &nbsp;&nbsp;&nbsp; ✅ Real-time Threat Detection &nbsp;&nbsp;&nbsp; ✅ Automated Response
      </p>
    </div>
  );
};

export default SubscriptionForm;
