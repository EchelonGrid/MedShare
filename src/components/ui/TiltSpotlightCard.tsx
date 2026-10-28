'use client';

import React, { useRef, useState } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';

interface TiltSpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  maxTilt?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function TiltSpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(20, 184, 166, 0.16)',
  maxTilt = 6,
  onClick,
  style,
}: TiltSpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);

  const springConfig = { damping: 22, stiffness: 240, mass: 0.5 };
  // Tilting: moving cursor up (normY < 0) tilts forward (rotateX > 0)
  const rotateX = useSpring(
    useTransform(normY, [-1, 1], [maxTilt, -maxTilt]),
    springConfig
  );
  // Tilting: moving cursor right (normX > 0) tilts right (rotateY > 0)
  const rotateY = useSpring(
    useTransform(normX, [-1, 1], [-maxTilt, maxTilt]),
    springConfig
  );

  const spotlightBg = useMotionTemplate`radial-gradient(450px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 80%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseX.set(x);
    mouseY.set(y);

    const nx = Math.max(-1, Math.min(1, ((x / rect.width) - 0.5) * 2));
    const ny = Math.max(-1, Math.min(1, ((y / rect.height) - 0.5) * 2));
    normX.set(nx);
    normY.set(ny);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    normX.set(0);
    normY.set(0);
  };

  return (
    <div
      style={{ perspective: 1200 }}
      className="relative isolate"
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          ...style,
        }}
        className={`group relative rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-[0_20px_45px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)] transition-[border-color,box-shadow] duration-300 hover:shadow-[0_25px_50px_-12px_rgba(20,184,166,0.18)] ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        {/* Dynamic Specular 1px Top Edge Highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent rounded-t-2xl z-20" />

        {/* Dynamic Cursor Spotlight Overlay */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-2xl z-10 transition-opacity duration-300"
          style={{
            background: spotlightBg,
            opacity: isHovered ? 1 : 0,
          }}
        />

        {/* Ambient Subtle Sheen */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent opacity-60 z-0" />

        {/* Card Content with 3D Depth Layer */}
        <div className="relative z-10 w-full h-full preserve-3d">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
