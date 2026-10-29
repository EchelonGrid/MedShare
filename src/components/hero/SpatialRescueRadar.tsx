'use client';

import React, { useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  Pill,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Activity,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export default function SpatialRescueRadar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 200, mass: 0.6 };
  const rotateX = useSpring(useTransform(normY, [-1, 1], [12, -12]), springConfig);
  const rotateY = useSpring(useTransform(normX, [-1, 1], [-12, 12]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseX.set(x);
    mouseY.set(y);

    const nx = Math.max(-1, Math.min(1, (x / rect.width - 0.5) * 2));
    const ny = Math.max(-1, Math.min(1, (y / rect.height - 0.5) * 2));
    normX.set(nx);
    normY.set(ny);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    normX.set(0);
    normY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[480px] sm:h-[520px] lg:h-[540px] flex items-center justify-center select-none"
      style={{ perspective: 1200 }}
    >
      {/* Dynamic 3D Spatial Stage */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        className="relative w-full max-w-[500px] lg:max-w-[540px] h-full flex items-center justify-center"
      >
        {/* ========================================================= */}
        {/* LAYER 0 (Z: 0px): AMBIENT LIGHT & SPATIAL RADAR RINGS    */}
        {/* ========================================================= */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ transform: 'translateZ(0px)' }}
        >
          {/* Central Radial Light Glow */}
          <div className="absolute w-80 h-80 rounded-full bg-teal-500/20 blur-3xl animate-pulse-glow" />
          <div className="absolute w-60 h-60 rounded-full bg-emerald-500/15 blur-2xl" />

          {/* Holographic Radar Concentric Circles */}
          <div className="absolute w-[340px] h-[340px] rounded-full border border-teal-500/20 animate-spin-slow" />
          <div className="absolute w-[260px] h-[260px] rounded-full border border-dashed border-teal-400/25 animate-spin-reverse-slow" />
          <div className="absolute w-[180px] h-[180px] rounded-full border border-teal-500/30" />

          {/* Coordinate Crosshairs */}
          <div className="absolute w-[360px] h-[1px] bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
          <div className="absolute h-[360px] w-[1px] bg-gradient-to-b from-transparent via-teal-500/30 to-transparent" />
        </div>

        {/* ========================================================= */}
        {/* LAYER 1 (Z: 25px): 3D REALISTIC METALLIC SILVER BLISTER  */}
        {/* STRIP WITH 3D TWO-TONE CAPSULES & SWEEPING LASER SCANNER  */}
        {/* ========================================================= */}
        <div
          className="relative z-10 flex items-center justify-center pointer-events-none"
          style={{
            transform: 'translateZ(25px) rotateX(10deg) rotateY(-8deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Metallic Silver Blister Pack Base Frame */}
          <div
            className="relative w-64 sm:w-72 h-[390px] rounded-3xl bg-gradient-to-br from-slate-100 via-slate-200 to-teal-100 border-2 border-white/80 shadow-[0_30px_70px_rgba(0,0,0,0.45),inset_0_2px_10px_rgba(255,255,255,0.9)] p-4 flex flex-col justify-between overflow-hidden"
            style={{
              backgroundImage: `
                linear-gradient(135deg, rgba(255,255,255,0.7) 0%, transparent 40%, rgba(20,184,166,0.08) 100%),
                repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(148, 163, 184, 0.12) 3px, rgba(148, 163, 184, 0.12) 4px)
              `,
            }}
          >
            {/* Top Crimped Foil Edge */}
            <div className="absolute top-0 inset-x-0 h-2 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(100,116,139,0.25)_2px,rgba(100,116,139,0.25)_3px)] border-b border-slate-300/60" />
            
            {/* Bottom Crimped Foil Edge */}
            <div className="absolute bottom-0 inset-x-0 h-2 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(100,116,139,0.25)_2px,rgba(100,116,139,0.25)_3px)] border-t border-slate-300/60" />

            {/* Specular Rim */}
            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent rounded-t-3xl" />

            {/* Holographic Header Bar on Blister Pack */}
            <div className="relative z-10 flex items-center justify-between pb-2 border-b border-slate-300/80 text-[10px] font-mono text-slate-700">
              <span className="flex items-center gap-1.5 font-bold tracking-wider text-teal-950">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>LOT #BD-2026-FEFO</span>
              </span>
              <span className="text-teal-900 font-extrabold bg-teal-600/15 border border-teal-600/30 px-1.5 py-0.5 rounded text-[9px]">
                ALU-FOIL SEALED
              </span>
            </div>

            {/* 8 Blister Cavities Grid (2 columns x 4 rows) */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 my-1.5 relative z-10">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
                <div
                  key={idx}
                  className="relative h-13 sm:h-14 rounded-2xl bg-white/60 shadow-inner border border-slate-300/80 p-2 flex items-center justify-center overflow-hidden"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Glossy Blister Dome Curved Specular Reflection */}
                  <div className="pointer-events-none absolute inset-x-2 top-0.5 h-2 rounded-full bg-gradient-to-b from-white/95 to-transparent opacity-85" />
                  <div className="pointer-events-none absolute inset-0 bg-radial-at-t from-white/40 via-transparent to-slate-900/5" />

                  {/* 3D Two-Tone Pharmaceutical Capsule */}
                  <div
                    style={{
                      transform: 'translateZ(25px) rotate(-14deg)',
                      transformStyle: 'preserve-3d',
                    }}
                    className="relative w-11 sm:w-12 h-5.5 sm:h-6 rounded-full flex items-center shadow-[0_4px_10px_rgba(15,23,42,0.35)] border border-white/60 overflow-hidden"
                  >
                    {/* Left Half: Medical Emerald */}
                    <div className="w-1/2 h-full bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-700 flex items-center justify-center relative">
                      <span className="text-[7px] font-mono font-bold text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
                        {idx % 2 === 0 ? 'RX' : '500'}
                      </span>
                    </div>

                    {/* Center Joint Seam */}
                    <div className="w-[1px] h-full bg-slate-300/60 z-10 shrink-0" />

                    {/* Right Half: Pearl White */}
                    <div className="w-1/2 h-full bg-gradient-to-r from-white via-slate-100 to-slate-200 flex items-center justify-center relative">
                      <span className="text-[7px] font-mono font-extrabold text-slate-700">
                        {idx % 2 === 0 ? 'MED' : 'FEFO'}
                      </span>
                    </div>

                    {/* Cylindrical Specular Highlight across top of capsule */}
                    <div className="pointer-events-none absolute top-0.5 left-2 right-2 h-1 rounded-full bg-white/80 blur-[0.4px]" />

                    {/* Bottom ambient shadow */}
                    <div className="pointer-events-none absolute bottom-0 inset-x-0 h-1 bg-black/15" />
                  </div>

                  {/* Micro cavity index */}
                  <div className="pointer-events-none absolute -bottom-0.5 -right-0.5 text-[8px] font-mono text-slate-400 font-bold px-1 opacity-60">
                    0{idx + 1}
                  </div>
                </div>
              ))}
            </div>

            {/* Sweeping Emerald Laser FEFO Scanner */}
            <motion.div
              animate={{
                top: ['8%', '92%', '8%'],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute left-1 right-1 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_#10b981,0_0_8px_#34d399] pointer-events-none z-30"
            >
              {/* Micro scan flare in the center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-1.5 bg-emerald-200 blur-[1px] rounded-full" />
            </motion.div>

            {/* Footer Telemetry Stamp */}
            <div className="relative z-10 pt-2 border-t border-slate-300/80 flex items-center justify-between text-[9px] font-mono text-slate-700">
              <span className="font-bold text-slate-800">AZITHROMYCIN • 500MG</span>
              <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                100% STERILE
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* LAYER 2: SVG 3D CONNECTION BEAMS                           */}
        {/* ========================================================= */}
        <svg
          viewBox="0 0 500 540"
          className="absolute inset-0 w-full h-full pointer-events-none z-15 overflow-visible"
          style={{ transform: 'translateZ(45px)' }}
        >
          <defs>
            <linearGradient id="beamGradientTeal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="beamGradientAmber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="beamGradientSky" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Beam from Dhaka Hub (Top Left) to Blister Strip */}
          <path
            d="M 120 50 Q 155 100 185 140"
            fill="none"
            stroke="url(#beamGradientTeal)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="animate-pulse"
          />

          {/* Beam from Bogura SZMCH (Top Right) to Blister Strip */}
          <path
            d="M 380 55 Q 345 105 315 145"
            fill="none"
            stroke="url(#beamGradientAmber)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="animate-pulse"
          />

          {/* Beam from Pabna Sadar (Bottom Left) to Blister Strip */}
          <path
            d="M 130 480 Q 165 435 195 390"
            fill="none"
            stroke="url(#beamGradientSky)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="animate-pulse"
          />
        </svg>

        {/* ========================================================= */}
        {/* LAYER 3 (Z: 70px - 90px): 3D FLOATING BANGLADESH TELEMETRY NODES */}
        {/* Positioned on outer perimeter so they NEVER overlap the  */}
        {/* blister pack or capsules                                 */}
        {/* ========================================================= */}

        {/* NODE 1: Dhaka Hub (Top Left Perimeter) */}
        <motion.div
          whileHover={{ scale: 1.05, zIndex: 50 }}
          style={{
            transform: 'translateZ(75px)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute top-2 left-0 sm:-left-4 lg:-left-8 z-30 transition-all duration-200"
        >
          <div className="bg-slate-950/90 backdrop-blur-xl border border-emerald-500/40 rounded-xl px-3 py-2 shadow-[0_15px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(16,185,129,0.2)] flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            <div className="text-left font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">Dhaka Central Hub</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-400/30">
                  SEALED
                </span>
              </div>
              <p className="text-[10px] text-teal-200/80">
                Azithromycin 500mg • 140 Packs
              </p>
            </div>
          </div>
        </motion.div>

        {/* NODE 2: Bogura SZMCH (Top Right Perimeter) */}
        <motion.div
          whileHover={{ scale: 1.05, zIndex: 50 }}
          style={{
            transform: 'translateZ(85px)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute top-4 right-0 sm:-right-4 lg:-right-8 z-30 transition-all duration-200"
        >
          <div className="bg-slate-950/90 backdrop-blur-xl border border-amber-500/40 rounded-xl px-3 py-2 shadow-[0_15px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(245,158,11,0.2)] flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
            </span>
            <div className="text-left font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">Bogura SZMCH</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-400/30">
                  18d LEFT
                </span>
              </div>
              <p className="text-[10px] text-amber-200/80">
                Urgent FEFO Match • Azithromycin 500mg
              </p>
            </div>
          </div>
        </motion.div>

        {/* NODE 3: Pabna Sadar Clinic (Bottom Left Perimeter) */}
        <motion.div
          whileHover={{ scale: 1.05, zIndex: 50 }}
          style={{
            transform: 'translateZ(75px)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute bottom-2 left-2 sm:-left-2 lg:-left-6 z-30 transition-all duration-200"
        >
          <div className="bg-slate-950/90 backdrop-blur-xl border border-cyan-500/40 rounded-xl px-3 py-2 shadow-[0_15px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(6,182,212,0.2)] flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
            </span>
            <div className="text-left font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">Pabna Sadar Clinic</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-400/30">
                  BMDC Rx
                </span>
              </div>
              <p className="text-[10px] text-cyan-200/80">
                Verified Handover Ready • NGO Outreach
              </p>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
