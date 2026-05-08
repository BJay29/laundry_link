/**
 * Utility helpers for interpreting predictive metrics and optimization data.
 * These helpers support the UI by converting raw backend telemetry into 
 * actionable business insights and formatted currency.
 * * CALIBRATION NOTE: 
 * Optimized for CASURECO II (₱8.83/kWh) and MNWD (₱37.90/m3) rates.
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
        
        // Thresholds calibrated for Naga City operational costs
        if (rate >= 65) return 'text-emerald-500';  // High Profit: Margin is healthy after utilities
        if (rate >= 35) return 'text-amber-500';    // Moderate: Typical for high electricity cycles
        return 'text-rose-500';                     // Low Profit: Operating at a potential loss
    },

    /**
     * Calculates the percentage of a specific budget consumed.
     * Standard shop limits: ₱10,000 for Utilities | ₱40,000 for Supplies.
     */
    calculateBudgetUsage: (currentTotal, budgetLimit) => {
        if (!budgetLimit || budgetLimit === 0) return 0;
        const percentage = (currentTotal / budgetLimit) * 100;
        return Math.min(percentage, 100).toFixed(1);
    },

    /**
     * Generates actionable optimization status based on resource consumption.
     * Updated logic accounts for the 5000W Dryer draw and 1200W Washer draw.
     * @param {Object} machine - The machine object from the backend.
     */
    getOptimizationStatus: (machine) => {
        // Use the nested metrics object from our updated backend controller
        const metrics = machine.metrics || {};
        const totalCycles = parseInt(machine.total_cycles) || 0;
        const status = machine.status || 'Available';
        
        // Priority 1: No Data / New Machine Gate
        const hasNoActivity = totalCycles === 0 && status !== 'Busy';
        
        if (hasNoActivity && status !== 'Maintenance') {
            return { 
                status: 'Ready', 
                color: 'slate', 
                tip: 'Waiting for the first cycle to begin telemetry tracking.' 
            };
        }

        // Priority 2: Hardware Availability (Maintenance overrides metrics)
        if (status === 'Maintenance') {
            return { status: 'Offline', color: 'rose', tip: 'Unit under repair. Capacity reduced.' };
        }

        // Destructure metrics for easier comparison
        const total_overhead = parseFloat(metrics.total_overhead) || 0;
        const electricity_cost = parseFloat(metrics.electricity_cost) || 0;
        const detergent_cost = parseFloat(metrics.detergent_cost) || 0;
        
        const isDryer = machine.machine_type?.toLowerCase() === 'dryer';
        const profitability = parseFloat(machine.profitability_rate) || 0;
        
        // Priority 3: Critical Profit Warning (Operating loss check)
        if (profitability < 25 && status === 'Busy') {
            return { 
                status: 'Low Margin', 
                color: 'rose', 
                tip: 'High utility drain detected. Consider checking heating element efficiency.' 
            };
        }
        
        /**
         * Priority 4: Energy Drain Analysis
         * Since we increased Dryer wattage to 5000W, electricity is ~99% of its cost.
         * For Washers (1200W), water and detergent play a bigger role.
         */
        const electricityRatio = total_overhead > 0 ? (electricity_cost / total_overhead) : 0;
        
        // Dryer electricity is naturally high, so we only flag if it's almost the entire cost.
        // Washer electricity is flagged if it exceeds 75% of the overhead.
        const electricityThreshold = isDryer ? 0.995 : 0.75; 

        if (electricityRatio > electricityThreshold && total_overhead > 0) {
            return { 
                status: 'Power Heavy', 
                color: 'amber', 
                tip: isDryer 
                    ? 'Dryer drawing peak current. Ensure lint filters are clean for better airflow.' 
                    : 'Washer heater consuming excess power. Monitor water temperature settings.' 
            };
        }

        // Priority 5: Supply Consumption Check (Washer specific)
        const detergentRatio = total_overhead > 0 ? (detergent_cost / total_overhead) : 0;
        if (!isDryer && detergentRatio > 0.50) {
            return { 
                status: 'High Supplies', 
                color: 'blue', 
                tip: 'Detergent usage is higher than estimated. Verify dispenser calibration.' 
            };
        }
        
        // Default: Healthy State
        return { 
            status: 'Optimized', 
            color: 'emerald', 
            tip: 'Machine operating at peak profit efficiency for Naga City utility rates.' 
        };
    }
};

export default optimizationLogic;