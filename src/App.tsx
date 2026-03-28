import React, { useState, useEffect } from 'react';
import { Shipment, Disruption, AIRecommendation } from './types';
import { SupplyChainMap } from './components/SupplyChainMap';
import { ShipmentList } from './components/ShipmentList';
import { RiskAnalysis } from './components/RiskAnalysis';
import { CommandCenter } from './components/CommandCenter';
import { LiveFeed } from './components/LiveFeed';
import { getRouteOptimization } from './services/geminiService';
import { db, auth } from './firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  Activity, 
  Globe, 
  Box, 
  AlertCircle, 
  Navigation,
  ArrowRight,
  X,
  Loader2,
  Zap,
  MessageSquare,
  Terminal,
  Database,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Error handling helper
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [optimization, setOptimization] = useState<AIRecommendation | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customApiKey, setCustomApiKey] = useState<string | null>(
    sessionStorage.getItem('CUSTOM_GEMINI_API_KEY')
  );
  const [keyInput, setKeyInput] = useState('');

  const isAdmin = user?.email === "ojaswideep2020@gmail.com";

  // API Key cleanup on tab close
  useEffect(() => {
    const handleUnload = () => {
      sessionStorage.removeItem('CUSTOM_GEMINI_API_KEY');
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  const handleSaveKey = () => {
    if (!keyInput.trim()) return;
    sessionStorage.setItem('CUSTOM_GEMINI_API_KEY', keyInput.trim());
    setCustomApiKey(keyInput.trim());
    setKeyInput('');
  };

  const handleClearKey = () => {
    sessionStorage.removeItem('CUSTOM_GEMINI_API_KEY');
    setCustomApiKey(null);
  };

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore listeners
  useEffect(() => {
    if (!user) return;

    const unsubShipments = onSnapshot(collection(db, 'shipments'), (snapshot) => {
      setShipments(snapshot.docs.map(doc => doc.data() as Shipment));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'shipments'));

    const unsubDisruptions = onSnapshot(collection(db, 'disruptions'), (snapshot) => {
      setDisruptions(snapshot.docs.map(doc => doc.data() as Disruption));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'disruptions'));

    return () => {
      unsubShipments();
      unsubDisruptions();
    };
  }, [user]);

  // Connection test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const seedDatabase = async () => {
    if (!isAdmin) return;
    const batch = writeBatch(db);
    
    const mockShipments: Shipment[] = [
      {
        id: "SHP-001",
        origin: { id: "SGP", name: "Singapore Port", lat: 1.29027, lng: 103.851959 },
        destination: { id: "RTM", name: "Port of Rotterdam", lat: 51.9244, lng: 4.4777 },
        currentLocation: { lat: 12.0, lng: 50.0 },
        status: "at-risk",
        riskLevel: "high",
        eta: "2026-04-12",
        cargo: "Semiconductors",
        lastUpdated: new Date().toISOString(),
      },
      {
        id: "SHP-002",
        origin: { id: "SHA", name: "Shanghai Port", lat: 31.2304, lng: 121.4737 },
        destination: { id: "LAX", name: "Port of Los Angeles", lat: 33.7701, lng: -118.2437 },
        currentLocation: { lat: 35.0, lng: 160.0 },
        status: "on-time",
        riskLevel: "low",
        eta: "2026-04-05",
        cargo: "Consumer Electronics",
        lastUpdated: new Date().toISOString(),
      }
    ];

    const mockDisruptions: Disruption[] = [
      {
        id: "DIS-101",
        type: "weather",
        severity: "high",
        location: { lat: 15.0, lng: 55.0, radius: 500 },
        description: "Severe tropical storm forming in the Arabian Sea.",
        impactedShipments: ["SHP-001"],
      }
    ];

    mockShipments.forEach(s => batch.set(doc(db, 'shipments', s.id), s));
    mockDisruptions.forEach(d => batch.set(doc(db, 'disruptions', d.id), d));

    try {
      await batch.commit();
      alert("Database seeded successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch-seed');
    }
  };

  const handleOptimize = async () => {
    if (!selectedShipment) return;
    const disruption = disruptions.find(d => d.impactedShipments.includes(selectedShipment.id));
    if (!disruption) return;

    setOptimizing(true);
    try {
      const result = await getRouteOptimization(selectedShipment, disruption);
      setOptimization(result);
    } catch (error) {
      console.error(error);
    } finally {
      setOptimizing(false);
    }
  };

  const applyOptimization = async () => {
    if (!optimization || !selectedShipment) return;
    
    const updatedShipment: Shipment = {
      ...selectedShipment,
      status: 'on-time',
      riskLevel: 'low',
      eta: '2026-04-08',
      lastUpdated: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'shipments', selectedShipment.id), updatedShipment);
      setOptimization(null);
      setSelectedShipment(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `shipments/${selectedShipment.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent opacity-20" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-8">
          <Activity className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-serif italic mb-4">Nexus Intelligence</h1>
        <p className="text-gray-400 mb-12 text-center max-w-md">
          Global supply chain monitoring and disruption prediction. Please authenticate to access the command node.
        </p>
        <button 
          onClick={handleLogin}
          className="flex items-center gap-3 px-8 py-4 bg-white text-bg font-bold rounded-xl hover:bg-white/90 transition-all"
        >
          <LogIn className="w-5 h-5" />
          Authenticate with Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/20 backdrop-blur-sm z-20">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif italic text-xl tracking-tight">Nexus Intelligence</h1>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-40">
              <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Node: {user.email}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => !customApiKey && setCustomApiKey('')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 border rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-all",
              customApiKey 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20" 
                : "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20 animate-pulse"
            )}
          >
            <Zap className="w-3 h-3" />
            {customApiKey ? "Session Key Active" : "Set Session Key"}
          </button>

          {isAdmin && (
            <button 
              onClick={seedDatabase}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-[10px] font-semibold uppercase tracking-widest transition-all"
            >
              <Database className="w-3 h-3" />
              Seed Database
            </button>
          )}
          <button 
            onClick={() => setIsCommandCenterOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-lg text-accent text-xs font-semibold uppercase tracking-widest transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            AI Command Center
          </button>
          
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest opacity-40">Shipments</span>
              <span className="mono-value text-lg">{shipments.length}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest opacity-40">Alerts</span>
              <span className="mono-value text-lg text-risk-high">{disruptions.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-hidden">
          <div className="h-[450px]">
            <SupplyChainMap 
              shipments={shipments} 
              disruptions={disruptions}
              onShipmentClick={setSelectedShipment}
            />
          </div>
          
          <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
            <div className="glass-panel p-6 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-accent" />
                  <h2 className="font-serif italic text-lg">Shipment Manifest</h2>
                </div>
              </div>
              <ShipmentList 
                shipments={shipments} 
                selectedId={selectedShipment?.id}
                onSelect={setSelectedShipment}
              />
            </div>
            
            <div className="overflow-hidden">
              <LiveFeed />
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 overflow-hidden">
          <RiskAnalysis shipments={shipments} disruptions={disruptions} />
        </div>
      </main>

      <CommandCenter 
        shipments={shipments} 
        disruptions={disruptions} 
        isOpen={isCommandCenterOpen} 
        onClose={() => setIsCommandCenterOpen(false)} 
      />

      <AnimatePresence>
        {customApiKey === '' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setCustomApiKey(sessionStorage.getItem('CUSTOM_GEMINI_API_KEY'))}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-panel bg-card p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-2xl font-serif italic mb-2 text-center">Session API Key</h2>
              <p className="text-gray-400 mb-8 text-sm text-center leading-relaxed">
                Enter your Gemini API key for this session. It will be stored in <strong>sessionStorage</strong> and automatically cleared when you close this tab.
              </p>
              
              <div className="space-y-4">
                <div className="relative">
                  <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                  <input 
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Enter API Key..."
                    className="w-full bg-white/5 border border-border rounded-xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                
                <button 
                  onClick={handleSaveKey}
                  disabled={!keyInput.trim()}
                  className="w-full bg-white text-bg font-bold py-4 rounded-xl hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Save to Session
                </button>
                
                <button 
                  onClick={() => setCustomApiKey(sessionStorage.getItem('CUSTOM_GEMINI_API_KEY'))}
                  className="w-full py-2 text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!customApiKey && customApiKey !== '' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-md glass-panel bg-card p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-2xl font-serif italic mb-4">API Key Required</h2>
              <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                To enable AI-powered risk analysis and route optimization, you must provide a Gemini API key for this session.
              </p>
              <div className="space-y-4">
                <button 
                  onClick={() => setCustomApiKey('')}
                  className="w-full bg-white text-bg font-bold py-4 rounded-xl hover:bg-white/90 transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  Configure Session Key
                </button>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                  Key is cleared automatically on tab close.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedShipment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedShipment(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl glass-panel bg-card p-8 shadow-2xl"
            >
              <button 
                onClick={() => setSelectedShipment(null)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5 opacity-40" />
              </button>

              <div className="flex items-start gap-6 mb-8">
                <div className={cn(
                  "w-16 h-16 rounded-xl flex items-center justify-center",
                  selectedShipment.status === 'at-risk' ? "bg-risk-high/10" : "bg-accent/10"
                )}>
                  <Box className={cn(
                    "w-8 h-8",
                    selectedShipment.status === 'at-risk' ? "text-risk-high" : "text-accent"
                  )} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-serif italic">{selectedShipment.cargo}</h2>
                    <span className="mono-value opacity-40">{selectedShipment.id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm opacity-60">
                    <span>{selectedShipment.origin.name}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span>{selectedShipment.destination.name}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8 mb-8">
                <div>
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Current Status</div>
                  <div className={cn(
                    "text-sm font-semibold uppercase tracking-wider",
                    selectedShipment.status === 'at-risk' ? "text-risk-high" : "text-risk-low"
                  )}>{selectedShipment.status}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Risk Level</div>
                  <div className={cn(
                    "text-sm font-semibold uppercase tracking-wider",
                    selectedShipment.riskLevel === 'high' ? "text-risk-high" : "text-risk-low"
                  )}>{selectedShipment.riskLevel}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Estimated Arrival</div>
                  <div className="mono-value text-sm">{selectedShipment.eta}</div>
                </div>
              </div>

              {selectedShipment.status === 'at-risk' && !optimization && (
                <div className="bg-risk-high/5 border border-risk-high/20 rounded-xl p-6 mb-8">
                  <div className="flex items-center gap-3 mb-3 text-risk-high">
                    <AlertCircle className="w-5 h-5" />
                    <h4 className="font-semibold">Disruption Detected</h4>
                  </div>
                  <p className="text-sm opacity-70 mb-6">
                    This shipment is currently impacted by a high-severity disruption. 
                    Immediate route optimization is recommended.
                  </p>
                  <button 
                    onClick={handleOptimize}
                    disabled={optimizing}
                    className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {optimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                    {optimizing ? "Generating AI Optimization..." : "Execute AI Route Optimization"}
                  </button>
                </div>
              )}

              <AnimatePresence>
                {optimization && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-accent/5 border border-accent/20 rounded-xl p-6 mb-8"
                  >
                    <div className="flex items-center gap-3 mb-4 text-accent">
                      <Zap className="w-5 h-5" />
                      <h4 className="font-semibold">AI Optimized Route Ready</h4>
                    </div>
                    <div className="space-y-4 mb-6">
                      <div className="text-sm opacity-80 italic leading-relaxed">
                        "{optimization.reason}"
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-xs uppercase tracking-widest opacity-50">Est. Time Savings</span>
                        <span className="mono-value text-accent">{optimization.estimatedTimeSavings}</span>
                      </div>
                    </div>
                    <button 
                      onClick={applyOptimization}
                      className="w-full bg-white text-bg hover:bg-white/90 font-bold py-3 rounded-lg transition-all"
                    >
                      Authorize & Deploy New Route
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest opacity-30">
                <span>Last Updated: {selectedShipment.lastUpdated}</span>
                <span>Nexus Node: SG-01</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
