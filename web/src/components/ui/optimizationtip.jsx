import React, { useState, useEffect } from 'react';
import { 
    Lightbulb, 
    AlertCircle, 
    CheckCircle2, 
    TrendingDown, 
    Clock, 
    ArrowRight 
} from 'lucide-react';

/**
 * OptimizationTip Component
 * Displays real-time Decision Support System (DSS) insights with a typewriter effect.
 * @param {Object} data - The insight object from the backend (InsightResponse).
 * @param {boolean} isApplied - State to track if the recommendation was clicked.
 * @param {Function} onApply - Callback function to handle the button click.
 */
const OptimizationTip = ({ data, isApplied, onApply }) => {
    const [displayedText, setDisplayedText] = useState("");
    
    // Typewriter effect: Triggered when the component mounts or data changes
    useEffect(() => {
        if (!data || !data.hasIssue) return;

        const fullText = data.problemMessage || "";
        let i = 0;
        setDisplayedText(""); // Reset text on new insight

        const interval = setInterval(() => {
            if (i < fullText.length) {
                setDisplayedText((prev) => prev + fullText.charAt(i));
                i++;
            } else {
                clearInterval(interval);
            }
        }, 30); // Typing speed in milliseconds

        return () => clearInterval(interval);
    }, [data]);

    // 1. Loading / Syncing State
    if (!data) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500 rounded-xl">
                        <Lightbulb className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Operational Insight</h3>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Smart Recommendation</p>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Insights Syncing...</p>
                </div>
            </div>
        );
    }

    const { hasIssue, impactDetail, suggestions } = data;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-full transition-all duration-300">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-xl ${hasIssue ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                    <Lightbulb className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">Operational Insight</h3>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                        {hasIssue ? 'Urgent Action Required' : 'System Healthy'}
                    </p>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 space-y-5">
                {hasIssue ? (
                    <>
                        {/* Issue Details with Typewriter Text */}
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                            <div className="flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-amber-900">{displayedText}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <TrendingDown className="w-4 h-4 text-rose-500" />
                                        <p className="text-xs font-semibold text-rose-600">{impactDetail}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Suggestions List */}
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-400 uppercase ml-1">Recommended Steps</p>
                            {suggestions.map((step, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-[10px] font-bold text-blue-600">{index + 1}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">{step}</p>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    /* Healthy State (No Issues) */
                    <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h4 className="font-bold text-slate-800">Operations Optimized</h4>
                        <p className="text-sm text-slate-500 max-w-[200px] mt-2">
                            Your shop is performing at peak efficiency. Revenue trends and service distribution are currently aligned with your weekly targets.
                        </p>
                    </div>
                )}
            </div>

            {/* Action Button */}
            <button
                onClick={onApply}
                disabled={!hasIssue || isApplied}
                className={`mt-6 w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm
                    ${isApplied 
                        ? 'bg-emerald-500 text-white cursor-default' 
                        : hasIssue 
                            ? 'bg-blue-500 text-white hover:bg-blue-600' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
            >
                {isApplied ? (
                    <>
                        <CheckCircle2 className="w-5 h-5" />
                        Optimization Applied
                    </>
                ) : (
                    <>
                        <Clock className="w-5 h-5" />
                        Apply Strategy
                        <ArrowRight className="w-4 h-4" />
                    </>
                )}
            </button>
        </div>
    );
};

export default OptimizationTip;