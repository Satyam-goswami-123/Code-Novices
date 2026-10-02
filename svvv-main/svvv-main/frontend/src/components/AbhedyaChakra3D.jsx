import React, { useEffect, useRef } from 'react';

export default function AbhedyaChakra3D() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width, height;
    let animationFrameId;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', resize);
    resize();

    // Generate Nodes
    const nodes = [];
    
    // 1. Central Core
    nodes.push({ r: 0, angle: 0, radius: 18, color: '#ffffff', glow: '#38bdf8', layer: 0 });

    // 2. Inner cyan ring
    const numInner = 16;
    for (let i = 0; i < numInner; i++) {
      const angle = (i / numInner) * Math.PI * 2;
      nodes.push({ r: 70, angle, radius: 6, color: '#22d3ee', glow: '#06b6d4', layer: 1 });
    }

    // 3. Middle blue ring
    const numMiddle = 24;
    for (let i = 0; i < numMiddle; i++) {
      const angle = (i / numMiddle) * Math.PI * 2;
      nodes.push({ r: 120, angle, radius: 4, color: '#3b82f6', glow: '#2563eb', layer: 2 });
    }

    // 4. Outer purple ring
    const numOuter = 24;
    for (let i = 0; i < numOuter; i++) {
      const angle = (i / numOuter) * Math.PI * 2;
      // We align outer nodes with some middle nodes to draw beams
      nodes.push({ r: 180, angle, radius: 9, color: '#a855f7', glow: '#9333ea', layer: 3 });
    }

    // Generate background particle grid (the web)
    const bgParticles = [];
    for (let i = 0; i < 150; i++) {
      bgParticles.push({
        x: (Math.random() - 0.5) * 800,
        y: (Math.random() - 0.5) * 800,
        z: (Math.random() - 0.5) * 400 - 200,
        size: Math.random() * 2
      });
    }

    let time = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let rotX = 0;
    let rotY = 0;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - width / 2;
      const y = e.clientY - rect.top - height / 2;
      targetRotY = (x / width) * 1.5; 
      targetRotX = (y / height) * 1.5; 
    };
    canvas.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      time += 0.003; // Rotation speed
      
      rotX += (targetRotX - rotX) * 0.05;
      rotY += (targetRotY - rotY) * 0.05;

      const baseRotZ = time;
      const tiltX = Math.PI / 3.5 + rotX; // Flatter tilt
      const tiltY = rotY;

      // Dark space background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);
      
      ctx.save();
      ctx.translate(width / 2, height / 2);

      // --- Draw Background Particles ---
      ctx.fillStyle = '#1e293b';
      bgParticles.forEach(p => {
        let y1 = p.y * Math.cos(tiltX) - p.z * Math.sin(tiltX);
        let z1 = p.y * Math.sin(tiltX) + p.z * Math.cos(tiltX);
        let x2 = p.x * Math.cos(tiltY) + z1 * Math.sin(tiltY);
        let z2 = -p.x * Math.sin(tiltY) + z1 * Math.cos(tiltY);
        const scale = 400 / (400 + z2);
        if (scale > 0) {
          ctx.beginPath();
          ctx.arc(x2 * scale, y1 * scale, p.size * scale, 0, Math.PI*2);
          ctx.fill();
        }
      });

      // --- Project 3D Nodes ---
      const projectedNodes = nodes.map((n) => {
        if (n.layer === 0) return { ...n, px: 0, py: 0, scale: 1, z: 0 };

        // Rotation directions alternating
        const spin = n.layer % 2 === 0 ? baseRotZ : -baseRotZ;
        
        let x = n.r * Math.cos(n.angle + spin);
        let y = n.r * Math.sin(n.angle + spin);
        let z = Math.sin(n.angle * 4 + time * 10) * 8; // slight wave

        let y1 = y * Math.cos(tiltX) - z * Math.sin(tiltX);
        let z1 = y * Math.sin(tiltX) + z * Math.cos(tiltX);

        let x2 = x * Math.cos(tiltY) + z1 * Math.sin(tiltY);
        let z2 = -x * Math.sin(tiltY) + z1 * Math.cos(tiltY);

        const focalLength = 400;
        const scale = focalLength / (focalLength + z2);
        
        return { ...n, px: x2 * scale, py: y1 * scale, scale, z: z2 };
      });

      projectedNodes.sort((a, b) => b.z - a.z);

      // --- Draw Concentric Rings ---
      const drawRing = (r, color, dash = []) => {
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * Math.cos(tiltX), 0, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        if (dash.length > 0) ctx.setLineDash(dash);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      
      // We must rotate the context to match tilt/pan for rings if we want true 3D rings,
      // but simple ellipses work perfectly for the specific 3D look.
      drawRing(70, 'rgba(34, 211, 238, 0.4)');
      drawRing(100, 'rgba(56, 189, 248, 0.2)', [4, 4]); // Dotted inner
      drawRing(120, 'rgba(59, 130, 246, 0.3)');
      drawRing(180, 'rgba(168, 85, 247, 0.4)');
      drawRing(195, 'rgba(147, 51, 234, 0.15)', [2, 6]); // Outer scattered

      // --- Draw Beams (Orange) ---
      const core = projectedNodes.find(n => n.layer === 0);
      const outerNodes = projectedNodes.filter(n => n.layer === 3);
      
      if (core) {
        // Draw straight orange rays from core to outer nodes
        outerNodes.forEach((outNode, i) => {
          if (i % 2 === 0) { // Don't draw to every single node to avoid clutter
            ctx.beginPath();
            ctx.moveTo(core.px, core.py);
            ctx.lineTo(outNode.px, outNode.py);
            ctx.strokeStyle = `rgba(251, 146, 60, ${0.4 * outNode.scale})`; // Orange beam
            ctx.lineWidth = 2 * outNode.scale;
            ctx.stroke();
          }
        });

        // Blue rays to inner nodes
        const innerNodes = projectedNodes.filter(n => n.layer === 1);
        innerNodes.forEach((innNode) => {
          ctx.beginPath();
          ctx.moveTo(core.px, core.py);
          ctx.lineTo(innNode.px, innNode.py);
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.3 * innNode.scale})`; 
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      // --- Draw Nodes ---
      projectedNodes.forEach(n => {
        const r = n.radius * n.scale;
        
        ctx.beginPath();
        ctx.arc(n.px, n.py, r, 0, Math.PI * 2);
        
        ctx.shadowBlur = (n.layer === 0 ? 40 : 15) * n.scale;
        ctx.shadowColor = n.glow;
        ctx.fillStyle = n.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Add specular highlight for glass effect
        if (n.layer !== 0) {
          ctx.beginPath();
          ctx.arc(n.px - r*0.3, n.py - r*0.3, r*0.3, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fill();
        }
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: '8px', background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', cursor: 'crosshair' }} />
      
      {/* HUD Elements overlay */}
      <div style={{ position: 'absolute', top: 16, left: 20, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)'}}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: 1 }}>ABHEDYA CHAKRA CORE</h3>
        <span style={{ fontSize: 12, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 2 }}>Quantum Threat Matrix</span>
      </div>
      
      <div style={{ position: 'absolute', bottom: 16, right: 20, color: '#94a3b8', fontSize: 10, textAlign: 'right', fontFamily: 'monospace' }}>
        SYS.STATUS: <span style={{color: '#22c55e'}}>ONLINE</span><br/>
        ORBITAL SYNC: 100%<br/>
        HOVER TO CALIBRATE
      </div>
    </div>
  );
}
