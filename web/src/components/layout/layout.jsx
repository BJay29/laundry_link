import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './sidebar';
import Header from './header';
import useMediaQuery from '../../hooks/useMediaQuery';

/**
 * LAYOUT (responsive)
 *
 * - Desktop (lg: 1024px pataas): gaya ng dati — fixed na sidebar sa kaliwa
 *   (puwedeng i-collapse), at ang content ay may kaliwang margin na
 *   sumusunod sa lapad nito.
 * - Phone/tablet (< lg): nakatago ang sidebar. May hamburger button sa
 *   <Header onMenuClick> na nagbubukas nito bilang DRAWER na may madilim na overlay.
 *   Nagsasara ito kapag pumili ng menu (nagbago ang route), pinindot ang
 *   overlay, pinindot ang Esc, o pinindot ang collapse arrow ng sidebar.
 *
 * NOTE: iisang instance lang ng <Sidebar /> ang nire-render. Ang wrapper
 * nito ay may `transform`, kaya ang `fixed` na sidebar sa loob ay nakapuwesto
 * kaugnay ng wrapper — kaya gumagana ang slide-in kahit hindi binago ang
 * sidebar.jsx mismo.
 */
const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const location = useLocation();

  // Isara ang drawer sa bawat paglipat ng page.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Kapag lumaki ang screen (rotate/resize), isara ang drawer.
  useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  // Esc para isara + huwag mag-scroll ang page sa likod habang bukas.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  // Sa phone laging full-width ang drawer (hindi ginagamit ang collapsed).
  const sidebarCollapsed = isDesktop ? isCollapsed : false;
  const handleSetCollapsed = isDesktop
    ? setIsCollapsed
    : () => setMobileOpen(false); // ang collapse arrow ay nagsasara ng drawer

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Overlay (phone/tablet lang) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[55] bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 1. Sidebar — drawer sa phone, fixed sa desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-[60] w-72 lg:w-0 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <Sidebar isCollapsed={sidebarCollapsed} setIsCollapsed={handleSetCollapsed} />
      </div>

      {/* 2. Main content — min-w-0 para hindi lumampas ang lapad ng laman */}
      <div
        className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ease-in-out ml-0 ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-72'
        }`}
      >
        <Header onMenuClick={() => setMobileOpen(true)} />

        <main className="p-3 sm:p-4 lg:p-6 flex-grow min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;