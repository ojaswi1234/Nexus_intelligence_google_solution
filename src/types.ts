export type RiskLevel = 'low' | 'medium' | 'high';
export type ShipmentStatus = 'on-time' | 'delayed' | 'at-risk';

export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Shipment {
  id: string;
  origin: Location;
  destination: Location;
  currentLocation: { lat: number; lng: number };
  status: ShipmentStatus;
  riskLevel: RiskLevel;
  eta: string;
  cargo: string;
  lastUpdated: string;
}

export interface Disruption {
  id: string;
  type: 'weather' | 'port-congestion' | 'labor-strike' | 'infrastructure';
  severity: RiskLevel;
  location: { lat: number; lng: number; radius: number };
  description: string;
  impactedShipments: string[];
}

export interface AIRecommendation {
  shipmentId: string;
  reason: string;
  suggestedRoute: Location[];
  estimatedTimeSavings: string;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
