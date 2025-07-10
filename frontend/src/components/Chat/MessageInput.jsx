import React, { useState } from 'react';

const MessageInput = ({ onSend }) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Type your message..."
        style={{
          flex: 1,
          padding: '0.6rem 1rem',
          borderRadius: '20px',
          border: '1px solid #ccc',
          fontSize: '1rem',
          outline: 'none',
        }}
      />
      <button
        onClick={handleSend}
        style={{
          backgroundColor: '#007bff',
          color: '#fff',
          border: 'none',
          padding: '0.6rem 1.2rem',
          borderRadius: '20px',
          fontSize: '1rem',
          cursor: 'pointer',
        }}
      >
        Send
      </button>
    </div>
  );
};

export default MessageInput;
