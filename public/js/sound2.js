// sound2.js — TV audio engine (v2.1).
// Persistent-node design: the hiss source and the 1 kHz oscillator are created
// ONCE at unlock and run forever; "on/off" is only ever a gain ramp. This makes
// it impossible for a sound to get stuck on (the old orphan-oscillator bug).
(function () {
  const TV = (window.TV = window.TV || {});
  const MAX_GAIN = 0.20;   // absolute output cap — "max" on the TV is half-loudness for the user

  class TvAudio {
    constructor() {
      this.enabled = true;
      this.unlocked = false;
      this.master = 0.5;      // logical volume 0..1
      this.wantHiss = false;
      this.wantBeep = false;
      this.ctx = null;
    }

    _init() {
      if (this.ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const ctx = (this.ctx = new AC());

      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = this._masterTarget();
      this.masterGain.connect(ctx.destination);

      // --- persistent hiss chain ---
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;

      const hissSrc = ctx.createBufferSource();
      hissSrc.buffer = buf; hissSrc.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 11000;
      this.hissGain = ctx.createGain();
      this.hissGain.gain.value = 0;
      hissSrc.connect(hp); hp.connect(lp); lp.connect(this.hissGain);
      this.hissGain.connect(this.masterGain);
      hissSrc.start();

      // --- persistent 1 kHz SMPTE tone ---
      const osc = ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = 1000;
      this.beepGain = ctx.createGain();
      this.beepGain.gain.value = 0;
      osc.connect(this.beepGain);
      this.beepGain.connect(this.masterGain);
      osc.start();

      return true;
    }

    _masterTarget() {
      return this.enabled ? this.master * MAX_GAIN : 0;
    }

    _ramp(param, target, sec = 0.12) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.linearRampToValueAtTime(target, now + sec);
    }

    _apply() {
      if (!this.ctx) return;
      this._ramp(this.hissGain.gain, this.wantHiss ? 0.9 : 0, 0.25);
      this._ramp(this.beepGain.gain, this.wantBeep ? 0.20 : 0, 0.15);
    }

    unlock() {
      if (!this._init()) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => { this.unlocked = true; this._apply(); }).catch(() => {});
      } else {
        this.unlocked = true;
      }
      this._apply();
    }

    setEnabled(on) {
      this.enabled = on;
      if (this.ctx) this._ramp(this.masterGain.gain, this._masterTarget(), 0.12);
    }

    setMaster(v, sec = 0.1) {
      this.master = Math.max(0, Math.min(1, v));
      if (this.ctx) this._ramp(this.masterGain.gain, this._masterTarget(), sec);
    }

    setHiss(on) { this.wantHiss = on; this._apply(); }
    setBeep(on) { this.wantBeep = on; this._apply(); }

    // short static burst for channel changes (own gain, bypasses master so it's
    // always audible, but respects the enabled switch)
    burst(duration = 0.4) {
      if (!this.ctx || !this.enabled || this.ctx.state === 'suspended') return;
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf; src.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
      const g = ctx.createGain();
      const now = ctx.currentTime;
      const level = Math.max(0.06, this.master * MAX_GAIN);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(level, now + 0.03);
      g.gain.setValueAtTime(level, now + duration * 0.6);
      g.gain.linearRampToValueAtTime(0.0001, now + duration);
      src.connect(hp); hp.connect(g); g.connect(ctx.destination);
      src.start(now); src.stop(now + duration + 0.05);
    }

    click() {
      if (!this.ctx || !this.enabled || this.ctx.state === 'suspended') return;
      const ctx = this.ctx, now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.1, now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.08);
    }

    // short playful cartoon sting — bouncy major arpeggio + a little "boing"
    sting() {
      if (!this.ctx || !this.enabled || this.ctx.state === 'suspended') return;
      const ctx = this.ctx, t0 = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
      notes.forEach((f, i) => {
        const t = t0 + i * 0.09;
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.14, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 0.18);
      });
      // boing tail
      const t = t0 + notes.length * 0.09;
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(900, t);
      o.frequency.exponentialRampToValueAtTime(280, t + 0.22);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.28);
    }
  }

  TV.audio = new TvAudio();
})();
