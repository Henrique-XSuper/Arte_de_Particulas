(() => {
  const cvs = document.getElementById('c');
  const ctx = cvs.getContext('2d');
  const off = document.createElement('canvas');
  const octx = off.getContext('2d');

  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let W=0, H=0;
  function resize(){
    W = cvs.width  = Math.floor(innerWidth  * DPR);
    H = cvs.height = Math.floor(innerHeight * DPR);
    cvs.style.width  = innerWidth + 'px';
    cvs.style.height = innerHeight + 'px';
  }
  addEventListener('resize', resize, {passive:true}); 
  resize();

  const mouse = {x:0, y:0, down:false};
  cvs.addEventListener('pointermove', e => {
    const rect = cvs.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * DPR;
    mouse.y = (e.clientY - rect.top) * DPR;
  });
  cvs.addEventListener('pointerdown', () => mouse.down = true);
  addEventListener('pointerup', () => mouse.down = false);

  const particles = [];
  const CFG = {
    gap: 6 * DPR,
    size: 2.2 * DPR,
    attract: 0.08,
    repel: 110 * DPR,
    friction: 0.86,
    glow: true
  };

  class P {
    constructor(x, y){
      this.x = Math.random()*W; 
      this.y = Math.random()*H;
      this.tx = x; 
      this.ty = y;
      this.vx = 0; 
      this.vy = 0;
      this.h = (Math.atan2(y-H/2, x-W/2) * 180/Math.PI + 360) % 360;
    }
    step(){
      const dx = this.tx - this.x, dy = this.ty - this.y;
      this.vx += dx * CFG.attract;
      this.vy += dy * CFG.attract;

      const mx = this.x - mouse.x, my = this.y - mouse.y;
      const md2 = mx*mx + my*my;
      const r2 = (CFG.repel*CFG.repel);
      if (md2 < r2) {
        const f = (1 - md2 / r2);
        this.vx += (mx) * f * 0.9;
        this.vy += (my) * f * 0.9;
      }

      this.vx *= CFG.friction;
      this.vy *= CFG.friction;
      this.x += this.vx * 0.016;
      this.y += this.vy * 0.016;
    }
    draw(){
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 10*DPR);
      g.addColorStop(0, `hsla(${this.h},100%,70%,.95)`);
      g.addColorStop(1, `hsla(${(this.h+40)%360},100%,50%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.x, this.y, CFG.size, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function toParticlesFromText(t){
    const fontSize = Math.min(W, H) * 0.22;
    off.width = Math.ceil(W); 
    off.height = Math.ceil(H);
    octx.clearRect(0,0,off.width, off.height);
    octx.fillStyle = '#fff';
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.font = `bold ${fontSize}px Inter, system-ui, Arial, sans-serif`;
    octx.fillText(t, off.width/2, off.height/2);
    return samplePoints();
  }

  function toParticlesFromShape(kind){
    const s = Math.min(W,H)*0.28;
    off.width = Math.ceil(W); 
    off.height = Math.ceil(H);
    octx.clearRect(0,0,off.width, off.height);
    octx.fillStyle = '#fff';
    octx.translate(W/2, H/2);

    if(kind==='heart'){
      octx.beginPath();
      for(let a=0;a<Math.PI*2;a+=0.01){
        const x = 16*Math.pow(Math.sin(a),3);
        const y = -(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a));
        octx.lineTo(x*s/22, y*s/22);
      }
      octx.closePath(); 
      octx.fill();
    } else if(kind==='star'){
      const spikes=5, outer=s*.55, inner=s*.22;
      let rot=Math.PI/2*3, x=0, y=0, step=Math.PI/spikes;
      octx.beginPath(); 
      octx.moveTo(0,-outer);
      for(let i=0;i<spikes;i++){
        x=Math.cos(rot)*outer; 
        y=Math.sin(rot)*outer; 
        octx.lineTo(x,y); 
        rot+=step;
        x=Math.cos(rot)*inner; 
        y=Math.sin(rot)*inner; 
        octx.lineTo(x,y); 
        rot+=step;
      }
      octx.lineTo(0,-outer); 
      octx.closePath(); 
      octx.fill();
    }
    octx.setTransform(1,0,0,1,0,0);
    return samplePoints();
  }

  function samplePoints(){
    const {width, height} = off;
    const pts=[];
    const img = octx.getImageData(0,0,width,height).data;
    for(let y=0; y<height; y+=CFG.gap){
      for(let x=0; x<width; x+=CFG.gap){
        const idx = (x + y*width)*4 + 3; // alpha
        if(img[idx] > 10){
          pts.push([x,y]);
        }
      }
    }
    const MAX = 5000;
    if(pts.length > MAX){
      const step = Math.ceil(pts.length / MAX);
      return pts.filter((_,i)=> i%step===0);
    }
    return pts;
  }

  function build(targets){
    particles.length = 0;
    for(const [x,y] of targets){ 
      particles.push(new P(x,y)); 
    }
  }

  function explode(){
    for(const p of particles){
      const a = Math.random()*Math.PI*2;
      const s = (Math.random()*8+6)*DPR;
      p.vx += Math.cos(a)*s;
      p.vy += Math.sin(a)*s;
    }
  }

  function loop(){
    ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation = CFG.glow ? 'lighter' : 'source-over';
    for(const p of particles){ 
      p.step(); 
      p.draw(); 
    }
    requestAnimationFrame(loop);
  }

  // UI
  const $txt = document.getElementById('text');
  const $apply = document.getElementById('apply');
  const $boom = document.getElementById('boom');
  const $shape = document.getElementById('shape');

  function buildFromUI(){
    const mode = $shape.value;
    if(mode==='text'){
      build(toParticlesFromText(($txt.value || 'Hello').toString()));
    } else {
      build(toParticlesFromShape(mode));
    }
  }
  $apply.addEventListener('click', buildFromUI);
  $boom.addEventListener('click', explode);
  addEventListener('keydown', e => { if(e.key==='Enter') buildFromUI(); });

  // init
  buildFromUI();
  loop();
})();
