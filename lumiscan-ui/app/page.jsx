'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { OrbitControls } from '@react-three/drei';
import { AreaChart, Area, YAxis, ResponsiveContainer } from 'recharts';
import { ShieldCheck, ShieldAlert, Lock, Zap, ArrowDown, ArrowUp, BarChart3, Sliders, X, Info, Globe, Server, Shield, Activity } from 'lucide-react';
import { LumiscanEye } from '../components/LumiscanEye';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';

// --- CONFIGURATION ---
const DEFAULT_START_PRICE = 95000;
const CRASH_PATTERN = [0.99, 0.98, 0.96, 0.93, 0.89, 0.84, 0.80, 0.76, 0.74, 0.75, 0.75];

// --- FLARE LOGO COMPONENT (The "F" Spark) ---
const FlareLogo = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 0L93.3 25V75L50 100L6.7 75V25L50 0Z" fill="currentColor" fillOpacity="0.1"/>
    <path d="M50 20L75 35V65L50 80L25 65V35L50 20Z" stroke="currentColor" strokeWidth="4"/>
    <circle cx="50" cy="50" r="8" fill="currentColor"/>
  </svg>
);

export default function Home() {
  // --- STATE ---
  const [oraclePrice, setOraclePrice] = useState(DEFAULT_START_PRICE);
  const lastOracleUpdate = useRef(0);
  const [volatility, setVolatility] = useState(0.0);
  const [priceHistory, setPriceHistory] = useState([]);
  const [isShutterClosed, setIsShutterClosed] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(DEFAULT_START_PRICE);
  
  // UI State
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [showConfig, setShowConfig] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  // Vault UI
  const [txStatus, setTxStatus] = useState("IDLE"); 
  const [txMessage, setTxMessage] = useState("");

  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();

  const simStep = useRef(0);
  const crashStartPrice = useRef(DEFAULT_START_PRICE);

  // --- INITIALIZATION ---
  useEffect(() => {
    generateInitialHistory(DEFAULT_START_PRICE);
  }, []);

  const generateInitialHistory = (basePrice) => {
    const initialData = [];
    let price = basePrice;
    for (let i = 0; i < 60; i++) {
      price = price * (1 + (Math.random() * 0.002 - 0.001));
      initialData.push({ time: i, value: price });
    }
    setPriceHistory(initialData);
    setCurrentPrice(price);
    setOraclePrice(price); // Ensure oracle matches initial spot
  };

  // --- HEARTBEAT LOOP (1.8s Latency Calibration) ---
  useEffect(() => {
    const tickRate = 200; // Sensor polling rate
    const interval = setInterval(() => {
      setPriceHistory(prev => {
        if (prev.length === 0) return prev;
        const lastPrice = prev[prev.length - 1].value;
        let newPrice = lastPrice;
        let currentVol = 0.0;

        // FDC SENSOR LOGIC (Updates every 200ms)
        if (isSimulating) {
          if (simStep.current < CRASH_PATTERN.length) {
              newPrice = crashStartPrice.current * CRASH_PATTERN[simStep.current] + (Math.random() * 150 - 75);
              simStep.current++;
              const crashDepth = (DEFAULT_START_PRICE - newPrice) / DEFAULT_START_PRICE;
              currentVol = Math.min(crashDepth * 4, 1.0); 
              if ((currentVol * 100) >= alertThreshold && !isShutterClosed) setIsShutterClosed(true);
          } else {
              newPrice = lastPrice * (1 + (Math.random() * 0.01 - 0.005));
              currentVol = 1.0; 
          }
        } else {
          newPrice = lastPrice * (1 + (Math.random() * 0.003 - 0.0015));
          currentVol = Math.random() * 0.05;
        }

        setCurrentPrice(newPrice);
        setVolatility(currentVol);

        // FTSO ORACLE LOGIC (Simulating 1.8s Block Latency)
        const now = Date.now();
        if (now - lastOracleUpdate.current >= 1800) {
            setOraclePrice(newPrice); // Oracle catches up every 1.8 seconds
            lastOracleUpdate.current = now;
        }
        
        const newHistory = [...prev, { time: Date.now(), value: newPrice }];
        if (newHistory.length > 60) newHistory.shift();
        return newHistory;
      });
    }, tickRate);
    return () => clearInterval(interval);
  }, [isSimulating, isShutterClosed, alertThreshold]);

  // --- ACTIONS ---
  const triggerCrash = () => {
    crashStartPrice.current = currentPrice;
    simStep.current = 0;
    setIsSimulating(true);
    setTxStatus("IDLE");
  };

  const resetSystem = () => {
    setIsSimulating(false);
    setIsShutterClosed(false);
    simStep.current = 0;
    setVolatility(0.0);
    setTxStatus("IDLE");
    generateInitialHistory(DEFAULT_START_PRICE);
  };

  const handleTx = async (type) => {
    if (isShutterClosed) {
        setTxStatus("ERROR");
        setTxMessage("REVERTED: IRIS_PAUSED (0x2a91)");
        setTimeout(() => { setTxStatus("IDLE"); setTxMessage(""); }, 3000);
        return; 
    }
    if (!address) {
        setTxStatus("ERROR");
        setTxMessage("WALLET NOT CONNECTED");
        setTimeout(() => { setTxStatus("IDLE"); setTxMessage(""); }, 2000);
        return;
    }
    try {
        setTxStatus("PENDING");
        setTxMessage(type === "DEPOSIT" ? "SIGNING DEPOSIT..." : "REQUESTING WITHDRAWAL...");
        await sendTransactionAsync({ to: address, value: parseEther('0') });
        setTxStatus("PENDING"); 
        setTxMessage("CONFIRMING ON FLARE...");
        setTimeout(() => {
            setTxStatus("SUCCESS");
            setTxMessage(type === "DEPOSIT" ? "VAULT DEPOSIT: CONFIRMED" : "VAULT WITHDRAWAL: CONFIRMED");
            setTimeout(() => { setTxStatus("IDLE"); setTxMessage(""); }, 5000);
        }, 4000); 
    } catch (error) {
        setTxStatus("IDLE");
        setTxMessage(""); 
    }
  };

  const getZoneLabel = (val) => {
      if (val < 25) return "CONSERVATIVE (High Sensitivity)";
      if (val < 50) return "BALANCED (Standard)";
      if (val < 75) return "TOLERANT (Low Sensitivity)";
      return "DEGEN (Only Catastrophic Events)";
  };

  return (
    <main className="h-screen w-full bg-[#050505] relative overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-[#E62058]/30">
      
      {/* ATMOSPHERE */}
      <div className={`absolute top-0 w-full h-full pointer-events-none transition-opacity duration-[2000ms] ${isShutterClosed ? "opacity-30" : "opacity-10"}`}
           style={{
             background: `radial-gradient(circle at 50% 50%, ${isShutterClosed ? '#E62058' : '#FF5F1F'}, transparent 60%)`
           }}>
      </div>

      {/* 3D SCENE */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 40 }}>
          <ambientLight intensity={0.3} />
          <group scale={[1.2, 1.2, 1.2]}>
             <LumiscanEye dangerLevel={volatility} isShutterClosed={isShutterClosed} />
          </group>
          <EffectComposer>
            <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={400} intensity={isShutterClosed ? 2.5 : 1.2} />
          </EffectComposer>
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.3} enablePan={false} />
        </Canvas>
      </div>

      {/* GRAPH*/}
      <div className="absolute bottom-0 w-full h-[35%] z-10 px-0 pb-0 opacity-40 mix-blend-screen transition-opacity duration-500">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceHistory}>
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isShutterClosed ? "#E62058" : "#fbbf24"} stopOpacity={0.5}/>
                        <stop offset="95%" stopColor={isShutterClosed ? "#E62058" : "#fbbf24"} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke={isShutterClosed ? "#E62058" : "#fbbf24"} strokeWidth={2} fill="url(#colorValue)" isAnimationActive={true} animationDuration={isSimulating ? 200 : 1000} />
                <YAxis domain={['auto', 'auto']} hide />
            </AreaChart>
          </ResponsiveContainer>
      </div>

      {/* --- INFO MODAL --- */}
      {showInfo && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-[600px] bg-[#0A0A0A] border border-white/10 rounded-xl p-8 relative shadow-2xl">
                  <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                      <X size={20} />
                  </button>
                  
                  <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full border border-[#E62058] flex items-center justify-center bg-[#E62058]/10">
                          <FlareLogo className="w-5 h-5 text-[#E62058]" />
                      </div>
                      <h2 className="text-xl font-light tracking-[0.2em] text-white">SYSTEM ARCHITECTURE</h2>
                  </div>

                  <div className="space-y-6">
                      <div className="flex gap-4">
                          <div className="mt-1"><Globe size={18} className="text-blue-400" /></div>
                          <div>
                              <h3 className="text-xs font-bold text-white tracking-widest mb-1">THE MISSION</h3>
                              <p className="text-[11px] text-gray-400 leading-relaxed">
                                  Lumiscan is a hybrid decentralized circuit breaker. It utilizes a high-frequency Optimistic Sentinel to monitor off-chain liquidity sources, using the Flare Data Connector (FDC) to provide decentralized attestation and settlement of risk events once detected.
                              </p>
                          </div>
                      </div>

                      <div className="flex gap-4">
                          <div className="mt-1"><Shield size={18} className="text-emerald-400" /></div>
                          <div>
                              <h3 className="text-xs font-bold text-white tracking-widest mb-1">THE IRIS MECHANISM</h3>
                              <p className="text-[11px] text-gray-400 leading-relaxed">
                                  When market volatility breaches defined safety parameters, the "Iris" closes. This broadcasts an immediate pause signal to the Sonar Smart Contract, placing integrated protocols into a Protected State. By temporarily freezing high-risk actions—such as withdrawals, liquidations, or marketplace trades—the system prevents insolvency and arbitrage exploitation during periods of extreme price divergence, ensuring the economic integrity of the ecosystem remains intact.
                              </p>
                          </div>
                      </div>

                      <div className="flex gap-4">
                          <div className="mt-1"><Server size={18} className="text-orange-400" /></div>
                          <div>
                              <h3 className="text-xs font-bold text-white tracking-widest mb-1">THE RISK INDEX (LRI)</h3>
                              <p className="text-[11px] text-gray-400 leading-relaxed">
                                  The <strong>Lumiscan Risk Index (LRI)</strong> is a multi-factor volatility engine designed to distinguish 
                                  between "Market Noise" and "Systemic Collapse."
                                  While the current MVP utilizes a <strong>Deterministic Threshold</strong> based on absolute price deviation, 
                                  the LRI is engineered to evolve into a <strong>Predictive Sentinel</strong>.

                                  <br /><br />

                                  By analyzing the <strong>temporal divergence</strong> between off-chain spot liquidity (via FDC) and 
                                  on-chain settlement (FTSO), the LRI identifies the mathematical "signature" of a crash in its infancy. 
                                  The end goal is a <strong>Stochastic Optimization Model</strong> that neutralizes the unit-economics of HFT 
                                  exploits—closing the Iris before the 1.8s block-latency window can be weaponized against the protocol.
                              </p>
                          </div>
                      </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-center">
                      <div className="text-[9px] text-gray-600 tracking-widest">VERSION 1.0.4 // COSTON2 TESTNET</div>
                      <button onClick={() => setShowInfo(false)} className="px-4 py-2 bg-white text-black text-[10px] font-bold tracking-widest hover:bg-gray-200">
                          ACKNOWLEDGE
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- HEADER --- */}
      <div className="absolute top-0 w-full p-8 md:p-12 z-50 flex justify-between items-start pointer-events-none">
          <div className="pointer-events-auto flex items-start gap-3">
              
              {/* 1. PRIMARY IDENTITY (Lumiscan) */}
              <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                      <FlareLogo className={`w-10 h-10 ${isShutterClosed ? "text-[#E62058] animate-pulse" : "text-white"}`} />
                      
                      {/* WRAP TITLE AND INFO BUTTON IN ONE ROW */}
                      <div className="flex items-center gap-2">
                          <h1 className="text-2xl font-light tracking-[0.5em] text-white leading-none">LUMISCAN</h1>
                          
                          <button 
                            onClick={() => setShowInfo(true)} 
                            className="w-7.5 h-7.5 rounded-full border border-white/10 text-white/30 flex items-center justify-center hover:bg-[#E62058] hover:text-white hover:border-[#E62058] transition-all duration-300"
                          >
                              <Info size={20} />
                          </button>
                      </div>
                  </div>

                  {/* STATUS SUBTITLE */}
                  <div className="flex items-center gap-2 mt-0 ml-12">
                      <div className={`w-1.5 h-1.5 rounded-full ${isShutterClosed ? "bg-[#E62058] animate-ping" : "bg-emerald-500"}`}></div>
                      <span className="text-[10px] text-white/40 font-mono tracking-[0.3em] uppercase">
                          {isShutterClosed ? "IRIS_SHUTTER_CLOSED" : "SYSTEM_ACTIVE"}
                      </span>
                  </div>
              </div>

              {/* 2. SECONDARY ATTRIBUTION */}
              <div className="flex items-start gap-3 border-l border-white/10 pl-6 h-9 opacity-40 hover:opacity-100 transition-opacity duration-500">
                  <span className="text-[10px] text-white/50 tracking-[0.3em] font-mono uppercase mt-[6px] hidden lg:block">
                      Built on
                  </span>
                  <img 
                      src="/flare-flr-logo.svg" 
                      alt="Flare" 
                      className="h-3 w-auto brightness-200 mt-1.75"
                  />
              </div>
          </div>
          
          {/* 3. SYSTEM CONNECTION */}
          <div className="pointer-events-auto">
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
                const connected = mounted && account && chain;
                return (
                  <div {...(!mounted && { 'aria-hidden': true, 'style': { opacity: 0, pointerEvents: 'none' } })}>
                    {(() => {
                      if (!connected) {
                        return (
                          <button onClick={openConnectModal} className="px-5 py-2 border border-white/10 bg-white/5 backdrop-blur-md text-gray-400 text-[9px] tracking-[0.2em] font-mono hover:border-[#E62058] hover:text-white transition-all shadow-lg">
                            INITIALIZE_SYSTEM
                          </button>
                        );
                      }
                      return (
                        <button onClick={openAccountModal} className="px-4 py-2 border border-[#E62058]/20 bg-[#E62058]/5 text-white text-[9px] tracking-widest font-mono flex items-center gap-2 hover:bg-[#E62058]/10 transition-colors">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#E62058] animate-pulse"></div>
                          {account.displayName.toUpperCase()}
                        </button>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
      </div>

      {/* --- CENTER GHOST RING (Dual-Price HUD) --- */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center justify-center space-y-2">
            <div className={`absolute w-[300px] h-[300px] rounded-full border border-white/10 transition-all duration-1000 ${isShutterClosed ? "border-[#E62058]/40 scale-110" : "scale-100 opacity-50"}`}></div>
            <div className={`transition-all duration-500 ${isShutterClosed ? "text-[#E62058] scale-125" : "text-orange-400/80"}`}>
                {isShutterClosed ? <Lock size={24} /> : <ShieldCheck size={24} />}
            </div>

              <div className="flex flex-col items-center">
                  {/* FTSO PRICE (Slow/Vulnerable) */}
                  <div className={`text-7xl font-thin tracking-tighter transition-all duration-300 ${isShutterClosed ? "text-[#E62058]" : "text-white"}`}>
                    ${oraclePrice.toLocaleString(undefined, {maximumFractionDigits: 0})}
                  </div>
                  <div className="text-[9px] tracking-[0.4em] text-white/30 font-mono mb-6 uppercase">
                      Reference Asset Value (FTSO v2)
                  </div>

                  {/* FDC PRICE (Fast/Protective) */}
                  <div className="bg-white/5 border border-white/10 rounded-full px-5 py-3 flex items-center gap-4 backdrop-blur-md">
                    <div className="flex flex-col leading-none">
                        <span className="text-[7px] text-white/40 font-mono uppercase tracking-widest">Sentinel Feed (FDC Spot)</span>
                        <span className={`text-sm font-mono ${isShutterClosed ? "text-[#E62058]" : "text-orange-400"}`}>
                          ${currentPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}
                        </span>
                    </div>
                    <div className="w-[1px] h-4 bg-white/10"></div>
                    <div className={`text-[8px] font-mono tracking-widest px-3 py-1 rounded transition-all ${isShutterClosed ? "bg-[#E62058] text-white animate-pulse" : "bg-emerald-500/20 text-emerald-400"}`}>
                        {isShutterClosed ? "THREAT_ISOLATED" : "SENTINEL_SCANNING"}
                    </div>
                </div>
              </div>
        </div>
      </div>

      {/* --- RIGHT SIDE: CLIENT SIMULATION PANEL --- */}
      <div className="absolute bottom-32 right-12 z-50 hidden md:block">
          
          <div className="text-[9px] text-gray-500 font-mono tracking-widest text-right mb-2 opacity-50">
             SIMULATED CLIENT PROTOCOL
          </div>

          <div className="bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 p-6 w-80 rounded-lg shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                  <div className="text-[10px] font-mono tracking-widest text-gray-400">VAULT DIAGNOSTICS</div>
                  <div className={`flex items-center gap-2 px-2 py-0.5 rounded border ${isShutterClosed ? "border-[#E62058]/50 bg-[#E62058]/20" : "border-emerald-500/30 bg-emerald-500/10"}`}>
                      <Activity size={10} className={isShutterClosed ? "text-[#E62058]" : "text-emerald-400"} />
                      <span className={`text-[9px] font-mono ${isShutterClosed ? "text-[#E62058]" : "text-emerald-400"}`}>
                          RISK: {(volatility * 100).toFixed(0)}
                      </span>
                  </div>
              </div>
              
              <div className={`mb-4 p-3 rounded text-[10px] font-mono border ${txStatus === "ERROR" ? "bg-[#E62058]/10 border-[#E62058]/50 text-[#E62058]" : txStatus === "SUCCESS" ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" : txStatus === "PENDING" ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-500 animate-pulse" : "bg-white/5 border-white/5 text-gray-500"}`}>
                  {txStatus === "IDLE" ? "SYSTEM READY // WAITING INPUT" : txMessage}
              </div>

              {isShutterClosed && (
                <div className="mb-4 animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center justify-center gap-2 text-[#E62058] mb-2">
                        <ShieldAlert size={12} />
                        <div className="text-[9px] font-mono tracking-widest font-bold">CIRCUIT BREAKER ACTIVE</div>
                    </div>
                    
                    <div className="bg-[#E62058]/10 border border-[#E62058]/20 rounded p-2 flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[8px] text-[#E62058]/80 font-mono">
                            <span>ATTESTATION ID</span>
                            <span className="text-[#E62058]">0x8f...3b2</span>
                        </div>
                        <div className="w-full h-[1px] bg-[#E62058]/10"></div>
                        <div className="flex justify-between items-center text-[8px] text-[#E62058]/80 font-mono">
                            <span>MERKLE ROOT</span>
                            <span className="text-[#E62058]">0x1a...9c4</span>
                        </div>
                        <div className="w-full h-[1px] bg-[#E62058]/10"></div>
                        <div className="flex justify-between items-center text-[8px] text-[#E62058]/80 font-mono">
                            <span>ROUND ID</span>
                            <span className="text-[#E62058]">#18,241</span>
                        </div>
                    </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                  <button 
                      onClick={() => handleTx("DEPOSIT")}
                      disabled={txStatus === "PENDING"} 
                      className={`flex flex-col items-center justify-center p-3 border rounded transition-all duration-300 group ${
                          isShutterClosed 
                          ? "border-[#E62058]/30 bg-[#E62058]/10 hover:bg-[#E62058]/20 text-[#E62058]" 
                          : "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                      }`}
                  >
                      <ArrowDown size={14} className="mb-1 group-hover:translate-y-0.5 transition-transform" />
                      <span className="text-[9px] tracking-widest">DEPOSIT</span>
                  </button>

                  <button 
                      onClick={() => handleTx("WITHDRAW")}
                      disabled={txStatus === "PENDING"} 
                      className={`flex flex-col items-center justify-center p-3 border rounded transition-all duration-300 group ${
                          isShutterClosed 
                          ? "border-[#E62058]/30 bg-[#E62058]/10 hover:bg-[#E62058]/20 text-[#E62058]" 
                          : "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                      }`}
                  >
                      <ArrowUp size={14} className="mb-1 group-hover:-translate-y-0.5 transition-transform" />
                      <span className="text-[9px] tracking-widest">WITHDRAW</span>
                  </button>
              </div>
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
          </div>
      </div>

      {/* --- FOOTER CONTROLS --- */}
      <div className="absolute bottom-0 w-full p-12 z-50 flex justify-between items-end pointer-events-none">
          
          <div className="hidden md:flex flex-col gap-4 pointer-events-auto">
              {showConfig ? (
                  <div className="bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 p-5 w-64 rounded-lg relative animate-in slide-in-from-bottom-5 fade-in duration-300">
                      <div className="flex items-center justify-between text-gray-500 mb-4 border-b border-white/5 pb-2">
                          <div className="flex items-center gap-2"><Sliders size={12} /><span className="text-[9px] tracking-widest">RISK PARAMETERS</span></div>
                          <button onClick={() => setShowConfig(false)} className="hover:text-white"><X size={12}/></button>
                      </div>
                      <div className="mb-4">
                          <div className="flex justify-between text-[9px] font-mono mb-1">
                              <span className="text-gray-400">LIVE RISK INDEX</span>
                              <span className={`${volatility * 100 >= alertThreshold ? "text-[#E62058] animate-pulse" : "text-emerald-400"}`}>
                                  {(volatility * 100).toFixed(0)} / 100
                              </span>
                          </div>
                          <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-300 ${volatility * 100 >= alertThreshold ? "bg-[#E62058]" : "bg-emerald-400"}`} style={{ width: `${Math.min(volatility * 100, 100)}%` }}></div>
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between text-[9px] font-mono mb-2">
                              <span className="text-gray-400">TRIGGER THRESHOLD</span>
                              <span className="text-orange-400">LEVEL {alertThreshold}</span>
                          </div>
                          <input type="range" min="10" max="100" value={alertThreshold} onChange={(e) => setAlertThreshold(Number(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                          <div className="text-[8px] text-gray-500 font-mono mt-2 text-center tracking-widest uppercase">
                              {getZoneLabel(alertThreshold)}
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-500">
                      <div className="bg-[#0A0A0A]/40 backdrop-blur border border-white/5 p-4 w-48 hover:border-white/20 transition-colors">
                          <div className="flex items-center gap-2 text-gray-500 mb-1"><BarChart3 size={12} /><span className="text-[9px] tracking-widest">24H VOLUME</span></div>
                          <div className="text-lg font-light text-white">$42.8B</div>
                      </div>
                      <button onClick={() => setShowConfig(true)} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group">
                         <div className="p-2 border border-white/5 bg-white/5 rounded-full group-hover:border-white/20"><Sliders size={12} /></div>
                         <span className="text-[9px] tracking-widest">CONFIGURE PARAMETERS</span>
                      </button>
                  </div>
              )}
          </div>
          <div className="flex-1 flex justify-center pb-8 pointer-events-auto">
             <div className="flex gap-6">
                 <button onClick={triggerCrash} disabled={isSimulating} className="px-8 py-3 rounded-full border border-[#E62058]/30 text-[#E62058]/60 text-[10px] tracking-[0.2em] hover:bg-[#E62058] hover:text-white transition-all duration-500 disabled:opacity-30">INJECT THREAT</button>
                 <button onClick={resetSystem} className="px-8 py-3 rounded-full border border-white/10 text-gray-500 text-[10px] tracking-[0.2em] hover:border-white/50 hover:text-white transition-all duration-500">RESET SYSTEM</button>
             </div>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1 opacity-60">
             <div className="text-[9px] text-gray-500 tracking-widest">BLOCK HEIGHT</div><div className="text-xs font-mono text-gray-300">#18,241,912</div>
             <div className="text-[9px] text-gray-500 tracking-widest mt-2">GAS PRICE</div><div className="text-xs font-mono text-gray-300">25 GWEI</div>
          </div>
      </div>

      {/* MOBILE WARNING */}
      <div className="md:hidden absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center">
          <ShieldAlert className="text-[#E62058] mb-4" size={48} />
          <h2 className="text-xl font-mono text-white mb-2">DESKTOP TERMINAL REQUIRED</h2>
          <p className="text-xs text-gray-500 font-mono">
              Lumiscan Risk Protocol is optimized for large-format displays. Please access via a desktop terminal.
          </p>
      </div>
    </main>
  );
}