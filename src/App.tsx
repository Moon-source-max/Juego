import React, { useEffect, useRef, useState } from 'react';

// ==========================================
// CONFIGURACIÓN DE IMÁGENES
// Puedes cambiar estas URLs por las rutas de tus propias imágenes
// Ejemplo: player: '/assets/mi_perro.png'
// ==========================================
const IMAGE_URLS = {
  player: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50"><rect x="10" y="20" width="20" height="30" fill="%23d2b48c" rx="5"/><circle cx="20" cy="20" r="12" fill="%23d2b48c"/><rect x="10" y="0" width="20" height="15" fill="white" rx="2"/><circle cx="15" cy="18" r="2" fill="black"/><circle cx="25" cy="18" r="2" fill="black"/><path d="M 18 22 Q 20 25 22 22" stroke="black" fill="transparent"/></svg>',
  bill: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 15"><rect width="30" height="15" fill="%2322c55e" rx="2"/><rect x="2" y="2" width="26" height="11" fill="%2316a34a" rx="1"/><text x="15" y="11" font-size="10" font-family="Arial" font-weight="bold" fill="white" text-anchor="middle">$</text></svg>',
  customer: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="25" r="15" fill="%238b5a2b"/><circle cx="14" cy="20" r="3" fill="black"/><circle cx="26" cy="20" r="3" fill="black"/><path d="M 15 30 Q 20 35 25 30" stroke="black" fill="transparent" stroke-width="2"/><path d="M 5 10 Q 10 0 15 10" fill="%238b5a2b"/><path d="M 35 10 Q 30 0 25 10" fill="%238b5a2b"/></svg>',
  ball: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="%23ef4444"/><circle cx="12" cy="12" r="4" fill="white" opacity="0.3"/></svg>',
  toy: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20"><rect x="10" y="5" width="20" height="10" fill="%23facc15"/><circle cx="10" cy="5" r="5" fill="%23facc15"/><circle cx="10" cy="15" r="5" fill="%23facc15"/><circle cx="30" cy="5" r="5" fill="%23facc15"/><circle cx="30" cy="15" r="5" fill="%23facc15"/></svg>',
  house: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><rect x="5" y="20" width="50" height="35" fill="%234b5563"/><path d="M 0 25 L 30 0 L 60 25 Z" fill="%23991b1b"/><rect x="25" y="35" width="10" height="20" fill="%231f2937"/><rect x="10" y="30" width="10" height="10" fill="%2393c5fd"/></svg>',
};

const PALETTE: Record<string, string> = {
  W: '#ffffff',
  B: '#000000',
  R: '#ef4444',
  O: '#f97316',
  G: '#9ca3af',
  Y: '#facc15',
  T: '#b45309',
  F: '#e5e7eb',
  C: '#d2b48c',
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    let loadedCount = 0;
    const totalImages = Object.keys(IMAGE_URLS).length;
    
    for (const [key, url] of Object.entries(IMAGE_URLS)) {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
      img.src = url;
      imagesRef.current[key] = img;
    }
  }, []);

  useEffect(() => {
    if (!imagesLoaded) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const keys = { w: false, a: false, s: false, d: false, space: false };
    const imgs = imagesRef.current;

    const getRoadCenterX = (y: number, distance: number) => {
      // Curva fluida pero contenida para que la calle siempre esté centrada y visible
      // Reducimos la amplitud a 40 para que el complejo de la calle no se salga de los 400px del canvas
      const fluidCurve = Math.sin((distance - y) * 0.0007) * 40;
      const slowVariation = Math.sin(distance * 0.0002) * 10;
      return 200 + fluidCurve + slowVariation;
    };

    const state = {
      screen: 'START',
      score: 0,
      energy: 100,
      satisfaction: 50,
      speed: 0,
      distance: 0,
      player: { x: 180, y: 450, width: 40, height: 50, isJumping: false, jumpTimer: 0 },
      obstacles: [] as any[], // Balls and Toys
      bills: [] as any[], // Boosts
      customers: [] as any[], // Delivery targets
      particles: [] as any[],
      spawnTimer: 0
    };

    const resetGame = () => {
      state.score = 0;
      state.energy = 100;
      state.satisfaction = 50;
      state.distance = 0;
      state.player = { x: 180, y: 450, width: 40, height: 50, isJumping: false, jumpTimer: 0 };
      state.obstacles = [];
      state.bills = [];
      state.customers = [];
      state.particles = [];
      state.spawnTimer = 0;
    };

    const createParticles = (x: number, y: number, color: string, count: number = 5, text?: string) => {
      if (text) {
        state.particles.push({ x, y, vx: 0, vy: -50, life: 1, color, text });
        return;
      }
      for (let i = 0; i < count; i++) {
        state.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 200,
          vy: (Math.random() - 0.5) * 200,
          life: 0.5 + Math.random() * 0.5,
          color
        });
      }
    };

    const checkDelivery = () => {
      for (let customer of state.customers) {
        if (!customer.delivered) {
          const py = state.player.y + state.player.height / 2;
          const cy = customer.y + customer.height / 2;
          if (Math.abs(py - cy) < 80) {
            const playerRelX = state.player.x - getRoadCenterX(state.player.y, state.distance);
            
            // Ajustado a los nuevos anchos de calle
            if ((customer.side === 'left' && playerRelX < -40) ||
                (customer.side === 'right' && playerRelX > 0)) {
              customer.delivered = true;
              state.score += 500;
              state.satisfaction = Math.min(100, state.satisfaction + 20);
              createParticles(customer.x + 20, customer.y + 20, 'Y', 10);
              createParticles(customer.x, customer.y, 'Y', 0, '+500');
              createParticles(customer.x, customer.y - 20, 'R', 0, 'YUM!');
            }
          }
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', ' ', 'enter'].includes(key)) {
        if (key !== 'enter' && key !== ' ') e.preventDefault();
      }
      if (key === 'w') keys.w = true;
      if (key === 'a') keys.a = true;
      if (key === 's') keys.s = true;
      if (key === 'd') keys.d = true;
      if (key === ' ') {
        if (!keys.space && state.screen === 'PLAYING' && !state.player.isJumping) {
          state.player.isJumping = true;
          state.player.jumpTimer = 0.5;
          checkDelivery();
        }
        keys.space = true;
      }
      if (key === 'enter') {
        if (state.screen === 'START' || state.screen === 'GAMEOVER') {
          resetGame();
          state.screen = 'PLAYING';
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') keys.w = false;
      if (key === 'a') keys.a = false;
      if (key === 's') keys.s = false;
      if (key === 'd') keys.d = false;
      if (key === ' ') keys.space = false;
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);

    const checkCollision = (r1: any, r2: any) => {
      const margin = 5;
      return r1.x + margin < r2.x + r2.width - margin &&
             r1.x + r1.width - margin > r2.x + margin &&
             r1.y + margin < r2.y + r2.height - margin &&
             r1.y + r1.height - margin > r2.y + margin;
    };

    const spawnEntity = () => {
      const rand = Math.random();
      if (rand < 0.5) {
        // Spawn Obstacle (Ball or Toy)
        const isBall = Math.random() < 0.5;
        state.obstacles.push({
          relX: -70 + Math.random() * 140,
          y: -50,
          width: isBall ? 30 : 40,
          height: isBall ? 30 : 20,
          type: isBall ? 'ball' : 'toy'
        });
      } else if (rand < 0.75) {
        // Spawn Bill (Boost)
        state.bills.push({
          relX: -70 + Math.random() * 140,
          y: -50,
          width: 30,
          height: 15
        });
      } else {
        // Spawn Customer Dog next to a House
        const side = Math.random() < 0.5 ? 'left' : 'right';
        state.customers.push({
          relX: side === 'left' ? -120 : 80,
          y: -50,
          width: 40,
          height: 40,
          side: side,
          delivered: false
        });
      }
    };

    const update = (dt: number) => {
      if (state.screen !== 'PLAYING') return;

      let vx = 0;
      let vy = 0;
      if (keys.w) vy = -250;
      else if (keys.s) vy = 250;
      if (keys.a) vx = -250;
      else if (keys.d) vx = 250;

      state.player.x += vx * dt;
      state.player.y += vy * dt;

      const roadCX = getRoadCenterX(state.player.y, state.distance);
      state.player.x = Math.max(roadCX - 80, Math.min(state.player.x, roadCX + 80 - state.player.width));
      state.player.y = Math.max(50, Math.min(state.player.y, 550 - state.player.height));

      const speedBonus = Math.floor(state.score / 1000) * 40;
      state.speed = 100 + ((550 - state.player.y) / 500) * 300 + speedBonus;

      // Energy depletes over time based on speed
      state.energy -= (2 + state.speed * 0.01) * dt;
      
      // Satisfaction depletes slowly over time
      state.satisfaction -= 2 * dt;

      if (state.energy <= 0 || state.satisfaction <= 0) {
        state.screen = 'GAMEOVER';
      }

      state.distance += state.speed * dt;
      state.score += state.speed * dt * 0.05;

      if (state.player.isJumping) {
        state.player.jumpTimer -= dt;
        if (state.player.jumpTimer <= 0) {
          state.player.isJumping = false;
        }
      }

      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnTimer = 0.4 + Math.random() * 0.8;
        spawnEntity();
      }

      // Update Obstacles (Balls and Toys)
      for (let i = state.obstacles.length - 1; i >= 0; i--) {
        let obstacle = state.obstacles[i];
        obstacle.y += state.speed * dt;
        obstacle.x = getRoadCenterX(obstacle.y, state.distance) + obstacle.relX;

        if (obstacle.y > 650) {
          state.obstacles.splice(i, 1);
          continue;
        }

        if (!state.player.isJumping && checkCollision(state.player, obstacle)) {
          state.player.y += 50;
          state.energy -= 10;
          createParticles(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2, 'O', 10);
          state.obstacles.splice(i, 1);
          if (state.energy <= 0) state.screen = 'GAMEOVER';
        }
      }

      // Update Bills (Boosts)
      for (let i = state.bills.length - 1; i >= 0; i--) {
        let bill = state.bills[i];
        bill.y += state.speed * dt;
        bill.x = getRoadCenterX(bill.y, state.distance) + bill.relX;
        if (bill.y > 650) {
          state.bills.splice(i, 1);
          continue;
        }
        if (!state.player.isJumping && checkCollision(state.player, bill)) {
          state.energy = Math.min(100, state.energy + 15);
          state.score += 100;
          createParticles(bill.x + 15, bill.y + 7, 'W', 8);
          createParticles(bill.x, bill.y, 'W', 0, '+$');
          state.bills.splice(i, 1);
        }
      }

      // Update Customers
      for (let i = state.customers.length - 1; i >= 0; i--) {
        let customer = state.customers[i];
        customer.y += state.speed * dt;
        customer.x = getRoadCenterX(customer.y, state.distance) + customer.relX;
        if (customer.y > 650) {
          if (!customer.delivered) {
            // Penalty for missing a customer
            state.satisfaction -= 5;
          }
          state.customers.splice(i, 1);
          continue;
        }
      }

      // Update Particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        let p = state.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) state.particles.splice(i, 1);
      }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      // Background (Grass)
      ctx.fillStyle = '#166534';
      ctx.fillRect(0, 0, 400, 600);

      // Road and Sidewalks (Smoother rendering with smaller segments)
      const segmentHeight = 20;
      for (let row = -2; row < 600 / segmentHeight + 2; row++) {
        const y = (row * segmentHeight) + (state.distance % segmentHeight);
        const cx = getRoadCenterX(y, state.distance);
        
        // Sidewalks
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(cx - 110, y, 220, segmentHeight);

        // Road (Asphalt)
        ctx.fillStyle = '#374151';
        ctx.fillRect(cx - 80, y, 160, segmentHeight);

        // Road Lines (Dashed)
        // Only draw lines every few segments to maintain dashed look
        if (Math.floor(row / 3) % 2 === 0) {
          ctx.fillStyle = '#facc15';
          ctx.fillRect(cx - 2, y, 4, segmentHeight);
        }
      }

      // Draw Customers and Houses
      for (let customer of state.customers) {
        // House
        const houseX = customer.side === 'left' ? customer.x - 60 : customer.x + 40;
        ctx.drawImage(imgs.house, houseX, customer.y - 10, 60, 60);
        
        // Customer
        ctx.drawImage(imgs.customer, customer.x, customer.y, customer.width, customer.height);
        if (customer.delivered) {
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText("✓", customer.x + 15, customer.y - 5);
        } else {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText("!", customer.x + 15, customer.y - 5);
        }
      }

      // Draw Bills
      for (let bill of state.bills) {
        ctx.drawImage(imgs.bill, bill.x, bill.y, bill.width, bill.height);
      }

      // Draw Obstacles (Balls and Toys)
      for (let obstacle of state.obstacles) {
        const img = obstacle.type === 'ball' ? imgs.ball : imgs.toy;
        ctx.drawImage(img, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      }

      // Draw Player
      let py = state.player.y;
      let pw = state.player.width;
      let ph = state.player.height;
      
      if (state.player.isJumping) {
        py -= 15;
        pw += 4;
        ph += 5;
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(state.player.x + state.player.width/2, state.player.y + state.player.height - 5, 15, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.drawImage(imgs.player, state.player.x - (pw - state.player.width)/2, py, pw, ph);

      // Draw Particles
      for (let p of state.particles) {
        if (p.text) {
          ctx.fillStyle = PALETTE[p.color] || p.color;
          ctx.font = 'bold 16px sans-serif';
          ctx.globalAlpha = p.life;
          ctx.fillText(p.text, p.x, p.y);
          ctx.globalAlpha = 1.0;
        } else {
          ctx.fillStyle = PALETTE[p.color] || p.color;
          ctx.globalAlpha = p.life * 2;
          ctx.fillRect(p.x, p.y, 6, 6);
          ctx.globalAlpha = 1.0;
        }
      }

      // UI Top Bar
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, 400, 60);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillText(`SCORE: ${Math.floor(state.score)}`, 10, 25);
      ctx.fillText(`LEVEL: ${Math.floor(state.score / 1000) + 1}`, 10, 45);

      // Energy Bar
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(250, 10, 100, 12);
      ctx.fillStyle = '#3b82f6'; // Blue for energy
      ctx.fillRect(250, 10, Math.max(0, state.energy), 12);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(250, 10, 100, 12);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText("ENERGY", 200, 20);

      // Satisfaction Bar
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(250, 35, 100, 12);
      ctx.fillStyle = '#10b981'; // Green for satisfaction
      ctx.fillRect(250, 35, Math.max(0, state.satisfaction), 12);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(250, 35, 100, 12);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText("HAPPY", 205, 45);

      // Screens
      if (state.screen === 'START') {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, 400, 600);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.fillText("DOGGY DELIVERY: STREET RUSH", 200, 250);
        ctx.font = '16px "Courier New", monospace';
        ctx.fillText("WASD to move", 200, 300);
        ctx.fillText("SPACE to jump & deliver orders", 200, 330);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText("Press ENTER to start", 200, 400);
        ctx.textAlign = 'left';
      } else if (state.screen === 'GAMEOVER') {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, 400, 600);
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.font = 'bold 32px "Courier New", monospace';
        ctx.fillText("GAME OVER", 200, 250);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.fillText(`FINAL SCORE: ${Math.floor(state.score)}`, 200, 300);
        
        if (state.satisfaction <= 0) {
          ctx.fillStyle = '#ef4444';
          ctx.font = '16px "Courier New", monospace';
          ctx.fillText("Customers got too angry!", 200, 340);
        } else if (state.energy <= 0) {
          ctx.fillStyle = '#ef4444';
          ctx.font = '16px "Courier New", monospace';
          ctx.fillText("You ran out of energy!", 200, 340);
        }

        ctx.fillStyle = '#fbbf24';
        ctx.font = '16px "Courier New", monospace';
        ctx.fillText("Press ENTER to restart", 200, 400);
        ctx.textAlign = 'left';
      }
    };

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      update(dt);
      draw(ctx);
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [imagesLoaded]);

  if (!imagesLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-900 text-white font-mono">
        Loading assets...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900">
      <div className="mb-4 text-zinc-400 text-sm max-w-md text-center">
        Las imágenes se cargan desde URLs configurables en el código. Puedes modificarlas editando el objeto <code className="bg-zinc-800 px-1 rounded">IMAGE_URLS</code> en <code className="bg-zinc-800 px-1 rounded">App.tsx</code>.
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={600}
        className="border-4 border-zinc-700 rounded-lg shadow-2xl bg-zinc-800"
      />
    </div>
  );
}
