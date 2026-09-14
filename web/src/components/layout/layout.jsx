import React from 'react';
import Sidebar from './sidebar';
import Header from './header';
import { Outlet } from 'react-router-dom';

/**
 * Layout Component
 * This component wraps protected routes and provides a consistent structure
 * with a fixed sidebar, a sticky header, and a scrollable main content area.
 */
const Layout = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 1. Fixed Sidebar Section */}
      <Sidebar />

      {/* 2. Main Content Area (May ml-72 para hindi matakpan ng fixed sidebar) */}
      <div className="flex-1 ml-72 flex flex-col min-h-screen">
        {/* Sticky Header sa Itaas */}
        <Header />

        {/* Main Body kung saan lumalabas ang mga Routes/Pages */}
        <main className="flex-1 p-6">
          <div className="max-w-[1600px] mx-auto">
            {/* 
              The <Outlet /> component is a placeholder that renders 
              the child route elements defined in App.jsx.
            */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;