/**
 * UTILITY HELPERS: Predictive Metrics & Optimization Interpretation
 * This module converts raw backend telemetry into actionable business insights.
 * 
 * CALIBRATION PARAMETERS:
 * - Electricity (CASURECO II): ₱8.83/kWh
 * - Water (MNWD): ₱37.90/m3
 * - Hardware Draw: Dryer (5000W), Washer (1200W)
 */

export const optimizationLogic = {
    /**
     * Formats numeric overhead or revenue into a Philippine Peso (PHP) string.
     * Implementation: Uses 'en-PH' locale for standardized currency positioning.
     * @param {number} value - The raw numeric value to format.
     */
    formatCurrency: (value) => {
        // Fallback to 0 if value is null, undefined, or NaN to prevent UI breakage
        const safeValue = Number(value) || 0;
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(safeValue);
    },

    /**
     * Assigns a semantic Tailwind CSS color based on machine profitability.
     * Derived from the 'profitability_rate' field in the database.
     * @param {number} rate - Percentage profit margin (0-100).
     */
    getEfficiencyColor: (rate) => {
        const numericRate = parseFloat(rate);
        
        // Neutral state for inactive or uninitialized telemetry
        if (isNaN(numericRate) || numericRate === 0) return 'text-slate-400';
        
        // Thresholds calibrated for local Naga City operational overhead
        if (numericRate >= 65) return 'text-emerald-500';  // High Profit: Healthy margin after utility deduction
        if (numericRate >= 35) return 'text-amber-500';    // Moderate: Typical for high-load electricity cycles
        return 'text-rose-500';                            // Critical: Potential operating loss
    },

    /**
     * Calculates the percentage of a specific budget consumed.
     * Standard Shop Limits: Utilities (₱10,000) | Supplies (₱40,000).
     * @param {number} currentTotal - Current accumulated cost.
     * @param {number} budgetLimit - Total allocated budget for the period.
     */
    calculateBudgetUsage: (currentTotal, budgetLimit) => {
        if (!budgetLimit || budgetLimit === 0) return 0;
        const percentage = (currentTotal / budgetLimit) * 100;
        // Cap the return value at 100% for progress bar compatibility
        return Math.min(percentage, 100).toFixed(1);
    },

    /**
     * Analyzes machine telemetry to generate actionable optimization tips.
     * Accounts for hardware specific draws (Dryer peak at 5000W vs Washer 1200W).
     * @param {Object} machine - The machine data object containing metrics and status.
     */
    getOptimizationStatus: (machine) => {
        if (!machine) return { status: 'Unknown', color: 'slate', tip: 'No data available.' };

        const metrics = machine.metrics || {};
        const totalCycles = parseInt(machine.total_cycles) || 0;
        const status = machine.status || 'Available';
        const machineType = machine.machine_type?.toLowerCase() || 'washer';
        const isDryer = machineType === 'dryer';
        
        // Phase 1: Inactivity & Hardware Readiness
        const hasNoActivity = totalCycles === 0 && status !== 'Busy';
        
        if (status === 'Maintenance') {
            return { 
                status: 'Offline', 
                color: 'rose', 
                tip: 'Unit under repair. Shop capacity is currently reduced.' 
            };
        }

        if (hasNoActivity) {
            return { 
                status: 'Ready', 
                color: 'slate', 
                tip: 'Waiting for the first cycle to initialize telemetry tracking.' 
            };
        }

        // Phase 2: Financial Threshold Analysis
        const profitability = parseFloat(machine.profitability_rate) || 0;
        if (profitability < 25 && status === 'Busy') {
            return { 
                status: 'Low Margin', 
                color: 'rose', 
                tip: 'High utility drain detected. Check heating element efficiency.' 
            };
        }

        // Phase 3: Energy Consumption Ratios
        const totalOverhead = parseFloat(metrics.total_overhead) || 0;
        const electricityCost = parseFloat(metrics.electricity_cost) || 0;
        const detergentCost = parseFloat(metrics.detergent_cost) || 0;
        
        const electricityRatio = totalOverhead > 0 ? (electricityCost / totalOverhead) : 0;

        // Dryer Calibration: Flag if electricity exceeds 99.5% of overhead
        // Washer Calibration: Flag if electricity exceeds 75% (indicating heater overuse)
        const electricityThreshold = isDryer ? 0.995 : 0.75; 

        if (totalOverhead > 0 && electricityRatio > electricityThreshold) {
            return { 
                status: 'Power Heavy', 
                color: 'amber', 
                tip: isDryer 
                    ? 'Dryer drawing peak current. Clean lint filters to improve airflow.' 
                    : 'Washer heater consuming excess power. Verify water temperature settings.' 
            };
        }

        // Phase 4: Supply Calibration (Washer Only)
        const detergentRatio = totalOverhead > 0 ? (detergentCost / totalOverhead) : 0;
        if (!isDryer && detergentRatio > 0.50) {
            return { 
                status: 'High Supplies', 
                color: 'blue', 
                tip: 'Detergent usage exceeds estimates. Verify dispenser calibration.' 
            };
        }

        // Phase 5: Optimal Operating State
        return { 
            status: 'Optimized', 
            color: 'emerald', 
            tip: 'Machine operating at peak efficiency for Naga City utility rates.' 
        };
    }
};

export default optimizationLogic;