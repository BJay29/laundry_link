import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './sidebar'; 
import Header from './header';     

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 1. Sidebar na may dalang collapse state */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* 2. Main Content Area na kusang nag-a-adjust ang margin at lapad */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'ml-20' : 'ml-72'
      }`}>
        <Header />
        <main className="p-6 flex-grow">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;