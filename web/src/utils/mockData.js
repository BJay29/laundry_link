/**
 * Mock Data for LaundryLink System
 * Ginagamit ito para sa Dashboard Feed at Forecasting Engine Graphs.
 */

// 1. Data para sa LiveFeed ng Dashboard (Recent Activities)
export const dashboardBookings = [
  { 
    name: "Pedro Garcia", 
    machine: "Washer #1", 
    time: "08:07 AM", 
    status: "JUST NOW" 
  },
  { 
    name: "Miguel Rivera", 
    machine: "Dryer #1", 
    time: "08:05 AM", 
    status: "JUST NOW" 
  },
  { 
    name: "Ana Cruz", 
    machine: "Washer #2", 
    time: "08:02 AM", 
    status: "JUST NOW" 
  },
  { 
    name: "Sofia Mendoza", 
    machine: "Washer #1", 
    time: "07:53 AM", 
    status: "JUST NOW" 
  },
  { 
    name: "Carlos Lopez", 
    machine: "Dryer #2", 
    time: "07:47 AM", 
    status: "JUST NOW" 
  },
];

// 2. Data para sa Forecasting Engine (14-Day Projection)
export const forecastData = [
  { name: 'Mar 27', bookings: 9, income: 2100 },
  { name: 'Mar 28', bookings: 9, income: 2200 },
  { name: 'Mar 29', bookings: 9, income: 2150 },
  { name: 'Mar 30', bookings: 8, income: 1800 },
  { name: 'Mar 31', bookings: 7, income: 1750 },
  { name: 'Apr 1', bookings: 10, income: 2350 },
  { name: 'Apr 2', bookings: 9, income: 2180 },
  { name: 'Apr 3', bookings: 8, income: 1950 },
  { name: 'Apr 4', bookings: 8, income: 2000 },
  { name: 'Apr 5', bookings: 9, income: 2200 },
  { name: 'Apr 6', bookings: 11, income: 2550 },
  { name: 'Apr 7', bookings: 10, income: 2400 },
  { name: 'Apr 8', bookings: 11, income: 2650 },
  { name: 'Apr 9', bookings: 9, income: 2100 },
];

