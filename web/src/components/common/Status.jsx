import React from 'react';

const Status = ({ type = 'info', label }) => {
  const styles = {
    info: "bg-sky-50 text-sky-500 border-sky-100",
    success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    danger: "bg-red-50 text-red-600 border-red-100"
  };

  return (
    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${styles[type]}`}>
      {label}
    </span>
  );
};

export default Status;