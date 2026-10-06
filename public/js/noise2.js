// noise2.js — real dead-channel TV snow.
// Full-coverage per-pixel random noise, redrawn every frame, with:
//  - slow rolling dark band (AGC/vertical-hold artifact)
//  - occasional bright horizontal streaks (impulse noise)
//  - sparse color flecks (chroma noise on a colour set)
//  - per-frame global flicker
(function () {
  const TV = (window.TV = window.TV || {});

  class TVNoise {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.scale = opts.scale || 3;      // chunkiness of grain
      this.running = false;
      this.raf = 0;
      this.t = 0;
      this.bandSpeed = 0.18 + Math.random() * 0.1;  // rolling band px/frame
      this.bandPos = Math.random();
      this._resize = this.resize.bind(this);
      this.resize();
      window.addEventListener('resize', this._resize);
    }

    resize() {
      const w = Math.max(2, Math.ceil(window.innerWidth / this.scale));
      const h = Math.max(2, Math.ceil(window.innerHeight / this.scale));
      this.w = w; this.h = h;
      this.canvas.width = w;
      this.canvas.height = h;
      this.img = this.ctx.createImageData(w, h);
      this.u32 = new Uint32Array(this.img.data.buffer);
    }

    start() {
      if (this.running) return;
      this.running = true;
      const loop = () => {
        if (!this.running) return;
        this.render();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
      this.render(); // paint one frame immediately
    }

    stop() {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }

    render() {
      const { w, h, u32 } = this;
      this.t++;

      // global per-frame flicker
      const flick = 0.88 + Math.random() * 0.18;

      // rolling dark band
      this.bandPos += this.bandSpeed / h;
      if (this.bandPos > 1.25) this.bandPos = -0.25;
      const bandY = this.bandPos * h;
      const bandH = h * 0.16;

      // impulse streak rows for this frame
      const streaks = new Set();
      const nStreaks = Math.random() < 0.5 ? 1 + ((Math.random() * 3) | 0) : 0;
      for (let s = 0; s < nStreaks; s++) streaks.add((Math.random() * h) | 0);

      let i = 0;
      for (let y = 0; y < h; y++) {
        // row brightness factor
        let rowF = flick;
        const dBand = Math.abs(y - bandY);
        if (dBand < bandH) rowF *= 0.55 + 0.45 * (dBand / bandH);
        const streak = streaks.has(y);
        if (streak) rowF = Math.min(1.6, rowF * 1.9);

        for (let x = 0; x < w; x++, i++) {
          let v = (Math.random() * 256 * rowF) | 0;
          if (v > 255) v = 255;
          // sparse chroma flecks
          if ((Math.random() * 100) < 1.2) {
            const r = Math.min(255, v + ((Math.random() * 90) | 0));
            const g = v;
            const b = Math.min(255, v + ((Math.random() * 90) | 0));
            u32[i] = 0xff000000 | (b << 16) | (g << 8) | r;
          } else {
            u32[i] = 0xff000000 | (v << 16) | (v << 8) | v;
          }
        }
      }
      this.ctx.putImageData(this.img, 0, 0);
    }
  }

  TV.TVNoise = TVNoise;
})();
