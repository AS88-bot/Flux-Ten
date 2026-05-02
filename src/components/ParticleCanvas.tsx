import React, { useEffect, useRef, useState } from 'react';
import { soundService } from '../services/soundService';

interface Point {
  x: number;
  y: number;
}

interface ParticleProps {
  x: number;
  y: number;
  tx: number; // Target X
  ty: number; // Target Y
  vx: number;
  vy: number;
  size: number;
  color: string;
  layer: 'foreground' | 'background';
  opacity: number;
}

class Particle implements ParticleProps {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  layer: 'foreground' | 'background';
  opacity: number;
  originalSize: number;
  
  private friction = 0.94;
  private repulsionRadius = 150;
  private repulsionStrength = 0.8;
  private returnSpeed = 0.04;

  constructor(props: ParticleProps) {
    this.x = props.x;
    this.y = props.y;
    this.tx = props.tx;
    this.ty = props.ty;
    this.vx = props.vx;
    this.vy = props.vy;
    this.size = props.size;
    this.originalSize = props.size;
    this.color = props.color;
    this.layer = props.layer;
    this.opacity = props.opacity;
  }

  update(mouseX: number, mouseY: number, isVortexActive: boolean, centerX: number, centerY: number, viewOffsetX: number, viewOffsetY: number) {
    // Apply parallax/camera drift based on layer
    const parallaxMult = this.layer === 'foreground' ? 1.0 : 0.4;
    const finalTx = this.tx + viewOffsetX * parallaxMult;
    const finalTy = this.ty + viewOffsetY * parallaxMult;

    // 1. Distance from mouse
    const dx = this.x - mouseX;
    const dy = this.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.repulsionRadius) {
      const angle = Math.atan2(dy, dx);
      const force = (this.repulsionRadius - dist) / this.repulsionRadius;
      
      const layerMult = this.layer === 'foreground' ? 1.2 : 0.5;
      this.vx += Math.cos(angle) * force * force * this.repulsionStrength * 15 * layerMult;
      this.vy += Math.sin(angle) * force * force * this.repulsionStrength * 15 * layerMult;
    }

    // 2. Attraction to target
    const adx = finalTx - this.x;
    const ady = finalTy - this.y;
    
    // Magnetic / Elastic return
    const attraction = this.layer === 'foreground' ? 1.0 : 0.7;
    this.vx += adx * this.returnSpeed * attraction;
    this.vy += ady * this.returnSpeed * attraction;

    // 3. Vortex effect (during transitions)
    if (isVortexActive) {
        const vdx = this.x - centerX;
        const vdy = this.y - centerY;
        const vAngle = Math.atan2(vdy, vdx);
        const vDist = Math.sqrt(vdx * vdx + vdy * vdy);
        
        const swirlStrength = 0.4;
        this.vx += -Math.sin(vAngle) * swirlStrength * (vDist * 0.04);
        this.vy += Math.cos(vAngle) * swirlStrength * (vDist * 0.04);
        
        // Outward force
        this.vx += Math.cos(vAngle) * 3;
        this.vy += Math.sin(vAngle) * 3;
    }

    // 4. Apply velocity and friction
    this.vx *= this.friction;
    this.vy *= this.friction;
    
    this.x += this.vx;
    this.y += this.vy;

    // Subtle drift
    const time = Date.now() * 0.001;
    this.x += Math.sin(time + this.tx * 0.01) * 0.15;
    this.y += Math.cos(time + this.ty * 0.01) * 0.15;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

class AmbientParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    color: string;

    constructor(w: number, h: number) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 1.5 + 0.5;
        this.opacity = Math.random() * 0.2 + 0.05;
        this.color = '#ffffff';
    }

    update(w: number, h: number) {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0) this.x = w;
        if (this.x > w) this.x = 0;
        if (this.y < 0) this.y = h;
        if (this.y > h) this.y = 0;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

export const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [countDisplay, setCountDisplay] = useState(10);
  const particlesRef = useRef<Particle[]>([]);
  const ambientRef = useRef<AmbientParticle[]>([]);
  const animationFrameRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const viewOffsetRef = useRef({ x: 0, y: 0 });
  const targetViewOffsetRef = useRef({ x: 0, y: 0 });
  const isTransitioningRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  
  // Color palette: electric blue, violet, soft pink
  const colors = [
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#60a5fa', // lighter blue
  ];

  const TOTAL_PARTICLES = 3000;
  const AMBIENT_COUNT = 150;
  
  const sampleNumberPoints = (num: string, width: number, height: number): Point[] => {
    if (width <= 0 || height <= 0) return [];
    
    const offscreen = document.createElement('canvas');
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    
    // Scale for sampling
    const scale = 1;
    const w = Math.floor(width * scale);
    const h = Math.floor(height * scale);
    
    if (w <= 0 || h <= 0) return [];

    offscreen.width = w;
    offscreen.height = h;
    
    const fontSize = Math.min(width, height) * 0.7;
    ctx.font = `700 ${fontSize}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'black';
    ctx.fillText(num, w / 2, h / 2);
    
    try {
      const imageData = ctx.getImageData(0, 0, w, h);
      const pixels = imageData.data;
      const points: Point[] = [];
      
      const step = 4;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const index = (y * w + x) * 4;
          if (pixels[index + 3] > 128) {
            points.push({ x: x / scale, y: y / scale });
          }
        }
      }
      return points;
    } catch (e) {
      console.error("Sampling error:", e);
      return [];
    }
  };

  const initParticles = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Scale canvas for resolution
    const width = canvas.width;
    const height = canvas.height;
    
    if (width === 0 || height === 0) return;
    
    const initialPoints = sampleNumberPoints('10', width, height);
    const particles: Particle[] = [];
    
    // Safety guard: if no points sampled (font failed), create a fallback ring
    const points = initialPoints.length > 0 ? initialPoints : Array.from({ length: 100 }, (_, i) => ({
        x: width / 2 + Math.cos(i) * 200,
        y: height / 2 + Math.sin(i) * 200
    }));
    
    for (let i = 0; i < TOTAL_PARTICLES; i++) {
        const targetPoint = points[i % points.length];
        const layer = Math.random() > 0.4 ? 'foreground' : 'background';
        
        particles.push(new Particle({
            x: Math.random() * width,
            y: Math.random() * height,
            tx: targetPoint.x,
            ty: targetPoint.y,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            size: layer === 'foreground' ? Math.random() * 1.8 + 1 : Math.random() * 0.8 + 0.4,
            color: colors[Math.floor(Math.random() * colors.length)],
            layer: layer,
            opacity: layer === 'foreground' ? 0.9 : 0.4
        }));
    }
    
    const ambient: AmbientParticle[] = [];
    for (let i = 0; i < AMBIENT_COUNT; i++) {
        ambient.push(new AmbientParticle(width, height));
    }
    
    particlesRef.current = particles;
    ambientRef.current = ambient;
    setIsLoaded(true);
  };

  const updateNumber = (newNum: string) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const points = sampleNumberPoints(newNum, canvas.width, canvas.height);
    
    // Safety: if no points sampled, don't update targets but keep animation
    if (points.length === 0) {
        isTransitioningRef.current = true;
        setTimeout(() => { isTransitioningRef.current = false; }, 1000);
        return;
    }
    
    isTransitioningRef.current = true;
    
    if (isAudioEnabled) {
        soundService.playTransition().catch(e => console.error("Audio error:", e));
    }

    // Disperse force
    particlesRef.current.forEach(p => {
        const angle = Math.random() * Math.PI * 2;
        const force = Math.random() * 25;
        p.vx += Math.cos(angle) * force;
        p.vy += Math.sin(angle) * force;
    });

    // Re-target after a cinematic delay
    setTimeout(() => {
        particlesRef.current.forEach((p, i) => {
            const pt = points[i % points.length];
            p.tx = pt.x + (Math.random() - 0.5) * 4;
            p.ty = pt.y + (Math.random() - 0.5) * 4;
        });
        
        setTimeout(() => {
            isTransitioningRef.current = false;
        }, 1200);
    }, 600);
  };

  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = rect.height * dpr;
      canvasRef.current.style.width = `${rect.width}px`;
      canvasRef.current.style.height = `${rect.height}px`;
      
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      
      initParticles();
    };

    // Wait for fonts to be ready to ensure sampleNumberPoints works
    let fontTimeout = setTimeout(() => {
        handleResize();
    }, 1000); // 1s fallback

    if (document.fonts) {
      document.fonts.ready.then(() => {
        clearTimeout(fontTimeout);
        handleResize();
      }).catch(() => {
        clearTimeout(fontTimeout);
        handleResize();
      });
    } else {
      clearTimeout(fontTimeout);
      handleResize();
    }

    window.addEventListener('resize', handleResize);

    const animate = () => {
      if (!canvasRef.current || !containerRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const cssWidth = rect.width;
      const cssHeight = rect.height;

      // Clear
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.fillStyle = '#020617'; // navy-950
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      // Smooth camera drift
      viewOffsetRef.current.x += (targetViewOffsetRef.current.x - viewOffsetRef.current.x) * 0.05;
      viewOffsetRef.current.y += (targetViewOffsetRef.current.y - viewOffsetRef.current.y) * 0.05;

      const centerX = cssWidth / 2;
      const centerY = cssHeight / 2;

      // Draw Ambient Particles first (backmost)
      ambientRef.current.forEach(ap => {
          ap.update(cssWidth, cssHeight);
          ap.draw(ctx);
      });

      // Bloom/Glow setup
      ctx.globalCompositeOperation = 'lighter';

      particlesRef.current.forEach(p => {
        p.update(
            mouseRef.current.x, 
            mouseRef.current.y, 
            isTransitioningRef.current, 
            centerX, 
            centerY,
            viewOffsetRef.current.x,
            viewOffsetRef.current.y
        );
        p.draw(ctx);
      });
      
      ctx.globalCompositeOperation = 'source-over';

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountDisplay(prev => {
        const next = prev > 1 ? prev - 1 : 10;
        updateNumber(next.toString());
        return next;
      });
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    let x, y;
    if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }
    
    mouseRef.current = { x, y };

    // Set camera drift
    const driftStrength = 20;
    targetViewOffsetRef.current = {
        x: ((x / rect.width) - 0.5) * driftStrength,
        y: ((y / rect.height) - 0.5) * driftStrength
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current = { x: -1000, y: -1000 };
    targetViewOffsetRef.current = { x: 0, y: 0 };
  };

  const handleStart = () => {
    setIsAudioEnabled(true);
    soundService.playTransition().catch(e => console.error("Audio error:", e));
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-navy-950 flex items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={!isAudioEnabled ? handleStart : undefined}
    >
      <canvas 
        ref={canvasRef}
        className={`w-full h-full cursor-none transition-opacity duration-2000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Start Experience Overlay */}
      {!isAudioEnabled && isLoaded && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm transition-opacity duration-1000 animate-in fade-in">
            <button 
                onClick={handleStart}
                className="group relative flex flex-col items-center gap-4 cursor-pointer"
            >
                <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:border-blue-400 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                    <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                </div>
                <span className="font-display text-[10px] tracking-[0.5em] text-white/40 uppercase group-hover:text-blue-400 transition-colors">Begin Experience</span>
            </button>
        </div>
      )}
      
      {/* Cinematic HUD */}
      <div className="absolute inset-0 pointer-events-none p-12 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="font-display text-xs tracking-[0.4em] text-white/40 uppercase">System Status</span>
            <span className="font-sans text-[10px] tracking-widest text-blue-400 uppercase">Kinetic Matrix Active</span>
          </div>
          <div className="text-right">
             <span className="font-display text-xs tracking-[0.4em] text-white/40 uppercase">Visual Core</span>
             <br/>
             <span className="font-sans text-[10px] tracking-widest text-white/20 uppercase">v2.0.4-α</span>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="flex flex-col max-w-sm">
            <h1 className="font-display text-4xl font-extralight tracking-[0.25em] text-white/90 leading-none">
              FLUX TEN
            </h1>
            <p className="mt-4 font-sans text-[10px] leading-relaxed tracking-[0.1em] text-white/30 uppercase max-w-64">
              A generative particle simulation exploring the intersection of geometry and motion.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
                <span className="text-white/60 font-mono text-sm tabular-nums">00:{countDisplay < 10 ? `0${countDisplay}` : countDisplay}</span>
                <span className="text-[9px] tracking-widest text-white/20 uppercase">Sync-Freq</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.4)_100%)] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
    </div>
  );
};

export default ParticleCanvas;
