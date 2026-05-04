import React, { useState, useEffect } from 'react';
import { X, User, Weight, Settings2, CheckCircle2, Hash, Droplets, Truck, Zap, Info, Calculator, Edit3, Tag, Cpu } from 'lucide-react';

const BookingModal = ({ isOpen, onClose, onSubmit }) => {
  // 'smart' for auto-calc logic, 'manual' for full user override
  const [bookingMode, setBookingMode] = useState('smart');
  
  const [formData, setFormData] = useState({
    customerName: '',
    serviceType: 'Full Service',
    itemType: 'Clothes',
    weight: 1,
    calculatedLoads: 1, 
    selectedWasher: null, // Track selected washing machine ID
    selectedDryer: null,  // Track selected dryer ID
    addDetergent: false,
    addDelivery: false,
    isRush: false,
    totalPrice: 0 
  });

  // Machine Data Arrays
  const washers = [1, 2, 3, 4, 5, 6];
  const dryers = [1, 2, 3, 4, 5, 6];

  const RATES = {
    FULL_SERVICE: 210,
    REGULAR_WASH: 65,
    TITAN_WASH: 100,
    COMFORTER_PER_KG: 105
  };

  const CAPACITY = {
    CLOTHES_MAX: 6,
    LINENS_MAX: 4
  };

  // Automated price/load calculation logic
  useEffect(() => {
    if (bookingMode === 'manual') return;

    let base = 0;
    let loads = 1;

    if (formData.serviceType === 'Full Service') {
      const limit = formData.itemType === 'Clothes' ? CAPACITY.CLOTHES_MAX : CAPACITY.LINENS_MAX;
      loads = Math.ceil(formData.weight / limit) || 1;
      base = RATES.FULL_SERVICE * loads;
    } 
    else if (formData.serviceType === 'Self-Service (8kg)') {
      loads = Math.ceil(formData.weight / 8) || 1;
      base = RATES.REGULAR_WASH * loads;
    } 
    else if (formData.serviceType === 'Titan Wash (12kg)') {
      loads = Math.ceil(formData.weight / 12) || 1;
      base = RATES.TITAN_WASH * loads;
    } 
    else if (formData.serviceType === 'Comforter') {
      const chargingWeight = Math.max(formData.weight, 3); 
      base = RATES.COMFORTER_PER_KG * chargingWeight;
      loads = 1; 
    }

    if (formData.addDetergent) base += 40; 
    if (formData.addDelivery) base += 70; 
    if (formData.isRush) base *= 1.4;

    setFormData(prev => ({ 
      ...prev, 
      totalPrice: Math.round(base), 
      calculatedLoads: loads 
    }));
  }, [bookingMode, formData.serviceType, formData.itemType, formData.weight, formData.addDetergent, formData.addDelivery, formData.isRush]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? parseFloat(value) || 0 : value 
    }));
  };

  const selectMachine = (type, id) => {
    const field = type === 'washer' ? 'selectedWasher' : 'selectedDryer';
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] === id ? null : id // Toggle selection
    }));
  };

  const toggleField = (field) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, mode: bookingMode });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-slate-700">
      <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh]">
        
        {/* Header and Mode Switcher */}
        <div className="px-8 pt-8 pb-4 border-b border-slate-50 shrink-0">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800">New Booking</h2>
              <p className="text-slate-400 font-medium text-xs tracking-tight">Configure service and select machines</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-300 transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="bg-slate-100 p-1 rounded-2xl flex items-center shadow-inner">
            <button 
              type="button"
              onClick={() => setBookingMode('smart')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all ${bookingMode === 'smart' ? 'text-sky-600 bg-white shadow-md' : 'text-slate-400 hover:text-slate-500'}`}
            >
              <Calculator size={14} /> SMART MODE
            </button>
            <button 
              type="button"
              onClick={() => setBookingMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all ${bookingMode === 'manual' ? 'text-orange-600 bg-white shadow-md' : 'text-slate-400 hover:text-slate-500'}`}
            >
              <Edit3 size={14} /> MANUAL INPUT
            </button>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
          
          {/* Customer Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2 tracking-[0.15em]">
              <User size={12} className={bookingMode === 'manual' ? 'text-orange-500' : 'text-sky-500'} /> Customer Name
            </label>
            <input 
              name="customerName" required value={formData.customerName} onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:ring-4 ring-sky-50 outline-none transition-all" 
              placeholder="Full Name" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Service & Category Logic */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2 tracking-[0.15em]">
                <Settings2 size={12} className={bookingMode === 'manual' ? 'text-orange-500' : 'text-sky-500'} /> Service
              </label>
              {bookingMode === 'manual' ? (
                <input name="serviceType" value={formData.serviceType} onChange={handleChange} className="w-full bg-orange-50/50 border border-orange-200 rounded-2xl px-5 py-4 font-bold text-orange-700 outline-none" placeholder="Service" />
              ) : (
                <select name="serviceType" value={formData.serviceType} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none">
                  <option value="Full Service">Full Service</option>
                  <option value="Self-Service (8kg)">Regular Wash</option>
                  <option value="Titan Wash (12kg)">Titan Wash</option>
                  <option value="Comforter">Comforter</option>
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2 tracking-[0.15em]">
                <Tag size={12} className={bookingMode === 'manual' ? 'text-orange-500' : 'text-sky-500'} /> Category
              </label>
              {bookingMode === 'manual' ? (
                <input name="itemType" value={formData.itemType} onChange={handleChange} className="w-full bg-orange-50/50 border border-orange-200 rounded-2xl px-5 py-4 font-bold text-orange-700 outline-none" placeholder="Category" />
              ) : (
                <select name="itemType" value={formData.itemType} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none">
                  <option value="Clothes">Regular Clothes</option>
                  <option value="Linens">Linens/Bedding</option>
                </select>
              )}
            </div>
          </div>

          {/* Machine Selection Grid */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2 tracking-[0.15em]">
              <Cpu size={12} className="text-sky-500" /> Machine Assignment
            </label>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Washers 1-6 */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 block ml-1 italic">Washing Machines</span>
                <div className="grid grid-cols-3 gap-2">
                  {washers.map(id => (
                    <button
                      key={`w-${id}`} type="button" onClick={() => selectMachine('washer', id)}
                      className={`py-2 rounded-xl text-xs font-black border-2 transition-all ${formData.selectedWasher === id ? 'bg-sky-500 border-sky-500 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-sky-200'}`}
                    >
                      W{id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dryers 1-6 */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 block ml-1 italic">Dryer Machines</span>
                <div className="grid grid-cols-3 gap-2">
                  {dryers.map(id => (
                    <button
                      key={`d-${id}`} type="button" onClick={() => selectMachine('dryer', id)}
                      className={`py-2 rounded-xl text-xs font-black border-2 transition-all ${formData.selectedDryer === id ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-orange-200'}`}
                    >
                      D{id}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Weight & Loads */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2 tracking-[0.15em]">
                <Weight size={12} /> Weight
              </label>
              <div className="relative">
                <input name="weight" type="number" step="0.1" value={formData.weight} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-black text-slate-700 outline-none" />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-slate-300">kg</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2 tracking-[0.15em]">
                <Hash size={12} /> Loads
              </label>
              <input 
                name="calculatedLoads" type="number" value={formData.calculatedLoads} onChange={handleChange}
                readOnly={bookingMode === 'smart'}
                className={`w-full border rounded-2xl px-5 py-4 font-black transition-all outline-none ${bookingMode === 'manual' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-sky-50 border-sky-100 text-sky-600 cursor-not-allowed'}`}
              />
            </div>
          </div>

          {/* Pricing Block */}
          <div className={`rounded-[32px] p-6 flex justify-between items-center shadow-xl transition-all duration-500 shrink-0 ${bookingMode === 'manual' ? 'bg-orange-600' : 'bg-slate-900'}`}>
            <div className="flex flex-col">
              <span className="font-bold text-white/40 text-[9px] uppercase tracking-[0.25em]">Total Amount</span>
              <span className="text-[10px] text-white/80 font-black italic mt-1 uppercase">{bookingMode === 'manual' ? 'Manual Override' : 'Calculated Price'}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 p-2 px-4 rounded-2xl border border-white/10">
              <span className="text-xl font-black text-white/50">₱</span>
              {bookingMode === 'manual' ? (
                <input name="totalPrice" type="number" value={formData.totalPrice} onChange={handleChange} className="bg-transparent text-3xl font-black text-white w-24 outline-none border-b-2 border-white/20" />
              ) : (
                <span className="text-4xl font-black text-white">{formData.totalPrice}</span>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            className={`w-full text-white py-5 rounded-[24px] font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${bookingMode === 'manual' ? 'bg-orange-500 shadow-orange-500/30' : 'bg-sky-500 shadow-sky-500/30'}`}
          >
            <CheckCircle2 size={24} /> Confirm Transaction
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;