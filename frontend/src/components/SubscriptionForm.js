import React, { useState, useEffect } from 'react';

const PLANS = [
  { name: 'Basic', amount: 799, description: 'Basic protection for individuals' },
  { name: 'Pro', amount: 1999, description: 'Advanced security for small teams' },
  { name: 'Enterprise', amount: 2999, description: 'Full suite for organizations' },
];

const SubscriptionForm = () => {
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [successDetails, setSuccessDetails] = useState(null);
  const [userId, setUserId] = useState('');

  // Load Razorpay script
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Extract userId from JWT
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

  const handlePlanChange = (e) => {
    const plan = PLANS.find(p => p.name === e.target.value);
    setSelectedPlan(plan);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPaymentError('');
    setPaymentSuccess(false);
    setSuccessDetails(null);

    try {
      const res = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedPlan.amount,
          plan: selectedPlan.name,
          userId,
          receipt: `receipt_${selectedPlan.name}_${Date.now()}`
        }),
      });

      const data = await res.json();

      if (data.orderId && window.Razorpay) {
        const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY_ID;
        console.log('Razorpay Key:', razorpayKey);

        const options = {
          key: razorpayKey,
          amount: data.amount,
          currency: data.currency,
          name: 'CyberSentinel Subscription',
          description: selectedPlan.description,
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

              const contentType = verifyRes.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const verifyData = await verifyRes.json();
                if (verifyRes.ok && verifyData.success) {
                  setPaymentSuccess(true);
                  setSuccessDetails({
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id
                  });
                } else {
                  setPaymentError(verifyData.error || 'Payment verification failed');
                }
              } else {
                const text = await verifyRes.text();
                setPaymentError('Server error: ' + text);
              }
            } catch (err) {
              setPaymentError('Payment verification failed');
            }
          },
          prefill: {
            email: '',
          },
          theme: { color: '#3399cc' },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        setPaymentError(data.error || 'Order creation failed');
      }
    } catch (err) {
      setPaymentError('Error: ' + err.message);
    }
    setLoading(false);
  };
   console.log("🔐 Razorpay Key:", process.env.REACT_APP_RAZORPAY_KEY_ID);

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #eee' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Choose Your Subscription</h2>
      {paymentSuccess && successDetails ? (
        <div style={{ color: 'green', textAlign: 'center' }}>
          <h3>Payment Successful!</h3>
          <p>Plan: <b>{selectedPlan.name}</b></p>
          <p>Amount: ₹{selectedPlan.amount}</p>
          <p>Subscription activated.</p>
          <p>Payment ID: {successDetails.razorpay_payment_id}</p>
          <p>Order ID: {successDetails.razorpay_order_id}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label>
            Plan:
            <select value={selectedPlan.name} onChange={handlePlanChange} style={{ width: '100%', margin: '12px 0', padding: 8 }}>
              {PLANS.map(plan => (
                <option key={plan.name} value={plan.name}>
                  {plan.name} - ₹{plan.amount}
                </option>
              ))}
            </select>
          </label>
          <div style={{ marginBottom: 12, color: '#555', fontSize: 14 }}>
            {selectedPlan.description}
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: '#3399cc', color: '#fff', border: 'none', borderRadius: 6 }}>
            {loading ? 'Processing...' : `Pay ₹${selectedPlan.amount}`}
          </button>
          {paymentError && <div style={{ color: 'red', marginTop: 16 }}>{paymentError}</div>}
        </form>
       

      )}
    </div>
  );
};

export default SubscriptionForm;
