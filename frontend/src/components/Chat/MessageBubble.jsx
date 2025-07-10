import React from 'react';

const MessageBubble = ({ message }) => {
  const isUser = message.from === 'user';

  const bubbleStyle = {
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    backgroundColor: isUser ? '#007bff' : '#e9ecef',
    color: isUser ? '#fff' : '#000',
    padding: '0.75rem 1rem',
    borderRadius: '20px',
    maxWidth: '75%',
    wordWrap: 'break-word',
    fontSize: '0.95rem',
  };

  return <div style={bubbleStyle}>{message.text}</div>;
};

export default MessageBubble;
