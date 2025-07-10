import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import ChatbotInterface from './Chat/ChatbotInterface';

const Layout = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          fontSize: '30px',
          cursor: 'pointer',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          zIndex: 1000,
        }}
        title={isChatOpen ? 'Close Chat' : 'Open Chat'}
      >
        💬
      </button>

      {/* Chatbot Window */}
      {isChatOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '350px',
            height: '500px',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '10px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ChatbotInterface />
        </div>
      )}
    </>
  );
};

export default Layout;
