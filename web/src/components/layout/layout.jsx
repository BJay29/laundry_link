import React from 'react';
import Sidebar from './sidebar';
import { Outlet } from 'react-router-dom';

/**
 * Layout Component
 * This component wraps protected routes and provides a consistent structure
 * with a fixed sidebar and a scrollable main content area.
 */
const Layout = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 1. Fixed Sidebar Section */}
      <Sidebar />

      {/* 2. Main Content Area */}
      <main className="flex-1 ml-72 min-h-screen">
        <div className="max-w-[1600px] mx-auto p-4">
          {/* 
            The <Outlet /> component is a placeholder that renders 
            the child route elements defined in App.jsx.
          */}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;