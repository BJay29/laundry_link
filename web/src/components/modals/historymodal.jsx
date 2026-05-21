import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import apiService from '../../services/APIservices'; 

/**
 * HISTORY MODAL COMPONENT
 * Displays a 7-day breakdown of revenue and expenses.
 * Uses the Analytics Hub API to fetch historical financial performance.
 */
const HistoryModal = ({ isOpen, onClose }) => {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  /**
   * Fetches the weekly history from the backend using the API Service layer.
   */
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await apiService.getWeeklyHistory();
      setHistoryData(data);
    } catch (error) {
      console.error("Failed to fetch weekly history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-2xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Weekly Financial History</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-slate-400 font-bold animate-pulse">Syncing financial logs...</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {historyData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{item.date}</p>
                  <p className="text-lg font-black text-slate-900">₱{item.income?.toLocaleString() || 0}</p>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expenses</p>
                    <p className="text-sm font-bold text-red-500">-₱{item.expenses?.toLocaleString() || 0}</p>
                  </div>
                  <div className={`p-3 rounded-2xl ${item.income > item.expenses ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {item.income > item.expenses ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryModal;