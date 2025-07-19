import React from 'react';
import { Card } from '@/components/ui/card';

interface MetricCardProps {
  metricName: string;
  onClick: () => void;
  isSelected: boolean;
}

export function MetricCard({ metricName, onClick, isSelected }: MetricCardProps) {
  const displayName = metricName.replace(/_/g, ' ');
  
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? 'border-purple-500 shadow-md' : 'border-gray-200'
      }`}
      onClick={onClick}
    >
      <div className="p-4">
        <h3 className="text-lg font-medium text-gray-900">{displayName}</h3>
      </div>
    </Card>
  );
}
