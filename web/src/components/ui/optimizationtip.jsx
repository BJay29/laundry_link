import React from 'react';
import { Lightbulb, Clock, TrendingUp, CheckCircle2 } from 'lucide-react';

const OptimizationTip = ({ title, message, suggestion, onApply }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header with Icon and Title */}
      <div className="p-5 flex items-center gap-4 bg-white border-b border-slate-50">
        <div className="p-2.5 bg-sky-500 rounded-lg shadow-sm shadow-sky-200">
          <Lightbulb className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 leading-tight">
            {title || "Optimization Tip"}
          </h3>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Smart Recommendation
          </p>
        </div>
      </div>

      {/* Insight Body - Content matches the 'Low Booking Hours' look in image_6c8d37.png */}
      <div className="p-6 flex-grow">
        <div className="flex items-start gap-3 mb-6">
          <div className="mt-1 p-1 bg-sky-50 rounded-full">
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            {message || "Analyzing shop patterns to generate insights..."}
          </p>
        </div>

        {/* Suggestion Highlight Box */}
        {suggestion && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-slate-700">
              {suggestion}
            </p>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-5 bg-white mt-auto">
        <button 
          onClick={onApply}
          className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-sky-100 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <CheckCircle2 size={18} />
          Apply Suggestion
        </button>
      </div>
    </div>
  );
};

export default OptimizationTip;