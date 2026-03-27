import React from 'react';

const StatCard = ({ title, value, subtext, color, icon: Icon }) => {
  return (
    <div className={`${color} rounded-3xl p-8 shadow-xl text-white relative overflow-hidden text-left`}>
      <div className="relative z-10">
        <p className="text-[11px] font-bold opacity-80 uppercase mb-6 tracking-widest">{title}</p>
        <h4 className="text-5xl font-black mb-1">{value}</h4>
        <p className="text-[11px] font-bold opacity-80 tracking-tighter">{subtext}</p>
      </div>
      <div className="absolute -right-6 -bottom-6 opacity-10">
        <Icon size={120} />
      </div>
    </div>
  );
};

export default StatCard;