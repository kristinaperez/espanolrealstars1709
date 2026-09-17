import type { TelegramUserRow } from "@/db/schema";
import { premiumProduct, starsPrice } from "@/lib/payments/catalog";
import { getBotUsername, isTelegramConfigured } from "@/lib/telegram/crypto";
import { findPaidLicenseForUser, getRecentOrdersForUser } from "@/server/orders";
import { publicDisplayName, toPublicUser, type PublicUser } from "@/server/users";

export interface AccountOrder {
  id: number;
  status: string;
  stars: number;
  createdAt: string;
}

export interface AccountPayload {
  ok: true;
  configured: boolean;
  botUsername: string | null;
  starsPrice: number;
  productId: string;
  user: PublicUser | null;
  displayName: string | null;
  premium: {
    active: boolean;
    key: string | null;
    productId: string | null;
    source: string | null;
    issuedAt: string | null;
  };
  orders: AccountOrder[];
}

const emptyPayload = (configured: boolean): AccountPayload => ({
  ok: true,
  configured,
  botUsername: getBotUsername(),
  starsPrice: starsPrice(),
  productId: premiumProduct().id,
  user: null,
  displayName: null,
  premium: { active: false, key: null, productId: null, source: null, issuedAt: null },
  orders: [],
});

export async function buildAccountPayload(
  user: TelegramUserRow | null,
): Promise<AccountPayload> {
  const configured = isTelegramConfigured();
  if (!user) return emptyPayload(configured);

  const license = await findPaidLicenseForUser(user.id);
  const recent = await getRecentOrdersForUser(user.id, 5);

  return {
    ok: true,
    configured,
    botUsername: getBotUsername(),
    starsPrice: starsPrice(),
    productId: premiumProduct().id,
    user: toPublicUser(user),
    displayName: publicDisplayName(toPublicUser(user)),
    premium: {
      active: Boolean(license),
      key: license?.key ?? null,
      productId: license?.productId ?? null,
      source: license?.source ?? null,
      issuedAt: license?.issuedAt ? new Date(license.issuedAt).toISOString() : null,
    },
    orders: recent.map((order) => ({
      id: order.id,
      status: order.status,
      stars: order.stars,
      createdAt: new Date(order.createdAt).toISOString(),
    })),
  };
}
