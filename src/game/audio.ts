export class AudioSystem {
  private static ctx: AudioContext | null = null;
  private static gainNode: GainNode | null = null;
  private static enabled = true;
  private static volume = 0.5;
  private static initialized = false;

  public static init() {
    if (typeof window === 'undefined' || this.initialized) return;
    try {
      const savedSettings = localStorage.getItem('thousandten_audio');
      if (savedSettings) {
        const { enabled, volume } = JSON.parse(savedSettings);
        this.enabled = enabled ?? true;
        this.volume = volume ?? 0.5;
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.gainNode = this.ctx.createGain();
        this.gainNode.connect(this.ctx.destination);
        this.updateGain();
        this.initialized = true;
      }
    } catch (e) {
      console.warn('Audio initialization failed', e);
    }
  }

  private static updateGain() {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime);
    }
  }

  public static setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.updateGain();
    this.save();
  }

  public static setVolume(volume: number) {
    this.volume = volume;
    this.updateGain();
    this.save();
  }

  public static toggle() {
    this.setEnabled(!this.enabled);
  }
  
  public static get isEnabled() {
    return this.enabled;
  }

  private static save() {
    localStorage.setItem('thousandten_audio', JSON.stringify({ enabled: this.enabled, volume: this.volume }));
  }

  public static playPlaceSound() {
    if (!this.enabled || !this.ctx || !this.gainNode) return;
    this.resumeCtx();
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    osc.connect(gain);
    gain.connect(this.gainNode);
    
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public static playClearSound(combo: number) {
    if (!this.enabled || !this.ctx || !this.gainNode) return;
    this.resumeCtx();

    const t = this.ctx.currentTime;
    
    // Scale pitch based on combo. Base is around 500Hz.
    const baseFreq = 500 + (Math.min(combo, 10) * 100);
    
    // Create a chord for a more satisfying clear sound
    const freqs = [baseFreq, baseFreq * 1.25, baseFreq * 1.5]; // Major triad

    const ctx = this.ctx;
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = i === 0 ? 'square' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3 / freqs.length, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      
      osc.connect(gain);
      gain.connect(this.gainNode!);
      
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  public static playGameOverSound() {
    if (!this.enabled || !this.ctx || !this.gainNode) return;
    this.resumeCtx();
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.5);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    
    osc.connect(gain);
    gain.connect(this.gainNode);
    
    osc.start(t);
    osc.stop(t + 0.5);
  }

  private static resumeCtx() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}
