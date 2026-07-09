import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

/**
 * RevenueCat wrapper for Google Play Billing (native in-app purchase — no
 * browser). RevenueCat is the source of truth for the Premium entitlement:
 * it validates receipts server-side and caches the entitlement on-device.
 *
 * The SDK is loaded lazily and NEVER on web (there is no native module there),
 * so the app still runs in a desktop browser for development.
 *
 * The public SDK key is safe to ship in the bundle (publishable, like the
 * Supabase anon key). Set EXPO_PUBLIC_REVENUECAT_ANDROID_KEY; without it
 * everything degrades gracefully and the paywall shows a "coming soon" note.
 */

const ANDROID_KEY = (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '').trim();
const IOS_KEY = (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '').trim();
const ENTITLEMENT_ID = 'premium';

const isWeb = Platform.OS === 'web';
let configured = false;

/** Lazily pull in the native SDK. Returns null on web. */
function rc(): typeof import('react-native-purchases').default | null {
  if (isWeb) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-purchases').default;
  } catch {
    return null;
  }
}

export function purchasesConfigured(): boolean {
  if (isWeb) return false;
  const key = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  return key.length > 0;
}

/** Configure once, then identify the user so purchases follow their account. */
export async function configurePurchases(userId: string): Promise<void> {
  if (!purchasesConfigured()) return;
  const Purchases = rc();
  if (!Purchases) return;
  try {
    if (!configured) {
      const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
      Purchases.configure({ apiKey, appUserID: userId });
      configured = true;
    } else {
      await Purchases.logIn(userId);
    }
  } catch {
    // Non-fatal — Premium simply stays locked until it can configure.
  }
}

export async function logoutPurchases(): Promise<void> {
  if (!configured) return;
  const Purchases = rc();
  if (!Purchases) return;
  try {
    await Purchases.logOut();
  } catch {
    // ignore
  }
}

export function isPremiumInfo(info: CustomerInfo | null): boolean {
  return !!info?.entitlements.active[ENTITLEMENT_ID];
}

/** Current entitlement from RevenueCat's cache (offline-safe). */
export async function getPremiumFromRC(): Promise<boolean> {
  const Purchases = rc();
  if (!purchasesConfigured() || !Purchases) return false;
  try {
    return isPremiumInfo(await Purchases.getCustomerInfo());
  } catch {
    return false;
  }
}

/** Fires whenever entitlement changes (purchase completes, renews, lapses). */
export function onPremiumChange(cb: (isPremium: boolean) => void): () => void {
  const Purchases = rc();
  if (!purchasesConfigured() || !Purchases) return () => {};
  const listener = (info: CustomerInfo) => cb(isPremiumInfo(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

export interface PremiumOffer {
  package: PurchasesPackage;
  priceString: string; // localized, e.g. "$3.99" / "RM 16.90"
}

export interface PremiumOffers {
  monthly: PremiumOffer | null;
  annual: PremiumOffer | null;
}

/** Monthly + annual Premium packages from the current RevenueCat offering. */
export async function getPremiumOffers(): Promise<PremiumOffers> {
  const Purchases = rc();
  if (!purchasesConfigured() || !Purchases) return { monthly: null, annual: null };
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    const wrap = (p: PurchasesPackage | null | undefined): PremiumOffer | null =>
      p ? { package: p, priceString: p.product.priceString } : null;
    return {
      monthly: wrap(current?.monthly ?? current?.availablePackages[0]),
      annual: wrap(current?.annual),
    };
  } catch {
    return { monthly: null, annual: null };
  }
}

/** Back-compat: just the monthly package. */
export async function getPremiumOffer(): Promise<PremiumOffer | null> {
  return (await getPremiumOffers()).monthly;
}

export type PurchaseResult = 'success' | 'cancelled' | 'error';

export async function purchasePremium(pkg: PurchasesPackage): Promise<PurchaseResult> {
  const Purchases = rc();
  if (!Purchases) return 'error';
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return isPremiumInfo(customerInfo) ? 'success' : 'error';
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean };
    return err?.userCancelled ? 'cancelled' : 'error';
  }
}

/** Restore a prior purchase (new device, reinstall). */
export async function restorePremium(): Promise<boolean> {
  const Purchases = rc();
  if (!purchasesConfigured() || !Purchases) return false;
  try {
    return isPremiumInfo(await Purchases.restorePurchases());
  } catch {
    return false;
  }
}
