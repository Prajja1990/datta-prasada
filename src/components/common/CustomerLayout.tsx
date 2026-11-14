import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header, Footer } from './Header';

export const CustomerLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-mandala-pattern">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
