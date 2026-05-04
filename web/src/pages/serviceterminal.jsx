import React, { useState, useEffect } from 'react';
import { Plus, Calendar, User, Package, Clock, DollarSign } from 'lucide-react';
import { apiService } from '../services/APIservices';
import BookingModal from '../components/modals/bookingmodal'; 

const ServiceTerminal = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Function para kuhanin ang data mula sa backend
  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await apiService.getBookings();
      setBookings(data || []);
    } catch (err) {
      console.error('Backend connection pending:', err.message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  // Handler para sa pag-create ng bagong booking mula sa modal
  const handleCreateBooking = async (formData) => {
    try {
      // Dito tatawagin ang iyong backend API
      const response = await apiService.createBooking({
        customer_name: formData.customerName,
        service_type: formData.serviceType,
        weight: parseFloat(formData.weight),
        status: 'Pending' // Default status
      });

      if (response) {
        // I-refresh ang listahan pagkatapos mag-save
        loadBookings();
        console.log('Booking successful!');
      }
    } catch (err) {
      console.error('Failed to create booking:', err);
      alert('Error creating booking. Please check backend connection.');
    }
  };

  // Status badge styling
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'in progress':
        return 'bg-blue-50 text-blue-500 border border-blue-100';
      case 'pending':
        return 'bg-yellow-50 text-yellow-600 border border-yellow-100';
      case 'completed':
        return 'bg-green-50 text-green-600 border border-green-100';
      case 'cancelled':
        return 'bg-red-50 text-red-500 border border-red-100';
      default:
        return 'bg-slate-50 text-slate-400 border border-slate-100';
    }
  };

  // Machine label color
  const getMachineStyle = (machine) => {
    if (!machine || machine === 'Pending') return 'text-yellow-500 font-bold';
    return 'text-sky-500 font-bold';
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-slate-900 font-bold text-lg mb-1">
            {localStorage.getItem('shop_name') || 'Fresh & Clean Laundromat'}
          </h2>
          <p className="text-slate-500 text-sm font-medium mb-4">
            Real-time Performance Dashboard
          </p>
          <h1 className="text-4xl font-bold text-slate-900">Service Terminal</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage customer bookings and service orders
          </p>
        </div>

        <div className="flex flex-col items-end gap-4">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Calendar size={18} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Today</span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg flex items-center gap-2"
          >
            <Plus size={20} /> New Booking
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500 mx-auto mb-4"></div>
              <p className="text-slate-400 font-medium text-sm">Loading bookings...</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-8 py-5 text-sm font-bold text-slate-500">Time</th>
                <th className="text-left px-6 py-5 text-sm font-bold text-slate-500">Customer</th>
                <th className="text-left px-6 py-5 text-sm font-bold text-slate-500">Service Type</th>
                <th className="text-left px-6 py-5 text-sm font-bold text-slate-500">Weight</th>
                <th className="text-left px-6 py-5 text-sm font-bold text-slate-500">Machine</th>
                <th className="text-left px-6 py-5 text-sm font-bold text-slate-500">Price</th>
                <th className="text-left px-6 py-5 text-sm font-bold text-slate-500">Status</th>
              </tr>
            </thead>

            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-24">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200">
                        <Package size={24} className="text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-semibold text-sm">No bookings yet</p>
                      <p className="text-slate-300 text-xs">Bookings will appear here once created</p>
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((booking, index) => (
                  <tr
                    key={booking.id || index}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
                        <Clock size={14} className="text-slate-300" />
                        {booking.time || '---'}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                        <User size={14} className="text-slate-300" />
                        {booking.customer_name || booking.customer}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-slate-600 font-medium text-sm">
                        {booking.service_type || booking.serviceType}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                        <Package size={14} className="text-slate-300" />
                        {booking.weight} kg
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={getMachineStyle(booking.machine_id || booking.machine)}>
                        {booking.machine_id || booking.machine || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} className="text-emerald-500" />
                        <span className="text-emerald-600 font-bold text-sm">
                          ₱{(booking.price || booking.total_price || 0).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${getStatusStyle(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 
          Ito ang bagong Modal integration. 
          Pinalitan natin yung dating static modal code.
      */}
      <BookingModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onSubmit={handleCreateBooking}
      />
    </div>
  );
};

export default ServiceTerminal;