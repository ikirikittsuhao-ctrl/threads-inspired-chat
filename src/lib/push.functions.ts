import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return process.env["VAPID_PUBLIC_KEY"] ?? "";
});

export const sendPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    toUserId: string;
    kind: "dm" | "activity";
    title: string;
    body: string;
    url: string;
  }) => input)
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    if (data.toUserId === userId) return { sent: 0 };

    // Authorize: DM push requires a shared conversation; activity push requires
    // a notification row the caller just created for the recipient.
    if (data.kind === "dm") {
      const { data: mine } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", userId);
      const ids = (mine ?? []).map((m) => m.conversation_id);
      if (ids.length === 0) return { sent: 0 };
      const { data: shared } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", data.toUserId)
        .in("conversation_id", ids)
        .limit(1);
      if (!shared || shared.length === 0) return { sent: 0 };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.kind === "activity") {
      const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: recent } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("actor_id", userId)
        .eq("user_id", data.toUserId)
        .gte("created_at", since)
        .limit(1);
      if (!recent || recent.length === 0) return { sent: 0 };
    }

    const vapid = {
      subject: process.env["VAPID_SUBJECT"] ?? "mailto:noreply@sasuty.app",
      publicKey: process.env["VAPID_PUBLIC_KEY"],
      privateKey: process.env["VAPID_PRIVATE_KEY"],
    };
    if (!vapid.publicKey || !vapid.privateKey) return { sent: 0 };

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("user_id", data.toUserId);
    if (!subs || subs.length === 0) return { sent: 0 };

    const { buildPushPayload } = await import("@block65/webcrypto-web-push");

    let sent = 0;
    const dead: string[] = [];
    await Promise.all(
      subs.map(async (sub) => {
        const subscription = {
          endpoint: sub.endpoint,
          expirationTime: null,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        try {
          const payload = await buildPushPayload(
            {
              data: { title: data.title, body: data.body, url: data.url, tag: data.kind },
              options: { ttl: 60 * 60, urgency: "high" },
            },
            subscription,
            vapid,
          );
          const res = await fetch(sub.endpoint, {
            method: payload.method,
            headers: payload.headers,
            body: payload.body as unknown as BodyInit,
          });
          if (res.status === 404 || res.status === 410) dead.push(sub.id);
          else if (res.ok) sent += 1;
        } catch {
          /* ignore individual delivery failures */
        }
      }),
    );

    if (dead.length > 0) {
      await supabaseAdmin.from("push_subscriptions").delete().in("id", dead);
    }

    return { sent };
  });
