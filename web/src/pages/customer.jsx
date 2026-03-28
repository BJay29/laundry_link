import React, { useState } from 'react';
import { 
  Users, Search, Filter, Award, 
  TrendingUp, UserMinus, Inbox, ChevronDown 
} from 'lucide-react';
import Sidebar from '../components/common/Sidebar'; 
const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("All Segments");

  const customers = []; 

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (segmentFilter === "All Segments" || c.segment === segmentFilter)
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-700 text-left">
      <Sidebar activePage="Customers" />

      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Customer Intelligence</h1>
          <p className="text-slate-500 text-sm font-medium">K-Means clustering for strategic customer segmentation</p>
        </header>

        {/* --- 1. SEGMENT SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border-b-4 border-b-emerald-500 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg"><TrendingUp size={20}/></div>
              <p className="text-3xl font-black text-slate-800">0</p>
            </div>
            <p className="font-bold text-slate-700 text-sm">Active</p>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Loyalists • 0% of base</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border-b-4 border-b-amber-400 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-amber-50 text-amber-500 rounded-lg"><Users size={20}/></div>
              <p className="text-3xl font-black text-slate-800">0</p>
            </div>
            <p className="font-bold text-slate-700 text-sm">Mildly Active</p>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Occasional • 0% of base</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border-b-4 border-b-rose-500 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-rose-50 text-rose-500 rounded-lg"><UserMinus size={20}/></div>
              <p className="text-3xl font-black text-slate-800">0</p>
            </div>
            <p className="font-bold text-slate-700 text-sm">Inactive</p>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">At-Risk • 0% of base</p>
          </div>
        </div>

        {/* --- 2. SEARCH & FILTER BAR --- */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text"
              placeholder="Search by customer name or email..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative min-w-[200px]">
            <select 
              className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 focus:outline-none"
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
            >
              <option>All Segments</option>
              <option>Active - Loyalists</option>
              <option>Mildly Active - Occasional</option>
              <option>Inactive - At-Risk</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>

        {/* --- 3. CUSTOMER TABLE / EMPTY STATE --- */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Customer Name</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Total Bookings</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Segment</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                    {/* Table Data here eventually */}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200">
                        <Inbox size={32} />
                      </div>
                      <h4 className="font-bold text-slate-800">No Customer Insights Found</h4>
                      <p className="text-[11px] text-slate-400 max-w-[250px] mt-1 font-medium">
                        Your customer segmentation will appear here once the system analyzes your transaction history.
                      </p>
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

export default Customers;