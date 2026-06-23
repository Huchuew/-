import { Capacitor } from '@capacitor/core';

import {

  AdMob,

  InterstitialAdPluginEvents,

  RewardAdPluginEvents,

} from '@capacitor-community/admob';

import {

  ADMOB_INTERSTITIAL_ID, ADMOB_REWARDED_ID, ADMOB_TESTING,

} from '../config/release';



const IS_NATIVE = Capacitor.isNativePlatform();

const AD_LOAD_TIMEOUT_MS = 20_000;



/** 전면 광고 최소 간격 (이보다 짧으면 표시 안 함) */

export const INTERSTITIAL_COOLDOWN_MS = 8 * 60 * 1000;

/** 모험 중 N웨이브 클리어마다 전면 광고 시도 (쿨다운 통과 시에만 표시) */

export const INTERSTITIAL_WAVE_INTERVAL = 50;



let initialized = false;

let initPromise: Promise<void> | null = null;

let lastInterstitialAt = 0;



function showMockAd(label: string, ms = 1800): Promise<boolean> {

  return new Promise((resolve) => {

    const root = document.getElementById('tuduk-app') ?? document.body;

    const el = document.createElement('div');

    el.className = 'ad-mock-overlay';

    el.innerHTML = `

      <div class="ad-mock-box">

        <p>📺 ${label}</p>

        <p class="ad-mock-sub">${Math.ceil(ms / 1000)}초 후 보상 · 탭하여 건너뛰기</p>

        <div class="ad-mock-bar"><div class="ad-mock-fill"></div></div>

      </div>`;

    root.appendChild(el);



    let done = false;

    const finish = (ok: boolean) => {

      if (done) return;

      done = true;

      window.clearTimeout(timer);

      el.remove();

      resolve(ok);

    };



    el.addEventListener('click', () => finish(true));

    const fill = el.querySelector('.ad-mock-fill') as HTMLElement;

    fill.style.transition = `width ${ms}ms linear`;

    requestAnimationFrame(() => { fill.style.width = '100%'; });

    const timer = window.setTimeout(() => finish(true), ms);

  });

}



async function requestIosTrackingIfNeeded(): Promise<void> {

  if (Capacitor.getPlatform() !== 'ios') return;

  try {

    const status = await AdMob.trackingAuthorizationStatus();

    if (status.status === 'notDetermined') {

      await AdMob.requestTrackingAuthorization();

    }

  } catch (err) {

    console.warn('[AdManager] iOS tracking auth skipped', err);

  }

}



async function initNativeAds(): Promise<void> {

  await requestIosTrackingIfNeeded();

  await AdMob.initialize({ initializeForTesting: ADMOB_TESTING });

}



export async function initAds(): Promise<void> {

  if (initialized) return;

  if (initPromise) return initPromise;



  initPromise = (async () => {

    if (IS_NATIVE) {

      try {

        await initNativeAds();

      } catch (err) {

        console.warn('[AdManager] native init failed', err);

      }

    }

    initialized = true;

  })();



  return initPromise;

}



function waitForAdLoad(isLoaded: () => boolean, timeoutMs: number): Promise<boolean> {

  return new Promise((resolve) => {

    if (isLoaded()) {

      resolve(true);

      return;

    }

    const started = Date.now();

    const tick = () => {

      if (isLoaded()) {

        resolve(true);

        return;

      }

      if (Date.now() - started >= timeoutMs) {

        resolve(false);

        return;

      }

      window.setTimeout(tick, 80);

    };

    tick();

  });

}



async function showNativeRewardedAd(): Promise<boolean> {

  let rewarded = false;

  let loaded = false;

  const handles: { remove: () => Promise<void> }[] = [];

  let settled = false;



  const cleanup = () => { void Promise.all(handles.map(h => h.remove())); };

  return new Promise(async (resolve) => {

    const done = (ok: boolean) => {

      if (settled) return;

      settled = true;

      cleanup();

      resolve(ok);

    };



    handles.push(await AdMob.addListener(RewardAdPluginEvents.Loaded, () => {

      loaded = true;

    }));

    handles.push(await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (err) => {

      console.warn('[AdManager] rewarded FailedToLoad', err);

      done(false);

    }));

    handles.push(await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {

      rewarded = true;

    }));

    handles.push(await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {

      done(rewarded);

    }));

    handles.push(await AdMob.addListener(RewardAdPluginEvents.FailedToShow, (err) => {

      console.warn('[AdManager] rewarded FailedToShow', err);

      done(false);

    }));



    try {

      await AdMob.prepareRewardVideoAd({

        adId: ADMOB_REWARDED_ID,

        isTesting: ADMOB_TESTING,

      });

      const ready = await waitForAdLoad(() => loaded, AD_LOAD_TIMEOUT_MS);

      if (!ready) {

        console.warn('[AdManager] rewarded load timeout');

        done(false);

        return;

      }

      await AdMob.showRewardVideoAd();

    } catch (err) {

      console.warn('[AdManager] rewarded show error', err);

      done(false);

    }

  });

}



async function showNativeInterstitialAd(): Promise<boolean> {

  return new Promise((resolve) => {

    let settled = false;

    let loaded = false;

    const handles: { remove: () => Promise<void> }[] = [];



    const finish = (ok: boolean) => {

      if (settled) return;

      settled = true;

      void Promise.all(handles.map(h => h.remove()));

      resolve(ok);

    };



    void (async () => {

      handles.push(await AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {

        loaded = true;

      }));

      handles.push(await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (err) => {

        console.warn('[AdManager] interstitial FailedToLoad', err);

        finish(false);

      }));

      handles.push(await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => finish(true)));

      handles.push(await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (err) => {

        console.warn('[AdManager] interstitial FailedToShow', err);

        finish(false);

      }));



      try {

        await AdMob.prepareInterstitial({

          adId: ADMOB_INTERSTITIAL_ID,

          isTesting: ADMOB_TESTING,

        });

        const ready = await waitForAdLoad(() => loaded, AD_LOAD_TIMEOUT_MS);

        if (!ready) {

          console.warn('[AdManager] interstitial load timeout');

          finish(false);

          return;

        }

        await AdMob.showInterstitial();

      } catch (err) {

        console.warn('[AdManager] interstitial show error', err);

        finish(false);

      }

    })();

  });

}



export async function showRewardedAd(): Promise<boolean> {

  await initAds();

  if (!IS_NATIVE) return showMockAd('보상형 광고');



  try {

    const ok = await showNativeRewardedAd();

    if (!ok) return showMockAd('보상형 광고');

    return ok;

  } catch (err) {

    console.warn('[AdManager] rewarded failed, mock fallback', err);

    return showMockAd('보상형 광고');

  }

}



export async function showInterstitialAd(): Promise<boolean> {

  await initAds();

  if (!IS_NATIVE) {

    await showMockAd('전면 광고', 1200);

    return true;

  }



  try {

    const ok = await showNativeInterstitialAd();

    if (!ok) await showMockAd('전면 광고', 1200);

    return ok;

  } catch (err) {

    console.warn('[AdManager] interstitial failed, mock fallback', err);

    await showMockAd('전면 광고', 1200);

    return false;

  }

}



/** 쿨다운·빈도 제한을 적용한 전면 광고 (자동 노출용) */

export async function tryShowInterstitialAd(): Promise<boolean> {

  const now = Date.now();

  if (now - lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) return false;

  const ok = await showInterstitialAd();

  if (ok) lastInterstitialAt = now;

  return ok;

}

