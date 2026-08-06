import { supabase } from "@/integrations/supabase/client";
import { getVapidPublicKey, sendPush } from "@/lib/push.functions";

const SW_PATH = "/push-sw.js";

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function getPushStatus() {
  if (!pushSupported()) return "unsupported" as const;
  if (Notification.permission === "denied") return "denied" as const;
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  const sub = await reg?.pushManager.getSubscription();
  return sub ? ("enabled" as const) : ("disabled" as const);
}

export async function enablePush(userId: string) {
  if (!pushSupported()) throw new Error("この端末では通知を利用できません");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("通知が許可されませんでした");

  const key = await getVapidPublicKey();
  if (!key) throw new Error("通知の設定が未完了です");

  const reg = await navigator.serviceWorker.register(SW_PATH);
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
    }));

  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.["p256dh"] ?? "",
      auth: json.keys?.["auth"] ?? "",
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function notifyUser(input: {
  toUserId: string;
  kind: "dm" | "activity";
  title: string;
  body: string;
  url: string;
}) {
  try {
    await sendPush({ data: input });
  } catch {
    /* push delivery is best-effort */
  }
}
