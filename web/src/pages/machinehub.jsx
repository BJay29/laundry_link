import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Zap, Droplets, FlaskConical, Trash2, RefreshCw, AlertTriangle, Waves, Wind, CheckCircle, Repeat } from 'lucide-react';
import apiService from '../services/APIservices';
import optimizationLogic from '../utils/optimizationlogic';
import MachineModal from '../components/modals/machinemodal';

/**
 * DEFAULT_HARDWARE_GRID
 * Provides a UI skeleton (W1-W6, D1-D6) to ensure the layout remains 
 * consistent while data is being fetched from the database.
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
   * TELEMETRY SYNC: Synchronizes machine status and lifetime metrics from the API.
   * Maps backend data to the local UI state and aggregates shop-wide expenses.
   */
  const syncMachineData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getMachines();
      
      const list = (data || []).map(m => ({
        ...m,
        total_cycles: parseInt(m.total_cycles) || 0,
        metrics: m.metrics || { detergent_cost: 0, electricity_cost: 0, water_cost: 0, total_overhead: 0 }
      }));

      setDbMachines(list);

      // Separate additional hardware units that fall outside the standard 1-6 grid
      const extras = list.filter(m => {
        const isDefaultWasher = m.machine_type === 'Washer' && m.machine_number <= 6;
        const isDefaultDryer  = m.machine_type === 'Dryer'  && m.machine_number <= 6;
        return !isDefaultWasher && !isDefaultDryer;
      });
      setExtraMachines(extras);

      // Calculate total business expenditure across all registered nodes
      const totals = list.reduce((acc, m) => ({
        detergent:   acc.detergent   + (m.metrics.detergent_cost || 0),
        electricity: acc.electricity + (m.metrics.electricity_cost || 0),
        water:       acc.water       + (m.metrics.water_cost || 0),
      }), { detergent: 0, electricity: 0, water: 0 });
      
      setCosts(totals);
    } catch (err) {
      console.error('Data Sync Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lifecycle: Initialize data fetch and set polling interval for real-time updates
  useEffect(() => {
    syncMachineData();
    const interval = setInterval(syncMachineData, 30000);
    return () => clearInterval(interval);
  }, [syncMachineData]);

  /**
   * HARDWARE MANAGEMENT ACTIONS
   */
  const handleDeleteMachine = async (id) => {
    if (!id) return;
    if (!window.confirm("PERMANENT ACTION: Unregister this unit? All historical metrics and cycle logs will be deleted.")) return;
    
    try {
      setLoading(true);
      await apiService.deleteMachine(id);
      showToast("Unit successfully removed");
      await syncMachineData();
    } catch (error) {
      alert("Error: Active bookings are currently assigned to this unit.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMaintenance = async (id) => {
    if (!id) return;
    try {
      await apiService.toggleMaintenance(id);
      showToast("Machine status updated");
      await syncMachineData();
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const getMachineLabel = (m) => `${m.machine_type === 'Washer' ? 'W' : 'D'}${m.machine_number}`;

  /**
   * MERGE LOGIC: Integrates live DB records into the static UI grid.
   */
  const mergedMachines = DEFAULT_MACHINES.map(slot => {
    const live = dbMachines.find(
      m => m.machine_type === slot.machine_type && m.machine_number === slot.machine_number
    );
    return live ? { ...slot, ...live, id: live.id } : slot;
  });

  const allRows = [...mergedMachines, ...extraMachines];

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      
      {/* Action Notification */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle size={18} className="text-emerald-400" />
          <span className="text-sm font-bold">{successMsg}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-slate-900 font-bold text-lg mb-1">
            {localStorage.getItem('shop_name') || 'Laundromat Command Center'}
          </h2>
          <p className="text-slate-500 text-sm font-medium mb-4 tracking-tight uppercase">Infrastructure Management</p>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Machine Hub</h1>
          <p className="text-slate-400 text-sm mt-1">Monitoring lifecycle cycles and resource consumption.</p>
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
            className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-sky-100 transition-all"
          >
            <Plus size={18} strokeWidth={3} /> REGISTER UNIT
          </button>
        </div>
      </div>

      {/* Global Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <CostCard icon={<FlaskConical size={24} />} label="Total Detergent Spend" value={optimizationLogic.formatCurrency(costs.detergent)} color="purple" />
        <CostCard icon={<Zap size={24} />} label="Total Energy Expense" value={optimizationLogic.formatCurrency(costs.electricity)} color="amber" />
        <CostCard icon={<Droplets size={24} />} label="Total Water Utility" value={optimizationLogic.formatCurrency(costs.water)} color="blue" />
      </div>

      {/* Machine Data Grid */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Machine ID', 'Category', 'Operational Status', 'Usage Logs', 'Electricity', 'Water', 'Detergent', 'Actions'].map(h => (
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
                    
                    {/* Machine Identity */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${m.machine_type === 'Washer' ? 'bg-sky-50 text-sky-500' : 'bg-orange-50 text-orange-500'}`}>
                          {m.machine_type === 'Washer' ? <Waves size={16} /> : <Wind size={16} />}
                        </div>
                        <span className="font-black text-slate-800 text-base tracking-tighter">{getMachineLabel(m)}</span>
                      </div>
                    </td>

                    <td className="px-6 py-5 font-bold text-slate-500 text-xs">{m.machine_type?.toUpperCase()}</td>

                    {/* Status Indicator */}
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight border ${
                        m.status === 'Busy' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        m.status === 'Maintenance' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        m.status === 'Available' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        'bg-slate-100 text-slate-400 border-slate-200'
                      }`}>
                        {m.status || 'Offline'}
                      </span>
                    </td>

                    {/* Cycle Usage Counter */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Repeat size={14} className="text-slate-400" />
                        <span className="text-[11px] font-black uppercase text-slate-700 tracking-tight">
                          {m.total_cycles} Total Cycles
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">Lifetime hardware usage</p>
                    </td>

                    {/* Financial Metrics */}
                    <td className="px-6 py-5">
                       <MetricValue value={m.metrics?.electricity_cost} color="amber" />
                    </td>

                    <td className="px-6 py-5">
                       <MetricValue value={m.metrics?.water_cost} color="sky" />
                    </td>

                    <td className="px-6 py-5">
                       <MetricValue value={m.metrics?.detergent_cost} color="purple" />
                    </td>

                    {/* Unit Controls */}
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleToggleMaintenance(m.id)}
                          disabled={!isRegistered}
                          className={`p-2 rounded-xl transition-all ${
                            !isRegistered ? 'text-slate-100' : 
                            m.status === 'Maintenance' ? 'bg-amber-100 text-amber-600' : 
                            'bg-slate-50 text-slate-300 hover:text-amber-500'
                          }`}
                        >
                          <AlertTriangle size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteMachine(m.id)}
                          disabled={!isRegistered}
                          className={`p-2 rounded-xl transition-all ${
                            !isRegistered ? 'text-slate-100' : 'bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50'
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

/**
 * MetricValue Helper Component
 */
const MetricValue = ({ value, color }) => (
  <div className="flex flex-col">
    <span className={`font-black text-sm ${value > 0 ? 'text-slate-700' : 'text-slate-200'}`}>
      {value > 0 ? optimizationLogic.formatCurrency(value) : '₱0.00'}
    </span>
    <span className={`text-[9px] text-${color}-500/70 font-black uppercase tracking-tighter`}>Accumulated</span>
  </div>
);

/**
 * CostCard Helper Component
 */
const CostCard = ({ icon, label, value, color }) => {
  const themes = {
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-white text-purple-500' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  iconBg: 'bg-white text-amber-600' },
    blue:   { bg: 'bg-sky-50',    text: 'text-sky-700',    iconBg: 'bg-white text-sky-600' },
  };
  const t = themes[color];
  return (
    <div className={`p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md ${t.bg}`}>
      <div className={`p-4 rounded-2xl shadow-sm ${t.iconBg}`}>{icon}</div>
      <div>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-2xl font-black tracking-tighter ${t.text}`}>{value}</p>
      </div>
    </div>
  );
};

export default MachineHub;