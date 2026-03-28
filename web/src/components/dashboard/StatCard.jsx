import React from 'react';

const StatCard = ({ title, value, subtext, isPrimary, icon: Icon }) => {
  const cardStyles = isPrimary 
    ? "bg-sky-400 text-white shadow-sky-100" 
    : "bg-white text-slate-800 border border-slate-100 shadow-sm";

  const titleStyles = isPrimary 
    ? "text-white/80" 
    : "text-slate-400";

  const subtextStyles = isPrimary 
    ? "text-white/60" 
    : "text-slate-400";

  return (
    <div className={`${cardStyles} rounded-[2rem] p-8 shadow-xl relative overflow-hidden text-left transition-transform hover:scale-[1.02] flex-1`}>
      <div className="relative z-10">
        {/* Title Section */}
        <div className="flex items-center gap-2 mb-6">
          {!isPrimary && (
            <div className="p-2 bg-slate-50 rounded-lg text-sky-500">
               <Icon size={16} />
            </div>
          )}
          <p className={`text-[11px] font-bold uppercase tracking-widest ${titleStyles}`}>
            {title}
          </p>
        </div>

        {/* Value Section */}
        <h4 className="text-5xl font-black mb-1 tracking-tight">
          {value}
        </h4>

        {/* Subtext Section */}
        <p className={`text-[11px] font-bold tracking-tight ${subtextStyles}`}>
          {subtext}
        </p>
      </div>

      {/* Background Icon Decoration */}
      <div className={`absolute -right-6 -bottom-6 opacity-10 ${isPrimary ? 'text-white' : 'text-slate-200'}`}>
        <Icon size={140} />
      </div>
    </div>
  );
};

export default StatCard;