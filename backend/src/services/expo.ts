import { config } from '../config.js';

export type PushMessage = { to: string; title?: string; body: string; data?: any };

export async function sendExpoPush(messages: PushMessage[]) {
  if (!messages.length) return { tickets: [], failed: [] };
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.expo.accessToken) headers['Authorization'] = `Bearer ${config.expo.accessToken}`;
  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 90) chunks.push(messages.slice(i, i + 90));
  const tickets: any[] = [];
  const failed: any[] = [];
  for (const c of chunks) {
    const r = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers, body: JSON.stringify(c) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      failed.push({ status: r.status, body: j });
    } else {
      tickets.push(j);
    }
  }
  return { tickets, failed };
}
