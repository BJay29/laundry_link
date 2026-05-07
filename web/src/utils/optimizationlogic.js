/**
 * Utility helpers for interpreting predictive metrics and optimization data.
 * These helpers support the UI by converting raw backend telemetry into 
 * actionable business insights and formatted currency.
 */

export const optimizationLogic = {
    /**
     * Formats numeric overhead values into a readable Philippine Peso (PHP) string.
     * Used across Machine Hub tables, Dashboard StatCards, and Modals.
     * @param {number} value - The raw cost value (e.g., 38.5).
     */
    formatCurrency: (value) => {
        // Ensures that even if value is null/undefined, it renders as ₱0.00
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(value || 0);
    },

    /**
     * Assigns a semantic color based on the individual machine's profitability rate.
     * Directly linked to the 'profitability_rate' field in the Machine model.
     * @param {number} rate - Percentage profit margin (0-100).
     */
    getEfficiencyColor: (rate) => {
        // If there is no activity (rate 0), we use a neutral slate color
        if (rate === undefined || rate === null || rate === 0) return 'text-slate-400';
        
        // Thresholds calibrated for high-margin laundry services
        if (rate >= 70) return 'text-emerald-500';  // High Profit: Machine is highly optimized
        if (rate >= 40) return 'text-amber-500';    // Moderate: High overhead or low service price
        return 'text-rose-500';                     // Low Profit: Immediate optimization required
    },

    /**
     * Calculates the percentage of a specific budget consumed.
     * Standard shop limits: ₱10,000 for Utilities | ₱40,000 for Supplies.
     * @param {number} currentTotal - Accumulated spend from backend metrics.
     * @param {number} budgetLimit - The target cap (10000 or 40000).
     */
    calculateBudgetUsage: (currentTotal, budgetLimit) => {
        if (!budgetLimit || budgetLimit === 0) return 0;
        const percentage = (currentTotal / budgetLimit) * 100;
        return Math.min(percentage, 100).toFixed(1);
    },

    /**
     * Generates actionable optimization status based on resource consumption.
     * Logic is weighted to detect if Power (Dryers) or Detergent (Washers) 
     * is deviating from the standard hardware baseline.
     */
    getOptimizationStatus: (machine) => {
        // Priority 1: No Data / New Machine Gate
        // If there are no metrics OR cycles are 0 and machine is not running, show 'Ready'
        const hasNoActivity = !machine.metrics || (machine.total_cycles === 0 && machine.status !== 'Busy');
        
        if (hasNoActivity && machine.status !== 'Maintenance') {
            return { 
                status: 'Ready', 
                color: 'slate', 
                tip: 'Waiting for the first cycle to begin telemetry tracking.' 
            };
        }

        // Priority 2: Hardware Availability (Maintenance overrides metrics)
        if (machine.status === 'Maintenance') {
            return { status: 'Offline', color: 'rose', tip: 'Unit under repair. Capacity reduced.' };
        }

        const { total_overhead, electricity_cost, detergent_cost } = machine.metrics || {};
        const isDryer = machine.machine_type?.toLowerCase() === 'dryer';
        const profitability = machine.profitability_rate || 0;
        
        // Priority 3: Critical Profit Warning (Only relevant if machine is earning/Busy)
        if (profitability < 30 && machine.status === 'Busy') {
            return { 
                status: 'Low Margin', 
                color: 'rose', 
                tip: 'Operating costs nearly exceed revenue. Review service pricing.' 
            };
        }
        
        // Priority 4: Energy Drain Analysis (Check for Deviations)
        const electricityThreshold = isDryer ? 0.95 : 0.60; 
        if (electricity_cost > (total_overhead * electricityThreshold)) {
            return { 
                status: 'Power Heavy', 
                color: 'amber', 
                tip: isDryer ? 'Clean lint filter to improve airflow and drying speed.' : 'Check heater settings to reduce kWh.' 
            };
        }

        // Priority 5: Supply Consumption Check (Washer specific)
        if (!isDryer && detergent_cost > (total_overhead * 0.4)) {
            return { 
                status: 'High Supplies', 
                color: 'blue', 
                tip: 'Calibrate detergent pump for correct dosage per kg.' 
            };
        }
        
        // Default: If data exists and cycles > 0, and no flags are raised
        return { status: 'Optimized', color: 'emerald', tip: 'Machine operating at peak profit efficiency.' };
    }
};

export default optimizationLogic;