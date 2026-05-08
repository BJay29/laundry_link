import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Zap, Droplets, FlaskConical, Trash2, RefreshCw, AlertTriangle, Waves, Wind, CheckCircle, Repeat } from 'lucide-react';
import apiService from '../services/APIservices';
import optimizationLogic from '../utils/optimizationlogic';
import MachineModal from '../components/modals/machinemodal';

/**
 * DEFAULT_MACHINES
 * Static skeleton for the UI grid (W1-W6, D1-D6).
 * Maintains visual consistency during data fetching.
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
   * Synchronizes hardware states and resource consumption from the backend.
   * Aggregates shop-wide expenses for the top stat cards.
   */
  const syncMachineData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getMachines();
      
      const list = (data || []).map(m => {
        const cycles = parseInt(m.total_cycles) || 0;
        
        // Map backend metrics or provide zeroed defaults
        const liveMetrics = m.metrics || { 
          detergent_cost: 0, 
          electricity_cost: 0, 
          water_cost: 0, 
          total_overhead: 0 
        };

        return {
          ...m,
          total_cycles: cycles,
          metrics: (cycles === 0 && m.status !== 'Busy') ? {
            detergent_cost: 0, 
            electricity_cost: 0, 
            water_cost: 0, 
            total_overhead: 0 
          } : liveMetrics
        };
      });

      setDbMachines(list);

      // Handle units beyond the standard 6x6 layout
      const extras = list.filter(m => {
        const isDefaultWasher = m.machine_type === 'Washer' && m.machine_number <= 6;
        const isDefaultDryer  = m.machine_type === 'Dryer'  && m.machine_number <= 6;
        return !isDefaultWasher && !isDefaultDryer;
      });
      setExtraMachines(extras);

      // Global expense summation for top cards
      const totals = list.reduce((acc, m) => ({
        detergent:   acc.detergent   + (parseFloat(m.metrics?.detergent_cost) || 0),
        electricity: acc.electricity + (parseFloat(m.metrics?.electricity_cost) || 0),
        water:       acc.water       + (parseFloat(m.metrics?.water_cost) || 0),
      }), { detergent: 0, electricity: 0, water: 0 });
      
      setCosts(totals);
    } catch (err) {
      console.error('Infrastructure Sync Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncMachineData();
    const interval = setInterval(syncMachineData, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [syncMachineData]);

  /**
   * HARDWARE DECOMMISSIONING
   * Permanently removes a machine. 
   * Updates state immediately after a successful backend 'DELETE' call.
   */
  const handleDeleteMachine = async (id, status) => {
    if (!id) return;

    // Preventive check: Never allow deletion of active machines
    if (status === 'Busy') {
      alert("CRITICAL: Cannot decommission a unit while it is 'Busy'. Please wait for the cycle to complete.");
      return;
    }

    const confirmMsg = "WARNING: Unregistering this unit will stop its real-time telemetry. Historical bookings will remain intact but will show 'Unassigned' hardware. Continue?";
    if (!window.confirm(confirmMsg)) return;
    
    try {
      setLoading(true);
      await apiService.deleteMachine(id);
      showToast("Hardware removed from inventory");
      
      // Immediate state update: Remove from local state before next sync
      setDbMachines(prev => prev.filter(m => m.id !== id));
      setExtraMachines(prev => prev.filter(m => m.id !== id));
      
      // Trigger full sync to recalculate global costs
      await syncMachineData();
    } catch (error) {
      console.error("Deletion failed:", error.message);
      alert(error.message || "Failed to decommission unit. Check system logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMaintenance = async (id) => {
    if (!id) return;
    try {
      await apiService.toggleMaintenance(id);
      showToast("Operational status updated");
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

  // UI MERGE: Map database machines onto the static grid slots
  const mergedMachines = DEFAULT_MACHINES.map(slot => {
    const live = dbMachines.find(
      m => m.machine_type === slot.machine_type && m.machine_number === slot.machine_number
    );
    return live ? { ...slot, ...live, id: live.id } : slot;
  });

  const allRows = [...mergedMachines, ...extraMachines];

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      
      {/* Dynamic Toast Notification */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle size={18} className="text-emerald-400" />
          <span className="text-sm font-bold">{successMsg}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-slate-900 font-bold text-lg mb-1 italic">
            {localStorage.getItem('shop_name') || 'Naga College Foundation Node'}
          </h2>
          <p className="text-slate-500 text-xs font-black mb-4 tracking-widest uppercase opacity-60">System Infrastructure</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic">Machine Hub</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time telemetry and resource overhead management.</p>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={syncMachineData}
            disabled={loading}
            className={`p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-sky-500 transition-all shadow-sm ${loading ? 'opacity-50' : ''}`}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-sky-100 transition-all hover:scale-[1.02] active:scale-95 uppercase text-xs tracking-wider"
          >
            <Plus size={18} strokeWidth={3} /> Register Unit
          </button>
        </div>
      </div>

      {/* Global Cost Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <CostCard 
          icon={<FlaskConical size={24} />} 
          label="Aggregated Detergent" 
          value={optimizationLogic.formatCurrency(costs.detergent)} 
          color="purple" 
        />
        <CostCard 
          icon={<Zap size={24} />} 
          label="Energy Consumption" 
          value={optimizationLogic.formatCurrency(costs.electricity)} 
          color="amber" 
        />
        <CostCard 
          icon={<Droplets size={24} />} 
          label="Water Utility Cost" 
          value={optimizationLogic.formatCurrency(costs.water)} 
          color="blue" 
        />
      </div>

      {/* Main Hardware Grid */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Unit ID', 'Type', 'Status', 'Usage Logs', 'Elec (PHP)', 'Water (PHP)', 'Det (PHP)', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {allRows.map((m) => {
                const isRegistered = !!m.id;

                return (
                  <tr key={m._key || m.id} className={`hover:bg-slate-50/50 transition-colors group ${!isRegistered ? 'opacity-30' : ''}`}>
                    
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${m.machine_type === 'Washer' ? 'bg-sky-50 text-sky-500' : 'bg-orange-50 text-orange-500'}`}>
                          {m.machine_type === 'Washer' ? <Waves size={16} /> : <Wind size={16} />}
                        </div>
                        <span className="font-black text-slate-800 text-base tracking-tighter">{getMachineLabel(m)}</span>
                      </div>
                    </td>

                    <td className="px-6 py-5 font-bold text-slate-400 text-[11px] uppercase tracking-wider">{m.machine_type}</td>

                    <td className="px-6 py-5">
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight border ${
                        m.status === 'Busy' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        m.status === 'Maintenance' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        m.status === 'Available' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        'bg-slate-100 text-slate-400 border-slate-200'
                      }`}>
                        {m.status || 'Unregistered'}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Repeat size={14} className="text-slate-300" />
                        <span className="text-[11px] font-black uppercase text-slate-600 tracking-tight">
                          {m.total_cycles} Cycles
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                        <MetricValue value={m.metrics?.electricity_cost} cycles={m.total_cycles} />
                    </td>
                    <td className="px-6 py-5">
                        <MetricValue value={m.metrics?.water_cost} cycles={m.total_cycles} />
                    </td>
                    <td className="px-6 py-5">
                        <MetricValue value={m.metrics?.detergent_cost} cycles={m.total_cycles} />
                    </td>

                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleToggleMaintenance(m.id)}
                          disabled={!isRegistered || m.status === 'Busy'}
                          className={`p-2 rounded-xl transition-all ${
                            !isRegistered || m.status === 'Busy' ? 'opacity-10 cursor-not-allowed' : 
                            m.status === 'Maintenance' ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-300 hover:text-amber-500 hover:bg-amber-50'
                          }`}
                        >
                          <AlertTriangle size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteMachine(m.id, m.status)}
                          disabled={!isRegistered || m.status === 'Busy'}
                          className={`p-2 rounded-xl transition-all ${
                            !isRegistered || m.status === 'Busy' ? 'opacity-10 cursor-not-allowed' : 'bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50'
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

      <MachineModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={syncMachineData} 
      />
    </div>
  );
};

const MetricValue = ({ value, cycles }) => {
  const isZero = !value || value <= 0 || cycles === 0;
  return (
    <div className="flex flex-col">
      <span className={`font-black text-xs ${isZero ? 'text-slate-200' : 'text-slate-700'}`}>
        {optimizationLogic.formatCurrency(isZero ? 0 : value)}
      </span>
      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Accumulated</span>
    </div>
  );
};

const CostCard = ({ icon, label, value, color }) => {
  const themes = {
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-white text-purple-500 shadow-sm' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  iconBg: 'bg-white text-amber-600 shadow-sm' },
    blue:   { bg: 'bg-sky-50',    text: 'text-sky-700',    iconBg: 'bg-white text-sky-600 shadow-sm' },
  };
  const theme = themes[color];
  return (
    <div className={`p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md ${theme.bg}`}>
      <div className={`p-4 rounded-2xl ${theme.iconBg}`}>{icon}</div>
      <div>
        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-2xl font-black tracking-tighter ${theme.text}`}>{value}</p>
      </div>
    </div>
  );
};

export default MachineHub;