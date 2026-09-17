import type { NextRequest } from "next/server";
import { FREE_LESSON_COUNT } from "@/lib/content/config";
import { getDistractorPool, getLesson } from "@/lib/content/loader";
import { isFreeLesson } from "@/lib/content/secure";
import { currentUser, errorResponse, jsonResponse } from "@/server/http";
import { findPaidLicenseForUser, getLicenseByKey } from "@/server/orders";
import { formatKey, normalizeKey } from "@/lib/license";

export const dynamic = "force-dynamic";

/**
 * GET /api/lessons/8?key=ESPA-XXXX-XXXX
 *
 * Delivers the full lesson content (and its distractor pool) to entitled users.
 * Free lessons are always public; premium lessons require either a signed-in
 * Telegram account with a paid order or a valid license key.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ n: string }> },
) {
  const { n } = await params;
  const lessonNumber = Number(n);
  if (!Number.isFinite(lessonNumber) || lessonNumber <= 0) {
    return errorResponse("Некорректный номер урока", 400);
  }

  const lesson = getLesson(lessonNumber);
  if (!lesson) return errorResponse("Урок не найден", 404);

  if (isFreeLesson(lessonNumber)) {
    return jsonResponse({
      ok: true,
      lesson,
      pool: getDistractorPool(lessonNumber, 40),
      access: "free" as const,
      freeLessonCount: FREE_LESSON_COUNT,
    });
  }

  // 1) License key supplied by the client (offline purchase / gift).
  const rawKey = new URL(request.url).searchParams.get("key");
  if (rawKey) {
    const clean = normalizeKey(rawKey);
    const license =
      (await getLicenseByKey(formatKey(clean))) ?? (await getLicenseByKey(clean));
    if (license) {
      return jsonResponse({
        ok: true,
        lesson,
        pool: getDistractorPool(lessonNumber, 40),
        access: "license-key" as const,
        freeLessonCount: FREE_LESSON_COUNT,
      });
    }
  }

  // 2) Telegram session with a paid order.
  const user = await currentUser(request);
  if (user) {
    const license = await findPaidLicenseForUser(user.id);
    if (license) {
      return jsonResponse({
        ok: true,
        lesson,
        pool: getDistractorPool(lessonNumber, 40),
        access: "telegram-account" as const,
        freeLessonCount: FREE_LESSON_COUNT,
      });
    }
  }

  return jsonResponse(
    {
      ok: false,
      error: "Этот урок входит в Premium. Оплатите 500 ⭐ в Telegram, чтобы получить доступ.",
      freeLessonCount: FREE_LESSON_COUNT,
    },
    402,
  );
}
