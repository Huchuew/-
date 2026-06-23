/** Capacitor Haptics + 웹 vibrate 폴백 — settings.vibration 연동 */
let vibrationEnabled = true;

export function setVibrationEnabled(on: boolean): void {
  vibrationEnabled = on;
}

export function isVibrationEnabled(): boolean {
  return vibrationEnabled;
}

export async function hapticLight(): Promise<void> {
  if (!vibrationEnabled) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
  }
}

export async function hapticMedium(): Promise<void> {
  if (!vibrationEnabled) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([18, 40, 18]);
    }
  }
}

export async function hapticSuccess(): Promise<void> {
  if (!vibrationEnabled) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([10, 30, 10]);
    }
  }
}

/** UI 롱프레스·툴팁 등 짧은 진동 */
export function vibrateShort(ms = 8): void {
  if (!vibrationEnabled) return;
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(ms);
  }
}
