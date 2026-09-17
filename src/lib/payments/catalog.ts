/**
 * Payment catalogue.
 *
 * Prices live in configuration so the storefront, the invoice and the license
 * checks never drift apart. Telegram Stars is the primary payment method;
 * everything routes through the same "product → paid → license" pipeline that
 * Stripe can be plugged into later.
 */

export interface Product {
  id: string;
  /** Invoice title, 1-32 characters. */
  title: string;
  /** Invoice description, 1-255 characters. */
  description: string;
  stars: number;
  currency: "XTR";
  /** Granted locally by this product (used for gate checks). */
  unlocks: "premium";
  lifetime: boolean;
}

export const DEFAULT_STARS_PRICE = 500;

export function starsPrice(): number {
  const raw = Number(process.env.TELEGRAM_STARS_PRICE ?? process.env.NEXT_PUBLIC_STARS_PRICE);
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : DEFAULT_STARS_PRICE;
}

export function premiumProduct(): Product {
  const stars = starsPrice();
  return {
    id: "premium-45",
    title: "Español Real · Premium",
    description:
      "Все уроки курса, полная система повторения, экзамены и сертификат. Разовая оплата, бессрочный доступ.",
    stars,
    currency: "XTR",
    unlocks: "premium",
    lifetime: true,
  };
}

export function getProduct(id: string): Product | null {
  const premium = premiumProduct();
  return premium.id === id ? premium : null;
}

export interface PaymentMethodDescriptor {
  id: "telegram_stars";
  enabled: boolean;
  label: string;
}

export function paymentMethods(): PaymentMethodDescriptor[] {
  return [{ id: "telegram_stars", enabled: true, label: `Telegram Stars · ${starsPrice()} ⭐` }];
}
