/**
 * Utility helpers for interpreting predictive metrics and optimization data.
 * The heavy math for budget limits (₱10k utility and ₱40k supply) is processed 
 * by the Backend PredictionService to maintain a single source of truth.
 */

export const optimizationLogic = {
    /**
     * Formats numeric overhead values into a readable Philippine Peso (PHP) string.
     * Consistently used across Machine Hub cards and Dashboard StatCards.
     * @param {number} value - The cost value retrieved from machine.metrics.
     */
    formatCurrency: (value) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(value || 0);
    },

    /**
     * Assigns a semantic color based on the individual machine's total overhead.
     * High overhead triggers a warning (Rose), while efficient units stay Green.
     */
    getEfficiencyColor: (cost) => {
        if (cost === 0) return 'text-slate-400';
        if (cost > 150) return 'text-rose-500';  // Critical overhead threshold
        if (cost > 75) return 'text-amber-500';  // Warning: Approaching high usage
        return 'text-emerald-500';               // Optimal operational cost
    },

    /**
     * Calculates the percentage of the ₱10,000 Utility or ₱40,000 Supply budget consumed.
     * Data should be sourced from the Dashboard Summary analytics endpoint.
     */
    calculateBudgetUsage: (currentTotal, budgetLimit) => {
        if (!budgetLimit || budgetLimit === 0) return 0;
        const percentage = (currentTotal / budgetLimit) * 100;
        return Math.min(percentage, 100).toFixed(1);
    },

    /**
     * Generates an actionable optimization status based on the cost hierarchy.
     * This logic detects if Electricity, Water, or Detergent is the primary cost driver.
     */
    getOptimizationStatus: (machine) => {
        if (!machine.metrics) return { status: 'No Data', color: 'slate', tip: 'Start a cycle to see metrics.' };
        
        const { total_overhead, electricity_cost, water_cost, detergent_cost } = machine.metrics;
        
        // Priority 1: Hardware Maintenance
        if (machine.status === 'Maintenance') {
            return { status: 'Offline', color: 'rose', tip: 'Scheduled for repair.' };
        }
        
        // Priority 2: Electricity Check (Primary Cost Driver)
        if (electricity_cost > (total_overhead * 0.6)) {
            return { 
                status: 'Power Heavy', 
                color: 'amber', 
                tip: 'Check heater settings to reduce kWh.' 
            };
        }

        // Priority 3: Supply Waste Check
        if (detergent_cost > 50) {
            return { 
                status: 'High Supplies', 
                color: 'blue', 
                tip: 'Calibrate detergent pump for better dosage.' 
            };
        }
        
        // Priority 4: High Overall Usage
        if (total_overhead > 100) {
            return { 
                status: 'High Usage', 
                color: 'amber', 
                tip: 'Monitor cycle frequency for this unit.' 
            };
        }
        
        return { status: 'Optimized', color: 'emerald', tip: 'Operating at peak efficiency.' };
    }
};

export default optimizationLogic;