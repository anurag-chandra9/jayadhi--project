import React, { useState } from 'react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import LoadingIndicator from './LoadingIndicator';

const ChatbotInterface = () => {
  const [messages, setMessages] = useState([
    { from: 'bot', text: '👋 Hello! I’m your Cyber Assistant. How can I help you today?' }
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (input) => {
    if (!input.trim()) return;
    const newMessages = [...messages, { from: 'user', text: input }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5005/webhooks/rest/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'user', message: input }),
      });

      const data = await res.json();
      const botReplies = data.map(d => ({ from: 'bot', text: d.text }));
      setMessages(prev => [...prev, ...botReplies]);
    } catch (err) {
      setMessages(prev => [...prev, { from: 'bot', text: "⚠️ Error contacting assistant." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.chatContainer}>
      <div style={styles.chatMessages}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && <LoadingIndicator />}
      </div>
      <MessageInput onSend={sendMessage} />
    </div>
  );
};

const styles = {
  chatContainer: {
    padding: '16px',
    maxWidth: '600px',
    margin: 'auto',
    height: '80vh',
    border: '1px solid #ccc',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 0 10px rgba(0,0,0,0.05)',
    backgroundColor: '#fff',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: '12px',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
};

export default ChatbotInterface;
