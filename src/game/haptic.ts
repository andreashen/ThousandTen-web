export class HapticSystem {
  private static enabled = true;
  private static isSupported = false;

  public static init() {
    if (typeof window === 'undefined') return;
    
    // Web Haptic API (navigator.vibrate) limits:
    // - iOS Safari / Chrome for iOS / WebViews on iOS: DO NOT support navigator.vibrate. Apple has entirely disabled this API for Web.
    // - Android Chrome / Firefox: Fully supported, but requires user interaction before firing.
    // We check for its existence to provide graceful degradation.
    this.isSupported = 'vibrate' in navigator && typeof navigator.vibrate === 'function';
    
    try {
      const savedSettings = localStorage.getItem('thousandten_haptic');
      if (savedSettings) {
        const { enabled } = JSON.parse(savedSettings);
        this.enabled = enabled ?? true;
      }
    } catch {
      console.warn('Haptic settings load failed');
    }
  }

  public static setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.save();
  }

  public static toggle() {
    this.setEnabled(!this.enabled);
  }

  public static get isEnabled() {
    return this.enabled;
  }

  private static save() {
    localStorage.setItem('thousandten_haptic', JSON.stringify({ enabled: this.enabled }));
  }

  public static vibratePlace() {
    if (!this.enabled || !this.isSupported) return;
    try {
      // Light, short tap for placement
      navigator.vibrate(15);
    } catch {
      // ignore
    }
  }

  public static vibrateClear(combo: number) {
    if (!this.enabled || !this.isSupported) return;
    try {
      // Different patterns based on combo
      if (combo === 1) {
        navigator.vibrate([20, 30, 20]);
      } else if (combo === 2) {
        navigator.vibrate([30, 40, 30, 40, 30]);
      } else if (combo >= 3) {
        navigator.vibrate([40, 30, 40, 30, 50, 40, 60]);
      }
    } catch {
      // ignore
    }
  }

  public static vibrateGameOver() {
    if (!this.enabled || !this.isSupported) return;
    try {
      // Long, descending pattern for game over
      navigator.vibrate([100, 50, 200, 50, 300]);
    } catch {
      // ignore
    }
  }
}
