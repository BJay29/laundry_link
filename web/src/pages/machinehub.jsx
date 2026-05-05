import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Zap, Droplets, FlaskConical, Trash2, RefreshCw, AlertTriangle, Waves, Wind, CheckCircle } from 'lucide-react';
import apiService from '../services/APIservices';
import MachineModal from '../components/modals/machinemodal';

// ─── DEFAULT 12 MACHINES ───────────────────────────────────────────────────────
const DEFAULT_MACHINES = [
  ...Array.from({ length: 6 }, (_, i) => ({
    _key: `W${i + 1}`,
    machine_number: i + 1,
    machine_type: 'Washer',
    status: null,
    total_cycles: 0,
    avg_detergent: 0,
    avg_electricity: 0,
    avg_water: 0,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    _key: `D${i + 1}`,
    machine_number: i + 1,
    machine_type: 'Dryer',
    status: null,
    total_cycles: 0,
    avg_detergent: 0,
    avg_electricity: 0,
    avg_water: 0,
  })),
];

const MachineHub = () => {
  const [dbMachines, setDbMachines] = useState([]);   
  const [extraMachines, setExtraMachines] = useState([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [costs, setCosts] = useState({ detergent: 0, electricity: 0, water: 0 });

  // ── SYNC: Fetch and Process Data ──────────────────────────────────────────
  const syncMachineData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getMachines();
      
      const list = (data || []).map(m => ({
        ...m,
        avg_detergent:   Number(m.avg_detergent)   || 0,
        avg_electricity: Number(m.avg_electricity)  || 0,
        avg_water:       Number(m.avg_water)        || 0,
        total_cycles:    m.total_cycles             || 0,
      }));

      setDbMachines(list);

      // Identify extra hardware (e.g., W7, D7) not in the default 12 grid
      const extras = list.filter(m => {
        if (m.machine_type === 'Washer' && m.machine_number <= 6) return false;
        if (m.machine_type === 'Dryer'  && m.machine_number <= 6) return false;
        return true;
      });
      setExtraMachines(extras);

      // Aggregated Shop Costs
      const totals = list.reduce((acc, m) => ({
        detergent:   acc.detergent   + (m.avg_detergent * m.total_cycles),
        electricity: acc.electricity + (m.avg_electricity * m.total_cycles),
        water:       acc.water       + (m.avg_water * m.total_cycles),
      }), { detergent: 0, electricity: 0, water: 0 });
      
      setCosts(totals);
    } catch (err) {
      console.error('Hardware Sync Failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncMachineData();
    const interval = setInterval(syncMachineData, 30000);
    return () => clearInterval(interval);
  }, [syncMachineData]);

  // ── ACTIONS ─────────────────────────────────────────────────────────────────
  const handleDeleteMachine = async (id) => {
    if (!id) return;
    if (!window.confirm("Remove this hardware unit? This action is permanent.")) return;
    
    try {
      setLoading(true);
      await apiService.deleteMachine(id);
      showToast("Unit successfully removed");
      await syncMachineData();
    } catch {
      alert("Error: Cannot remove machine while it is assigned to a booking.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMaintenance = async (id) => {
    if (!id) return;
    try {
      await apiService.toggleMaintenance(id);
      showToast("Maintenance status updated");
      await syncMachineData();
    } catch (err) {
      console.error("Maintenance toggle failed:", err);
    }
  };

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const getMachineLabel = (m) => `${m.machine_type === 'Washer' ? 'W' : 'D'}${m.machine_number}`;

  // ── DATA MERGE ──────────────────────────────────────────────────────────────
  const mergedMachines = DEFAULT_MACHINES.map(slot => {
    const live = dbMachines.find(
      m => m.machine_type === slot.machine_type && m.machine_number === slot.machine_number
    );
    return live ? { ...slot, ...live, id: live.id } : slot;
  });

  const allRows = [...mergedMachines, ...extraMachines];

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      
      {/* Success Toast */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle size={18} className="text-emerald-400" />
          <span className="text-sm font-bold">{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-slate-900 font-bold text-lg mb-1">
            {localStorage.getItem('shop_name') || 'Fresh & Clean Laundromat'}
          </h2>
          <p className="text-slate-500 text-sm font-medium mb-4">Hardware Management System</p>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Machine Hub</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time telemetry and utility consumption tracking.</p>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={syncMachineData}
            className={`p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-sky-500 transition-all shadow-sm ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <Plus size={18} strokeWidth={2.5} /> Add Machine
          </button>
        </div>
      </div>

      {/* Cost Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <CostCard icon={<FlaskConical size={24} />} label="Detergent Expense" value={`₱${costs.detergent.toLocaleString(undefined, {minimumFractionDigits: 2})}`} color="purple" />
        <CostCard icon={<Zap size={24} />} label="Electricity Expense" value={`₱${costs.electricity.toLocaleString(undefined, {minimumFractionDigits: 2})}`} color="amber" />
        <CostCard icon={<Droplets size={24} />} label="Water Expense" value={`₱${costs.water.toLocaleString(undefined, {minimumFractionDigits: 2})}`} color="blue" />
      </div>

      {/* Hardware Table */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Hardware ID', 'Type', 'Status', 'Total Cycles', 'Detergent', 'Electricity', 'Water', 'Action'].map(h => (
                  <th key={h} className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {allRows.map((m) => {
                const hasDbData = !!m.id;
                const statusVal = m.status || 'Available';

                return (
                  <tr key={m._key || m.id} className="hover:bg-sky-50/20 transition-colors group">
                    
                    {/* Machine ID */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${m.machine_type === 'Washer' ? 'bg-sky-50 text-sky-500' : 'bg-orange-50 text-orange-500'}`}>
                          {m.machine_type === 'Washer' ? <Waves size={16} /> : <Wind size={16} />}
                        </div>
                        <span className="font-black text-slate-800 text-base">{getMachineLabel(m)}</span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-5">
                      <span className="text-slate-500 font-bold text-xs uppercase tracking-tighter">{m.machine_type}</span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight border ${
                        statusVal === 'Busy' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        statusVal === 'Maintenance' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {statusVal}
                      </span>
                    </td>

                    {/* Cycles */}
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-700">{m.total_cycles}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Runs</span>
                      </div>
                    </td>

                    {/* Telemetry: Detergent, Electricity, Water */}
                    {[m.avg_detergent, m.avg_electricity, m.avg_water].map((val, i) => (
                      <td key={i} className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm ${val > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                            {val > 0 ? `₱${val.toFixed(2)}` : '—'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Per Cycle</span>
                        </div>
                      </td>
                    ))}

                    {/* Actions */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleMaintenance(m.id)}
                          disabled={!hasDbData}
                          className={`p-2 rounded-xl transition-all ${
                            !hasDbData ? 'text-slate-100' : 
                            statusVal === 'Maintenance' ? 'bg-amber-100 text-amber-600' : 
                            'bg-slate-50 text-slate-300 hover:text-amber-500'
                          }`}
                        >
                          <AlertTriangle size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteMachine(m.id)}
                          disabled={!hasDbData}
                          className={`p-2 rounded-xl transition-all ${
                            !hasDbData ? 'text-slate-100' : 'bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50'
                          }`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <MachineModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onRefresh={syncMachineData} />
    </div>
  );
};

const CostCard = ({ icon, label, value, color }) => {
  const themes = {
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-white text-purple-500' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  iconBg: 'bg-white text-amber-600' },
    blue:   { bg: 'bg-sky-50',    text: 'text-sky-700',    iconBg: 'bg-white text-sky-600' },
  };
  const t = themes[color];
  return (
    <div className={`p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5 transition-all hover:scale-[1.02] ${t.bg}`}>
      <div className={`p-4 rounded-2xl shadow-sm ${t.iconBg}`}>{icon}</div>
      <div>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-2xl font-black tracking-tight ${t.text}`}>{value}</p>
      </div>
    </div>
  );
};

export default MachineHub;