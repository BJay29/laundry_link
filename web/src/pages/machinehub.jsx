import React, { useState } from 'react';
import { Plus, Zap, Droplets, FlaskConical, Trash2, Monitor } from 'lucide-react';

const MachineHub = () => {
  // Initialize state with the full 12-machine roster for Ham Wash
  // Data fields are left empty or at zero to prepare for database connection
  const [machines, setMachines] = useState([
    { id: 'W1', type: 'Washer', status: 'idle', cycles: 0, detergent: '₱0.00', electricity: '₱0.00', water: '₱0.00' },
    { id: 'W2', type: 'Washer', status: 'idle', cycles: 0, detergent: '₱0.00', electricity: '₱0.00', water: '₱0.00' },
    { id: 'W3', type: 'Washer', status: 'idle', cycles: 0, detergent: '₱0.00', electricity: '₱0.00', water: '₱0.00' },
    { id: 'W4', type: 'Washer', status: 'idle', cycles: 0, detergent: '₱0.00', electricity: '₱0.00', water: '₱0.00' },
    { id: 'W5', type: 'Washer', status: 'idle', cycles: 0, detergent: '₱0.00', electricity: '₱0.00', water: '₱0.00' },
    { id: 'W6', type: 'Washer', status: 'idle', cycles: 0, detergent: '₱0.00', electricity: '₱0.00', water: '₱0.00' },
    { id: 'D1', type: 'Dryer', status: 'idle', cycles: 0, detergent: '₱0.00', electricity: '₱0.00', water: '₱0.00' },
    { id: 'D2', type: 'Dryer', status: 'idle', cycles: 0, detergent: '₱0.00', electricity: '₱0.00', water: '₱0.00' },
    { id: 'D3', type: 'Dryer', status: 'idle', cycles: 0, detergent: '₱0.00', electricity: '₱0.00', water: '₱0.00' },
    { id: 'D4', type: 'Dryer', status: 'idle', cycles: 0, detergent: '₱0.00', electricity: '₱0.00', water: '₱0.00' },
    { id: 'D5', type: 'Dryer', status: 'idle', cycles: 0, detergent: '₱0.00', electricity: '₱0.00', water: '₱0.00' },
    { id: 'D6', type: 'Dryer', status: 'idle', cycles: 0, detergent: '₱0.00', electricity: '₱0.00', water: '₱0.00' },
  ]);

  // Function to handle machine deletion from the local state
  const deleteMachine = (id) => {
    setMachines(machines.filter((m) => m.id !== id));
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Machine Hub</h1>
          <p className="text-slate-500 font-bold">Monitor all 12 units and operating overhead</p>
        </div>
        <button className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all active:scale-95">
          <Plus size={20} /> Add Unit
        </button>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <CostCard icon={<FlaskConical size={24} className="text-purple-500" />} label="Total Detergent Cost" value="₱0" bgColor="bg-purple-50" />
        <CostCard icon={<Zap size={24} className="text-amber-500" />} label="Total Electricity Cost" value="₱0" bgColor="bg-amber-50" />
        <CostCard icon={<Droplets size={24} className="text-blue-500" />} label="Total Water Cost" value="₱0" bgColor="bg-blue-50" />
      </div>

      {/* Machine Management Table */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="p-6 text-[11px] font-black uppercase text-slate-400 tracking-wider">Machine ID</th>
                <th className="p-6 text-[11px] font-black uppercase text-slate-400 tracking-wider">Type</th>
                <th className="p-6 text-[11px] font-black uppercase text-slate-400 tracking-wider">Status</th>
                <th className="p-6 text-[11px] font-black uppercase text-slate-400 tracking-wider text-center">Cycles</th>
                <th className="p-6 text-[11px] font-black uppercase text-slate-400 tracking-wider text-center">Detergent/Cycle</th>
                <th className="p-6 text-[11px] font-black uppercase text-slate-400 tracking-wider text-center">Power/Cycle</th>
                <th className="p-6 text-[11px] font-black uppercase text-slate-400 tracking-wider text-center">Water/Cycle</th>
                <th className="p-6 text-[11px] font-black uppercase text-slate-400 tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {machines.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-sky-100 group-hover:text-sky-500 transition-colors">
                        <Monitor size={16} />
                      </div>
                      <span className="font-black text-slate-900">{m.id}</span>
                    </div>
                  </td>
                  <td className="p-6 text-slate-500 font-bold">{m.type}</td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                      m.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="p-6 text-center font-bold text-slate-700">{m.cycles}</td>
                  <td className="p-6 text-center font-bold text-slate-400 italic">{m.detergent}</td>
                  <td className="p-6 text-center font-bold text-slate-400 italic">{m.electricity}</td>
                  <td className="p-6 text-center font-bold text-slate-400 italic">{m.water}</td>
                  <td className="p-6 text-center">
                    <button 
                      onClick={() => deleteMachine(m.id)}
                      className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Reusable Helper Component for Cost Cards
const CostCard = ({ icon, label, value, bgColor }) => (
  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6 hover:shadow-md transition-shadow">
    <div className={`p-4 ${bgColor} rounded-2xl`}>{icon}</div>
    <div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-900">{value}</p>
    </div>
  </div>
);

export default MachineHub;