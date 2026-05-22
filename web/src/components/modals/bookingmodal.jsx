import React, { useState, useEffect } from 'react';
import { X, User, Weight, Settings2, CheckCircle2, Hash, Calculator, Edit3, Tag, Cpu, Truck, Droplets, Loader2 } from 'lucide-react';
import apiService from '../../services/APIservices'; 
import { optimizationLogic } from '../../utils/optimizationlogic';

/**
 * BOOKING MODAL COMPONENT
 * Handles new laundry order creation with Smart Calculation and Manual Override modes.
 * Optimized for machine ID synchronization and precise pricing updates from backend.
 */
const BookingModal = ({ isOpen, onClose, onSubmit, actualBookingTime }) => {
  const [bookingMode, setBookingMode] = useState('smart');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [machineData, setMachineData] = useState([]);
  
  // Dynamic Pricing State (Fetched from Backend)
  // Default values are now aligned with the latest DB schema keys from the controller
  const [dbRates, setDbRates] = useState({
    regular_wash_price: 65,
    titan_wash_price: 100,
    comforter_price: 150,
    full_service_price: 210,
    detergent_cost_per_load: 10
  });

  const [formData, setFormData] = useState({
    customerName: '',
    serviceType: 'Full Service',
    itemType: 'Clothes',
    weight: 1,
    calculatedLoads: 1,
    selectedWasher: null,
    selectedDryer: null,
    addDetergent: false,
    addDelivery: false,
    isRush: false,
    totalPrice: 0
  });

  // Business Logic: Weight limits per load based on item category
  const CAPACITY = {
    CLOTHES_MAX: 6,
    LINENS_MAX: 4
  };

  /**
   * SYNC: Fetch machine availability and pricing settings from Backend when modal opens.
   * Ensures the UI is using the most recent rates saved in Optimization Settings.
   */
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          setIsLoadingSettings(true);
          const shopId = apiService.getShopId();
          
          // Parallel fetch for machines and pricing settings to reduce loading time
          const [machines, settings] = await Promise.all([
            apiService.getMachines(),
            apiService.getBookingPricing(shopId)
          ]);

          setMachineData(machines || []);
          
          // Sync with Network Response: Mapping backend keys to state
          if (settings) {
            setDbRates({
              regular_wash_price: Number(settings["Regular Wash"] || 65),
              titan_wash_price: Number(settings["Titan Wash"] || 100),
              comforter_price: Number(settings["Comforter"] || 150),
              full_service_price: Number(settings["Full Service"] || 210),
              detergent_cost_per_load: Number(settings["detergent_fee"] || 10)
            });
          }
        } catch (error) {
          console.error("Error fetching modal data:", error);
        } finally {
          setIsLoadingSettings(false);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  /**
   * LOGIC: Auto-calculate pricing and load count based on service rates from database.
   * Updated to use strict mapping between serviceType and dbRates keys.
   */
  useEffect(() => {
    // Skip auto-calc if in manual mode or while data is still being fetched
    if (bookingMode === 'manual' || isLoadingSettings) return;

    let base = 0;
    let loads = 1;

    // Calculation logic synced with the provided network response keys
    if (formData.serviceType === 'Full Service') {
      const limit = formData.itemType === 'Clothes' ? CAPACITY.CLOTHES_MAX : CAPACITY.LINENS_MAX;
      loads = Math.ceil(Number(formData.weight) / limit) || 1;
      base = dbRates.full_service_price * loads;
    } 
    else if (formData.serviceType === 'Regular Wash') {
      loads = Math.ceil(Number(formData.weight) / 8) || 1;
      base = dbRates.regular_wash_price * loads;
    } 
    else if (formData.serviceType === 'Titan Wash') {
      loads = Math.ceil(Number(formData.weight) / 12) || 1;
      base = dbRates.titan_wash_price * loads; 
    } 
    else if (formData.serviceType === 'Comforter') {
      base = dbRates.comforter_price * Number(formData.weight);
      loads = 1; 
    }

    // Apply Add-on costs (Detergent is multiplied by total loads)
    if (formData.addDetergent) base += (dbRates.detergent_cost_per_load * loads); 
    if (formData.addDelivery) base += 70; // Fixed delivery fee
    if (formData.isRush) base *= 1.4; // 40% Rush premium

    setFormData(prev => ({ 
      ...prev, 
      totalPrice: Math.round(base), 
      calculatedLoads: loads 
    }));
  }, [bookingMode, formData.serviceType, formData.itemType, formData.weight, formData.addDetergent, formData.addDelivery, formData.isRush, dbRates, isLoadingSettings]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value)
    }));
  };

  /**
   * Selection Logic: Assigns a specific Washer or Dryer to the booking.
   */
  const selectMachine = (id, currentStatus) => {
    if (id === undefined || id === null) {
        alert("System Sync: This machine slot is not initialized in the database.");
        return;
    }

    const statusLower = currentStatus?.toLowerCase();
    const isSelectable = statusLower === 'available' || statusLower === 'idle' || statusLower === 'ready' || !currentStatus;
    
    if (!isSelectable) return;

    const machine = machineData.find(m => m.id === id);
    const type = machine?.machine_type;
    const field = type === 'Washer' ? 'selectedWasher' : 'selectedDryer';

    setFormData(prev => ({
      ...prev,
      [field]: prev[field] === id ? null : id 
    }));
  };

  /**
   * Submission: Sends the structured booking payload to the FastAPI backend.
   * Sanitizes all numeric fields to match PostgreSQL decimal/integer types.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.selectedWasher && !formData.selectedDryer) {
        alert("Requirement: Please assign at least one machine to proceed.");
        return;
    }

    setIsSubmitting(true);

    try {
      // Ensure values are sanitized and handled safely
      const payload = {
        customer_name: String(formData.customerName || '').trim(),
        service_type: String(formData.serviceType),
        category: String(formData.itemType),
        weight: parseFloat(formData.weight || 0),
        loads: parseInt(formData.calculatedLoads || 1),
        total_price: parseFloat(formData.totalPrice || 0),
        washer_id: formData.selectedWasher ? parseInt(formData.selectedWasher) : null,
        dryer_id: formData.selectedDryer ? parseInt(formData.selectedDryer) : null,
        is_rush: Boolean(formData.isRush),
        booking_mode: String(bookingMode),
        add_detergent: Boolean(formData.addDetergent),
        add_delivery: Boolean(formData.addDelivery),
        shop_id: parseInt(apiService.getShopId() || 0),
        booking_timestamp: actualBookingTime 
            ? (actualBookingTime instanceof Date ? actualBookingTime.toISOString() : actualBookingTime)
            : new Date().toISOString()
      };

      const response = await apiService.createBooking(payload);
      
      if (onSubmit) onSubmit(response);
      onClose();
      
      // Reset form state
      setFormData({
        customerName: '',
        serviceType: 'Full Service',
        itemType: 'Clothes',
        weight: 1,
        calculatedLoads: 1,
        selectedWasher: null,
        selectedDryer: null,
        addDetergent: false,
        addDelivery: false,
        isRush: false,
        totalPrice: 0
      });

    } catch (error) {
      console.error("Booking Submission Error:", error);
      const backendError = error.response?.data?.detail;
      alert(typeof backendError === 'string' ? backendError : "Transaction failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMachineGrid = (type) => {
    const filteredMachines = machineData
      .filter(m => m.machine_type === type)
      .sort((a, b) => a.machine_number - b.machine_number);

    if (filteredMachines.length === 0) {
      return (
        <div className="col-span-3 py-4 text-center">
          <span className="text-[10px] font-bold text-slate-300 uppercase italic">No {type}s Active</span>
        </div>
      );
    }

    return filteredMachines.map((machine) => {
      const machineId = machine.id;
      const num = machine.machine_number;
      const isSelected = type === 'Washer' ? formData.selectedWasher === machineId : formData.selectedDryer === machineId;
      const status = machine.status?.toLowerCase() || 'available';
      const isBusy = status !== 'available' && status !== 'idle' && status !== 'ready';

      return (
        <button
          key={`${type}-${machineId}`}
          type="button"
          onClick={() => selectMachine(machineId, status)}
          disabled={isBusy}
          className={`h-12 rounded-2xl text-[12px] font-black border-2 transition-all duration-300 relative group
            ${isSelected 
              ? (type === 'Washer' 
                  ? 'bg-sky-500 border-sky-600 text-white shadow-lg shadow-sky-200 scale-105' 
                  : 'bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-200 scale-105') 
              : isBusy 
                ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-60' 
                : 'bg-white border-slate-200 text-slate-600 hover:border-sky-400 hover:bg-sky-50/30'
            }`}
        >
          <div className="flex flex-col items-center justify-center leading-tight">
            <span>{type === 'Washer' ? 'W' : 'D'}{num}</span>
            {isBusy && <span className="text-[7px] opacity-70 uppercase">{status}</span>}
          </div>
          {isSelected && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-inherit animate-pulse" />
          )}
        </button>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20">
        
        {/* HEADER SECTION */}
        <div className="px-10 pt-10 pb-6 border-b border-slate-50 shrink-0">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Create Booking</h2>
              <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-1">LaundryLink Smart Terminal</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-rose-50 hover:text-rose-500 rounded-2xl text-slate-300 transition-all active:scale-90">
              <X size={24} />
            </button>
          </div>

          <div className="bg-slate-100/80 p-1.5 rounded-[24px] flex items-center">
            <button 
              type="button"
              onClick={() => setBookingMode('smart')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-[11px] font-black transition-all ${bookingMode === 'smart' ? 'text-sky-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
            >
              <Calculator size={14} /> SMART CALC
            </button>
            <button 
              type="button"
              onClick={() => setBookingMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-[11px] font-black transition-all ${bookingMode === 'manual' ? 'text-orange-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
            >
              <Edit3 size={14} /> MANUAL OVERRIDE
            </button>
          </div>
        </div>

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit} className="px-10 py-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          {isLoadingSettings && (
            <div className="flex items-center justify-center py-4 gap-2 text-sky-500 font-bold animate-pulse">
               <Loader2 className="animate-spin" size={16} />
               <span>Syncing Live Pricing...</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-3 col-span-2">
              <label className="text-[11px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2 tracking-widest">
                <User size={14} className="text-sky-500" /> Customer Name
              </label>
              <input 
                name="customerName" required value={formData.customerName} onChange={handleChange}
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-[24px] px-6 py-4 font-bold text-slate-800 focus:ring-4 ring-sky-50 focus:border-sky-200 outline-none transition-all placeholder:text-slate-300" 
                placeholder="Juan Dela Cruz" 
              />
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2 tracking-widest">
                <Weight size={14} className="text-sky-500" /> Weight (kg)
              </label>
              <input 
                name="weight" type="number" step="0.1" required value={formData.weight} onChange={handleChange}
                className={`w-full border-2 rounded-[24px] px-6 py-4 font-bold outline-none transition-all ${bookingMode === 'manual' ? 'bg-orange-50/30 border-orange-100 text-orange-600 focus:border-orange-200' : 'bg-slate-50/50 border-slate-100 text-slate-800 focus:border-sky-200'}`} 
              />
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2 tracking-widest">
                <Hash size={14} className="text-sky-500" /> {bookingMode === 'manual' ? 'Manual Loads' : 'Est. Loads'}
              </label>
              {bookingMode === 'manual' ? (
                <input 
                  name="calculatedLoads" type="number" value={formData.calculatedLoads} onChange={handleChange}
                  className="w-full bg-orange-50/30 border-2 border-orange-100 rounded-[24px] px-6 py-4 font-black text-orange-600 focus:border-orange-200 outline-none"
                />
              ) : (
                <div className="w-full bg-slate-100 border-2 border-slate-100 rounded-[24px] px-6 py-4 font-black text-slate-400">
                  {formData.calculatedLoads} {formData.calculatedLoads > 1 ? 'Loads' : 'Load'}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2 tracking-widest">
                <Settings2 size={14} className="text-sky-500" /> Service Type
              </label>
              {bookingMode === 'manual' ? (
                <input 
                   name="serviceType" value={formData.serviceType} onChange={handleChange}
                   placeholder="Enter Service"
                   className="w-full bg-orange-50/30 border-2 border-orange-100 rounded-[24px] px-6 py-4 font-bold text-orange-600 focus:border-orange-200 outline-none"
                />
              ) : (
                <select name="serviceType" value={formData.serviceType} onChange={handleChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] px-6 py-4 font-bold text-slate-800 outline-none cursor-pointer focus:border-sky-200">
                  <option value="Full Service">Full Service</option>
                  <option value="Regular Wash">Regular Wash</option>
                  <option value="Titan Wash">Titan Wash</option>
                  <option value="Comforter">Comforter</option>
                </select>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2 tracking-widest">
                <Tag size={14} className="text-sky-500" /> Category
              </label>
              {bookingMode === 'manual' ? (
                <input 
                  name="itemType" value={formData.itemType} onChange={handleChange}
                  placeholder="Enter Category"
                  className="w-full bg-orange-50/30 border-2 border-orange-100 rounded-[24px] px-6 py-4 font-bold text-orange-600 focus:border-orange-200 outline-none"
                />
              ) : (
                <select name="itemType" value={formData.itemType} onChange={handleChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] px-6 py-4 font-bold text-slate-800 outline-none cursor-pointer focus:border-sky-200">
                  <option value="Clothes">Regular Clothes</option>
                  <option value="Linens">Linens / Bedding</option>
                </select>
              )}
            </div>
          </div>

          {/* ADD-ONS SECTION */}
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => handleChange({ target: { name: 'addDetergent', type: 'checkbox', checked: !formData.addDetergent } })}
              className={`p-4 rounded-[24px] border-2 flex flex-col items-center gap-2 transition-all ${formData.addDetergent ? 'bg-sky-500 border-sky-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
            >
              <Droplets size={20} />
              <span className="text-[10px] font-black uppercase">Detergent</span>
            </button>
            <button
              type="button"
              onClick={() => handleChange({ target: { name: 'addDelivery', type: 'checkbox', checked: !formData.addDelivery } })}
              className={`p-4 rounded-[24px] border-2 flex flex-col items-center gap-2 transition-all ${formData.addDelivery ? 'bg-sky-500 border-sky-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
            >
              <Truck size={20} />
              <span className="text-[10px] font-black uppercase">Delivery</span>
            </button>
            <button
              type="button"
              onClick={() => handleChange({ target: { name: 'isRush', type: 'checkbox', checked: !formData.isRush } })}
              className={`p-4 rounded-[24px] border-2 flex flex-col items-center gap-2 transition-all ${formData.isRush ? 'bg-rose-500 border-rose-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
            >
              <CheckCircle2 size={20} />
              <span className="text-[10px] font-black uppercase">Rush</span>
            </button>
          </div>

          {/* MACHINE GRID ASSIGNMENT */}
          <div className="space-y-6 p-8 bg-slate-50/50 rounded-[40px] border-2 border-slate-100">
            <div className="flex justify-between items-center px-2">
                <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2 tracking-[0.2em]">
                <Cpu size={14} className="text-sky-500" /> Machine Assignment
                </label>
                <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-full uppercase tracking-tighter">Live Status</span>
            </div>
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Washers</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {renderMachineGrid('Washer')}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dryers</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {renderMachineGrid('Dryer')}
                </div>
              </div>
            </div>
          </div>

          {/* PRICING FOOTER SECTION */}
          <div className={`rounded-[32px] p-8 flex justify-between items-center shadow-2xl transition-all duration-500 ${bookingMode === 'manual' ? 'bg-orange-600 shadow-orange-100' : 'bg-slate-900 shadow-slate-200'}`}>
            <div className="flex flex-col">
              <span className="font-bold text-white/40 text-[10px] uppercase tracking-[0.4em]">Total Payable</span>
              <span className="text-[11px] text-white font-black italic mt-1 tracking-wider">
                {bookingMode === 'manual' ? '✦ MANUAL OVERRIDE ACTIVE' : '✓ SYSTEM AUTO-CALC'}
              </span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 p-3 px-6 rounded-[24px] border border-white/20">
              {bookingMode === 'manual' ? (
                <div className="flex items-center gap-2">
                   <span className="text-3xl font-black text-white/30">₱</span>
                   <input 
                    name="totalPrice" 
                    type="number" 
                    value={formData.totalPrice} 
                    onChange={handleChange} 
                    className="bg-transparent text-4xl font-black text-white w-28 outline-none border-b-4 border-white/20 focus:border-white transition-all" 
                   />
                </div>
              ) : (
                <span className="text-4xl font-black text-white tracking-tighter">
                    {optimizationLogic.formatCurrency(formData.totalPrice)}
                </span>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full text-white py-6 rounded-[32px] font-black text-2xl shadow-xl transition-all flex items-center justify-center gap-4 active:scale-95 ${isSubmitting ? 'opacity-70 cursor-wait' : ''} ${bookingMode === 'manual' ? 'bg-orange-500 hover:bg-orange-400 shadow-orange-200' : 'bg-sky-600 hover:bg-sky-500 shadow-sky-200'}`}
          >
            {isSubmitting ? 'Processing...' : <><CheckCircle2 size={28} /> Finalize Booking</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;