import React from 'react';
import { Shipment } from '../types';
import { Package, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  shipments: Shipment[];
  selectedId?: string;
  onSelect: (shipment: Shipment) => void;
}

export const ShipmentList: React.FC<Props> = ({ shipments, selectedId, onSelect }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-[40px_1fr_1fr_100px] px-4 mb-2">
        <div className="data-grid-header">ID</div>
        <div className="data-grid-header">Cargo / Route</div>
        <div className="data-grid-header">Status</div>
        <div className="data-grid-header">ETA</div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
        {shipments.map((shipment) => (
          <div
            key={shipment.id}
            onClick={() => onSelect(shipment)}
            className={cn(
              "grid grid-cols-[40px_1fr_1fr_100px] items-center px-4 py-3 rounded-lg cursor-pointer transition-all border border-transparent",
              selectedId === shipment.id 
                ? "bg-accent/10 border-accent/30" 
                : "hover:bg-white/5 border-transparent"
            )}
          >
            <div className="mono-value opacity-60">{shipment.id.split('-')[1]}</div>
            <div>
              <div className="text-sm font-medium truncate">{shipment.cargo}</div>
              <div className="text-[10px] opacity-40 uppercase tracking-tighter">
                {shipment.origin.id} → {shipment.destination.id}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {shipment.status === 'at-risk' && <AlertTriangle className="w-3 h-3 text-risk-high" />}
              {shipment.status === 'delayed' && <Clock className="w-3 h-3 text-risk-medium" />}
              {shipment.status === 'on-time' && <CheckCircle2 className="w-3 h-3 text-risk-low" />}
              <span className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                shipment.status === 'at-risk' ? "text-risk-high" : 
                shipment.status === 'delayed' ? "text-risk-medium" : "text-risk-low"
              )}>
                {shipment.status.replace('-', ' ')}
              </span>
            </div>
            <div className="mono-value text-right opacity-80">{shipment.eta}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
