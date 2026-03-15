import React, { useEffect, useRef, useState } from 'react';

// ==========================================
// CONFIGURACIÓN DE IMÁGENES
// Puedes cambiar estas URLs por las rutas de tus propias imágenes
// Ejemplo: player: '/assets/mi_perro.png'
// ==========================================
const IMAGE_URLS = {
  player: '/perro chef.svg',
  bill: '/dinero.svg',
  customer1: '/cliente 1.svg',
  customer2: '/cliente 2.svg',
  ball: '/pelota.svg',
  toy: '/hueso.svg',
  house1: '/casa 1.svg',
  house2: '/casa 2.svg',
  menu: '/MENU PERRO CHEF/MENU PERRO CHEF.svg',
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
      // El punto real en la pista es (distance - y)
      const trackPos = distance - y;
      
      // Curvas variables entre 20° y 50°
      // Combinación de senos para curvas pronunciadas e impredecibles
      const curve1 = Math.sin(trackPos * 0.012) * 35;
      const curve2 = Math.sin(trackPos * 0.018) * 18;
      const curve3 = Math.sin(trackPos * 0.025) * 7;
      
      return 200 + curve1 + curve2 + curve3;
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

    const handleTouch = (e: TouchEvent) => {
      if (state.screen !== 'PLAYING') return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      if (!touch) return;

      const tx = ((touch.clientX - rect.left) / rect.width) * 400;
      const ty = ((touch.clientY - rect.top) / rect.height) * 600;

      // Move towards touch
      const dx = tx - (state.player.x + state.player.width / 2);
      const dy = ty - (state.player.y + state.player.height / 2);

      keys.a = dx < -20;
      keys.d = dx > 20;
      keys.w = dy < -20;
      keys.s = dy > 20;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      keys.a = keys.d = keys.w = keys.s = false;
      if (state.screen === 'START' || state.screen === 'GAMEOVER') {
        e.preventDefault();
        resetGame();
        state.screen = 'PLAYING';
      }
    };

    const handleCanvasClick = (e: MouseEvent) => {
      if (state.screen === 'START' || state.screen === 'GAMEOVER') {
        e.preventDefault();
        resetGame();
        state.screen = 'PLAYING';
      }
    };

    const handleActionBtn = (e: Event) => {
      e.preventDefault();
      if (state.screen === 'START' || state.screen === 'GAMEOVER') {
        resetGame();
        state.screen = 'PLAYING';
      } else if (state.screen === 'PLAYING' && !state.player.isJumping) {
        state.player.isJumping = true;
        state.player.jumpTimer = 0.5;
        checkDelivery();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', handleCanvasClick);
    
    const actionBtn = document.getElementById('action-btn');
    if (actionBtn) {
      actionBtn.addEventListener('touchstart', handleActionBtn, { passive: false });
      actionBtn.addEventListener('mousedown', handleActionBtn);
    }

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
          delivered: false,
          customerType: Math.random() < 0.5 ? 'customer1' : 'customer2',
          houseType: Math.random() < 0.5 ? 'house1' : 'house2'
        });
      }
    };

    const update = (dt: number) => {
      if (state.screen !== 'PLAYING') return;

      let vx = 0;
      let vy = 0;
      if (keys.w) vy = -250;
      else if (keys.s) vy = 250;
      if (keys.a) vx = -350;
      else if (keys.d) vx = 350;

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
      const segmentHeight = 10;
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
        ctx.drawImage(imgs[customer.houseType], houseX, customer.y - 10, 60, 60);
        
        // Customer
        ctx.drawImage(imgs[customer.customerType], customer.x, customer.y, customer.width, customer.height);
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
        if (imgs.menu) {
          // Draw the menu image covering the canvas
          // The image is 1080x1920 (9:16), canvas is 400x600 (2:3)
          // To cover the canvas without stretching, we can calculate dimensions
          const imgAspect = 1080 / 1920;
          const canvasAspect = 400 / 600;
          let drawWidth = 400;
          let drawHeight = 600;
          let offsetX = 0;
          let offsetY = 0;
          
          if (canvasAspect > imgAspect) {
            // Canvas is wider than image
            drawWidth = 400;
            drawHeight = 400 / imgAspect;
            offsetY = (600 - drawHeight) / 2;
          } else {
            // Canvas is taller than image
            drawHeight = 600;
            drawWidth = 600 * imgAspect;
            offsetX = (400 - drawWidth) / 2;
          }
          
          ctx.drawImage(imgs.menu, offsetX, offsetY, drawWidth, drawHeight);
        } else {
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
        }
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
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('touchmove', handleTouch);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleCanvasClick);
      if (actionBtn) {
        actionBtn.removeEventListener('touchstart', handleActionBtn);
        actionBtn.removeEventListener('mousedown', handleActionBtn);
      }
    };
  }, [imagesLoaded]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      canvasRef.current?.parentElement?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  if (!imagesLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-900 text-white font-mono">
        Loading assets...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 p-4">
      <div className="mb-4 flex flex-col items-center gap-2">
        <div className="text-zinc-400 text-xs max-w-md text-center">
          WASD/Touch para mover. SPACE/Tap para saltar y entregar.
        </div>
        <button 
          onClick={toggleFullscreen}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-sm font-medium transition-colors border border-zinc-700 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
          Pantalla Completa
        </button>
      </div>
      <div className="relative w-full max-w-[400px] aspect-[2/3]">
        <canvas
          ref={canvasRef}
          width={400}
          height={600}
          className="w-full h-full border-4 border-zinc-700 rounded-lg shadow-2xl bg-zinc-800 touch-none"
        />
      </div>
      <div className="mt-4 w-full max-w-[400px]">
        <button
          id="action-btn"
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xl rounded-xl shadow-lg touch-manipulation uppercase tracking-wider select-none"
        >
          Entregar / Saltar
        </button>
      </div>
    </div>
  );
}
