import React, { useState } from 'react';
import { 
  Book, 
  PhilippinePeso, 
  BarChart3, 
  Search, 
  Filter, 
  Download, 
  Inbox,
  ChevronDown
} from "lucide-react";

// Component Imports
import Sidebar from "../components/common/Sidebar";
import StatCard from "../components/dashboard/StatCard";

const AllBookings = () => {
  // State for filtering and search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  // Empty data array for initial state
  const bookings = [];

  // Filter logic to include the new "Active" status
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          booking.service.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All Status" || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-700 text-left">
      {/* Sidebar navigation */}
      <Sidebar activePage="Bookings" />

      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {/* Page Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">All-Time Booking List</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Comprehensive transaction database for complete audit trail</p>
        </header>

        {/* --- 1. STATISTICS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <StatCard 
            title="Total Bookings" 
            value="0" 
            subtext="In selected filter" 
            isPrimary={false} 
            icon={Book} 
          />
          <StatCard 
            title="Total Revenue" 
            value="₱0" 
            subtext="From filtered bookings" 
            isPrimary={false} 
            icon={PhilippinePeso} 
          />
          <StatCard 
            title="Average Transaction" 
            value="₱0" 
            subtext="Per booking" 
            isPrimary={true} 
            icon={BarChart3} 
          />
        </div>

        {/* --- 2. SEARCH AND FILTER SECTION --- */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-8 flex flex-wrap gap-4 items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text"
              placeholder="Search by customer name or service..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            {/* Status Dropdown - Now including "Active" */}
            <div className="relative">
              <select 
                className="appearance-none bg-white border border-slate-200 rounded-xl px-6 py-2.5 pr-12 text-sm font-bold text-slate-600 focus:outline-none hover:border-sky-500 transition-colors cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>All Status</option>
                 <option>Completed</option>
                <option>Active</option>
                <option>Pending</option>
              </select>
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>

            {/* Export Button */}
            <button className="flex items-center gap-2 bg-sky-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-sky-600 transition-all active:scale-95 shadow-lg shadow-sky-100">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* --- 3. BOOKINGS TABLE / EMPTY STATE --- */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Booking ID</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer Name</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Service</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Date & Time</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking, index) => (
                  <tr key={index} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all">
                    {/* Data rows will be rendered here once connected to backend */}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center opacity-60">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Inbox size={40} className="text-slate-200" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-lg">No Records Found</h4>
                      <p className="text-sm text-slate-400 mt-1">Your laundry booking list is currently empty.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default AllBookings;