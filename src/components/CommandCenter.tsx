import React, { useState, useRef, useEffect } from 'react';
import { Shipment, Disruption } from '../types';
import { startSupplyChainChat } from '../services/geminiService';
import { MessageSquare, Send, Loader2, User, Bot, X, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  shipments: Shipment[];
  disruptions: Disruption[];
  isOpen: boolean;
  onClose: () => void;
}

interface GroundingChunk {
  web?: { uri: string; title: string };
  maps?: { uri: string; title: string };
}

interface Message {
  role: 'user' | 'model';
  text: string;
  groundingChunks?: GroundingChunk[];
}

export const CommandCenter: React.FC<Props> = ({ shipments, disruptions, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !chatRef.current) {
      chatRef.current = startSupplyChainChat(shipments, disruptions);
      setMessages([{ role: 'model', text: "Nexus AI Command Center active. How can I assist with your logistics operations today?" }]);
    }
  }, [isOpen, shipments, disruptions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userMessage });
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: response.text || "I'm sorry, I couldn't process that request.",
        groundingChunks: groundingChunks
      }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Error communicating with Nexus AI. Please check your connection." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 w-full max-w-md h-full bg-card border-l border-border z-50 flex flex-col shadow-2xl"
        >
          <div className="p-6 border-b border-border flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-accent" />
              <h2 className="font-serif italic text-lg">AI Command Center</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5 opacity-40" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.map((msg, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-accent/20' : 'bg-white/5'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-accent" /> : <Bot className="w-4 h-4 opacity-60" />}
                </div>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-accent text-white rounded-tr-none' 
                    : 'bg-white/5 text-gray-300 rounded-tl-none border border-white/5'
                }`}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                  
                  {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                      <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Sources & Locations</div>
                      {msg.groundingChunks.map((chunk, idx) => {
                        const source = chunk.web || chunk.maps;
                        if (!source) return null;
                        return (
                          <a 
                            key={idx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[11px] text-accent hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate">{source.title || source.uri}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <Bot className="w-4 h-4 opacity-60" />
                </div>
                <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5">
                  <Loader2 className="w-4 h-4 animate-spin opacity-40" />
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-border bg-black/20">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Query network status..."
                className="w-full bg-white/5 border border-border rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-accent transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors disabled:opacity-30"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] uppercase tracking-widest opacity-30">
              <span>Real-time Context Enabled</span>
              <span className="w-1 h-1 bg-white/20 rounded-full" />
              <span>Secure Channel</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
