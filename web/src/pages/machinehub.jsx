import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Zap, Droplets, FlaskConical, Trash2, RefreshCw, AlertTriangle, Waves, Wind, CheckCircle, Repeat } from 'lucide-react';
import apiService from '../services/APIservices';
import optimizationLogic from '../utils/optimizationlogic';
import MachineModal from '../components/modals/machinemodal';

/**
 * DEFAULT_MACHINES
 * Static skeleton for the UI grid (W1-W6, D1-D6).
 * Ensures a consistent layout even when the database is empty or loading.
 */
const DEFAULT_MACHINES = [
  ...Array.from({ length: 6 }, (_, i) => ({
    _key: `W${i + 1}`,
    machine_number: i + 1,
    machine_type: 'Washer',
    status: null,
    total_cycles: 0,
    metrics: { detergent_cost: 0, electricity_cost: 0, water_cost: 0, total_overhead: 0 }
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    _key: `D${i + 1}`,
    machine_number: i + 1,
    machine_type: 'Dryer',
    status: null,
    total_cycles: 0,
    metrics: { detergent_cost: 0, electricity_cost: 0, water_cost: 0, total_overhead: 0 }
  })),
];

const MachineHub = () => {
  const [dbMachines, setDbMachines] = useState([]);   
  const [extraMachines, setExtraMachines] = useState([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [costs, setCosts] = useState({ detergent: 0, electricity: 0, water: 0 });

  /**
   * TELEMETRY SYNC
   * Fetches latest machine states and hardware-specific resource metrics from Backend.
   * Aggregates shop-wide expenses for the summary cards.
   */
  const syncMachineData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getMachines();
      
      const list = (data || []).map(m => {
        const cycles = parseInt(m.total_cycles) || 0;
        
        return {
          ...m,
          total_cycles: cycles,
          // If cycles are 0 and machine isn't busy, we force metrics to 0 to prevent ghost costs
          metrics: (cycles === 0 && m.status !== 'Busy') ? {
            detergent_cost: 0, 
            electricity_cost: 0, 
            water_cost: 0, 
            total_overhead: 0 
          } : (m.metrics || { 
            detergent_cost: 0, 
            electricity_cost: 0, 
            water_cost: 0, 
            total_overhead: 0 
          })
        };
      });

      setDbMachines(list);

      // Filter machines that are not part of the standard 1-6 UI skeleton
      const extras = list.filter(m => {
        const isDefaultWasher = m.machine_type === 'Washer' && m.machine_number <= 6;
        const isDefaultDryer  = m.machine_type === 'Dryer'  && m.machine_number <= 6;
        return !isDefaultWasher && !isDefaultDryer;
      });
      setExtraMachines(extras);

      // AGGREGATION LOGIC: Sums historical utility usage across all hardware units
      const totals = list.reduce((acc, m) => ({
        detergent:   acc.detergent   + (parseFloat(m.metrics.detergent_cost) || 0),
        electricity: acc.electricity + (parseFloat(m.metrics.electricity_cost) || 0),
        water:       acc.water       + (parseFloat(m.metrics.water_cost) || 0),
      }), { detergent: 0, electricity: 0, water: 0 });
      
      setCosts(totals);
    } catch (err) {
      console.error('Infrastructure Sync Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync lifecycle: Initial load and 30-second automated heartbeats
  useEffect(() => {
    syncMachineData();
    const interval = setInterval(syncMachineData, 30000);
    return () => clearInterval(interval);
  }, [syncMachineData]);

  /**
   * HARDWARE MANAGEMENT CONTROLS
   */
  const handleDeleteMachine = async (id) => {
    if (!id) return;
    if (!window.confirm("CRITICAL: Unregister this unit? Historical overhead data and cycle logs will be permanently removed.")) return;
    
    try {
      setLoading(true);
      await apiService.deleteMachine(id);
      showToast("Unit successfully decommissioned");
      await syncMachineData();
    } catch (error) {
      alert("Action Denied: Active bookings are currently assigned to this hardware unit.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMaintenance = async (id) => {
    if (!id) return;
    try {
      await apiService.toggleMaintenance(id);
      showToast("Machine status synchronized");
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

  // UI MERGE: Overlays live DB telemetry onto the static grid skeleton
  const mergedMachines = DEFAULT_MACHINES.map(slot => {
    const live = dbMachines.find(
      m => m.machine_type === slot.machine_type && m.machine_number === slot.machine_number
    );
    return live ? { ...slot, ...live, id: live.id } : slot;
  });

  const allRows = [...mergedMachines, ...extraMachines];

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      
      {/* Dynamic Notification Toast */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle size={18} className="text-emerald-400" />
          <span className="text-sm font-bold">{successMsg}</span>
        </div>
      )}

      {/* Header & Infrastructure Actions */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-slate-900 font-bold text-lg mb-1">
            {localStorage.getItem('shop_name') || 'Laundromat Command Center'}
          </h2>
          <p className="text-slate-500 text-sm font-medium mb-4 tracking-tight uppercase">Infrastructure Management</p>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight italic uppercase">Machine Hub</h1>
          <p className="text-slate-400 text-sm mt-1">Monitoring machine lifecycles and historical resource consumption.</p>
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
            className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-sky-100 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus size={18} strokeWidth={3} /> REGISTER UNIT
          </button>
        </div>
      </div>

      {/* GLOBAL RESOURCE METRICS: High-level overview of operational overhead */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <CostCard 
          icon={<FlaskConical size={24} />} 
          label="Total Detergent Spend" 
          value={optimizationLogic.formatCurrency(costs.detergent)} 
          color="purple" 
        />
        <CostCard 
          icon={<Zap size={24} />} 
          label="Total Energy Expense" 
          value={optimizationLogic.formatCurrency(costs.electricity)} 
          color="amber" 
        />
        <CostCard 
          icon={<Droplets size={24} />} 
          label="Total Water Utility" 
          value={optimizationLogic.formatCurrency(costs.water)} 
          color="blue" 
        />
      </div>

      {/* MACHINE TELEMETRY TABLE: Detailed view per hardware unit */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Machine ID', 'Category', 'Status', 'Usage Logs', 'Electricity', 'Water', 'Detergent', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {allRows.map((m) => {
                const isRegistered = !!m.id;

                return (
                  <tr key={m._key || m.id} className="hover:bg-slate-50/50 transition-colors group">
                    
                    {/* Identity Column */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${m.machine_type === 'Washer' ? 'bg-sky-50 text-sky-500' : 'bg-orange-50 text-orange-500'}`}>
                          {m.machine_type === 'Washer' ? <Waves size={16} /> : <Wind size={16} />}
                        </div>
                        <span className="font-black text-slate-800 text-base tracking-tighter">{getMachineLabel(m)}</span>
                      </div>
                    </td>

                    <td className="px-6 py-5 font-bold text-slate-500 text-xs">{m.machine_type?.toUpperCase()}</td>

                    {/* Live Status Column */}
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight border ${
                        m.status === 'Busy' ? 'bg-blue-50 text-blue-600 border-blue-100 shadow-sm shadow-blue-500/10' :
                        m.status === 'Maintenance' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        m.status === 'Available' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        'bg-slate-100 text-slate-400 border-slate-200'
                      }`}>
                        {m.status || 'Offline'}
                      </span>
                    </td>

                    {/* Operational Load Column */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Repeat size={14} className="text-slate-400" />
                        <span className="text-[11px] font-black uppercase text-slate-700 tracking-tight">
                          {m.total_cycles} Total Cycles
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5 tracking-tighter italic">Lifetime hardware logs</p>
                    </td>

                    {/* RESOURCE METRICS: Visual logic updated to handle 0-values correctly */}
                    <td className="px-6 py-5">
                        <MetricValue value={m.metrics?.electricity_cost} cycles={m.total_cycles} color="amber" />
                    </td>

                    <td className="px-6 py-5">
                        <MetricValue value={m.metrics?.water_cost} cycles={m.total_cycles} color="sky" />
                    </td>

                    <td className="px-6 py-5">
                        <MetricValue value={m.metrics?.detergent_cost} cycles={m.total_cycles} color="purple" />
                    </td>

                    {/* Administrative Controls */}
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleToggleMaintenance(m.id)}
                          disabled={!isRegistered}
                          title="Toggle Maintenance State"
                          className={`p-2 rounded-xl transition-all ${
                            !isRegistered ? 'opacity-20 cursor-not-allowed' : 
                            m.status === 'Maintenance' ? 'bg-amber-100 text-amber-600' : 
                            'bg-slate-50 text-slate-300 hover:text-amber-500 hover:bg-amber-50'
                          }`}
                        >
                          <AlertTriangle size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteMachine(m.id)}
                          disabled={!isRegistered}
                          title="Unregister Hardware Unit"
                          className={`p-2 rounded-xl transition-all ${
                            !isRegistered ? 'opacity-20 cursor-not-allowed' : 'bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50'
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

      {/* Registration Modal Overlay */}
      <MachineModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={syncMachineData} 
      />
    </div>
  );
};

/**
 * MetricValue Component
 * Displays formatted currency and 'Accumulated' sub-label.
 * Mutes color if cycles are zero to distinguish from active units.
 */
const MetricValue = ({ value, cycles, color }) => {
  const isZero = !value || value <= 0 || cycles === 0;
  
  return (
    <div className="flex flex-col">
      <span className={`font-black text-sm transition-colors ${isZero ? 'text-slate-200' : 'text-slate-700'}`}>
        {optimizationLogic.formatCurrency(isZero ? 0 : value)}
      </span>
      <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Accumulated</span>
    </div>
  );
};

/**
 * CostCard Component
 */
const CostCard = ({ icon, label, value, color }) => {
  const themes = {
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-white text-purple-500 shadow-sm' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  iconBg: 'bg-white text-amber-600 shadow-sm' },
    blue:   { bg: 'bg-sky-50',    text: 'text-sky-700',    iconBg: 'bg-white text-sky-600 shadow-sm' },
  };
  const theme = themes[color];
  return (
    <div className={`p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md hover:scale-[1.01] ${theme.bg}`}>
      <div className={`p-4 rounded-2xl ${theme.iconBg}`}>{icon}</div>
      <div>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-2xl font-black tracking-tighter ${theme.text}`}>{value}</p>
      </div>
    </div>
  );
};

export default MachineHub;