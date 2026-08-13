/**
 * AppexQuant Markets Global - Phase 3 Cinematic Background
 * Subtle ambient motion background with particle field & ice-blue pulse effects.
 */

import React, { useEffect, useRef } from 'react';

export const CinematicBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particles for subtle ambient grid
    const isMobile = width < 768;
    const particleCount = isMobile ? 18 : 35;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      radius: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.3 + 0.1,
    }));

    let pulseAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Subtle ambient gradient background glow
      pulseAngle += 0.005;
      const pulseOpacity = 0.03 + Math.sin(pulseAngle) * 0.015;

      const gradient = ctx.createRadialGradient(
        width * 0.5,
        height * 0.3,
        10,
        width * 0.5,
        height * 0.3,
        Math.max(width, height) * 0.7
      );
      gradient.addColorStop(0, `rgba(56, 189, 248, ${pulseOpacity})`); // Ice blue
      gradient.addColorStop(0.6, 'rgba(11, 14, 20, 0)');
      gradient.addColorStop(1, 'rgba(11, 14, 20, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Render floating subtle particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-60"
      aria-hidden="true"
    />
  );
};
