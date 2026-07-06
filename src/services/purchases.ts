import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

/**
 * RevenueCat wrapper for Google Play Billing (native in-app purchase — no
 * browser). RevenueCat is the source of truth for the Premium entitlement:
 * it validates receipts server-side and its SDK caches the entitlement
 * on-device (works offline). The Play Store subscription product is linked
 * to the "premium" entitlement in the RevenueCat dashboard.
 *
 * The public SDK key is safe to ship in the bundle (it's publishable, like
 * the Supabase anon key). Set EXPO_PUBLIC_REVENUECAT_ANDROID_KEY; without it
 * everything degrades gracefully and the paywall shows a "not configured" note.
 */

const ANDROID_KEY = (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '').trim();
const IOS_KEY = (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '').trim();
const ENTITLEMENT_ID = 'premium';

let configured = false;

export function purchasesConfigured(): boolean {
  const key = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  return key.length > 0;
}

/** Configure once, then identify the user so purchases follow their account. */
export async function configurePurchases(userId: string): Promise<void> {
  if (!purchasesConfigured()) return;
  try {
    if (!configured) {
      const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
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
  if (!purchasesConfigured()) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return isPremiumInfo(info);
  } catch {
    return false;
  }
}

/** Fires whenever entitlement changes (e.g. purchase completes, renews, lapses). */
export function onPremiumChange(cb: (isPremium: boolean) => void): () => void {
  if (!purchasesConfigured()) return () => {};
  const listener = (info: CustomerInfo) => cb(isPremiumInfo(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

export interface PremiumOffer {
  package: PurchasesPackage;
  priceString: string; // localized, e.g. "$3.99" / "RM 16.90"
}

/** The monthly Premium package from the current RevenueCat offering. */
export async function getPremiumOffer(): Promise<PremiumOffer | null> {
  if (!purchasesConfigured()) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.monthly ?? offerings.current?.availablePackages[0] ?? null;
    if (!pkg) return null;
    return { package: pkg, priceString: pkg.product.priceString };
  } catch {
    return null;
  }
}

export type PurchaseResult = 'success' | 'cancelled' | 'error';

export async function purchasePremium(pkg: PurchasesPackage): Promise<PurchaseResult> {
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
  if (!purchasesConfigured()) return false;
  try {
    const info = await Purchases.restorePurchases();
    return isPremiumInfo(info);
  } catch {
    return false;
  }
}
