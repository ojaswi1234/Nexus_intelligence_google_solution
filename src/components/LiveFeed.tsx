import React, { useState, useEffect } from 'react';
import { Activity, Terminal, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Event {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
}

const INITIAL_EVENTS: Event[] = [
  { id: '1', timestamp: '05:42:10', message: 'Nexus Node SG-01 heartbeat detected.', type: 'info' },
  { id: '2', timestamp: '05:42:15', message: 'AIS-778045179322 connection established.', type: 'info' },
  { id: '3', timestamp: '05:42:22', message: 'Satellite telemetry sync complete.', type: 'info' },
];

const RANDOM_MESSAGES = [
  { message: 'AIS-778045179322: Signal strength 98%', type: 'info' },
  { message: 'Node SG-01: Processing transit delta...', type: 'info' },
  { message: 'AIS-778045179322: Latency spike detected in Mediterranean sector.', type: 'warning' },
  { message: 'Node SG-01: Re-calculating ETA for SHP-003.', type: 'info' },
  { message: 'AIS-778045179322: Critical weather update for Arabian Sea.', type: 'critical' },
  { message: 'Node SG-01: Authorizing route optimization for SHP-001.', type: 'info' },
  { message: 'AIS-778045179322: Port congestion at Rotterdam increasing.', type: 'warning' },
];

export const LiveFeed: React.FC = () => {
  const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomMsg = RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)];
      const newEvent: Event = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        message: randomMsg.message,
        type: randomMsg.type as any,
      };
      setEvents(prev => [newEvent, ...prev].slice(0, 10));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full glass-panel p-6 bg-card/40 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent" />
          <h2 className="font-serif italic text-lg">Live Telemetry Feed</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-risk-low rounded-full animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest opacity-40">Live Sync</span>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-hidden">
        <AnimatePresence initial={false}>
          {events.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-start gap-3 group"
            >
              <div className="mono-value text-[10px] opacity-30 pt-1 shrink-0">{event.timestamp}</div>
              <div className="flex items-start gap-2">
                <ChevronRight className="w-3 h-3 opacity-20 mt-1 group-hover:text-accent transition-colors" />
                <span className={`text-[11px] leading-relaxed mono-value ${
                  event.type === 'critical' ? 'text-risk-high' : 
                  event.type === 'warning' ? 'text-risk-medium' : 'text-gray-400'
                }`}>
                  {event.message}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-widest opacity-30">Uptime</span>
              <span className="mono-value text-xs">99.99%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-widest opacity-30">Throughput</span>
              <span className="mono-value text-xs">1.2 GB/s</span>
            </div>
          </div>
          <Activity className="w-4 h-4 text-accent opacity-20" />
        </div>
      </div>
    </div>
  );
};
