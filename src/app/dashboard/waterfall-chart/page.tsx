'use client';

import { useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function WaterfallChart() {
    // Dummy Data
    const rawData = [
        { label: 'Revenue', value: 1000 },
        { label: 'Cost of Goods', value: -400 },
        { label: 'Marketing', value: -150 },
        { label: 'Other Income', value: 50 },
    ];

    // Calculate Waterfall Logic
    let runningTotal = 0;
    const waterfallData = rawData.map((item) => {
        const start = runningTotal;
        runningTotal += item.value;
        return {
            label: item.label,
            displayValue: [start, runningTotal], // Floating bar range
            actualValue: item.value,
            color: item.value >= 0 ? '#3b82f6' : '#ef4444'
        };
    });

    // Add Total Column
    waterfallData.push({
        label: 'Total',
        displayValue: [0, runningTotal],
        actualValue: runningTotal,
        color: '#10b981'
    });

    const data = {
        labels: waterfallData.map(d => d.label),
        datasets: [{
            label: 'Amount',
            data: waterfallData.map(d => d.displayValue),
            backgroundColor: waterfallData.map(d => d.color),
            borderRadius: 4,
        }]
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const val = waterfallData[context.dataIndex].actualValue;
                        return `Change: ${val.toLocaleString()}`;
                    }
                }
            }
        },
        scales: {
            y: { beginAtZero: true }
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto bg-white rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Financial Waterfall</h2>
            <div className="h-[400px]">
                <Bar data={data} options={options} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center"><span className="w-3 h-3 bg-blue-500 mr-2 rounded"></span> Positive Impact</div>
                <div className="flex items-center"><span className="w-3 h-3 bg-red-500 mr-2 rounded"></span> Negative Impact</div>
            </div>
        </div>
    );
}