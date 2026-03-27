import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = '', Icon }) => {
  const baseStyles = "px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-sky-100";
  
  const variants = {
    primary: "bg-[#0ea5e9] hover:bg-sky-500 text-white shadow-sky-100",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-600 shadow-none",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-red-100",
    outline: "border-2 border-slate-200 text-slate-500 hover:bg-slate-50 shadow-none"
  };

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export default Button;