import React from 'react';
import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <>
      <Navbar />
      <main>
        <Outlet /> {/* Renders nested routes */}
      </main>
    </>
  );
};

export default Layout;
