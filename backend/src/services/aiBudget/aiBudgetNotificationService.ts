import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { AiBudgetNotificationChannel, AiBudgetNotificationKind } from '@prisma/client';
import { createNotificationDeliveries, findNotificationDelivery, listPendingNotificationDeliveries, startNotificationDelivery, completeNotificationDelivery, failNotificationDelivery } from '../../repositories/aiBudgetNotificationRepository';
import { createGlobalAiBudgetAudit } from '../../repositories/globalAiBudgetRepository';
import { enqueueAiBudgetNotification } from '../../queues/aiBudgetNotificationQueue';
import { AppError } from '../../utils/appError';

const discordRecipient = 'configured-discord-webhook';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const validNotificationEmail = (value: string) => emailPattern.test(value);

function destinations(setting: { notifyDiscord: boolean; notificationEmails: string[] }) {
  return [
    ...(setting.notifyDiscord ? [{ channel: AiBudgetNotificationChannel.DISCORD, recipient: discordRecipient }] : []),
    ...setting.notificationEmails.map((recipient) => ({ channel: AiBudgetNotificationChannel.EMAIL, recipient })),
  ];
}

export function buildThresholdNotificationDeliveries(setting: { notifyDiscord: boolean; notificationEmails: string[] }, month: string, thresholdPercent: number) {
  return destinations(setting).map(({ channel, recipient }) => ({ dedupeKey: `threshold:${month}:${thresholdPercent}:${channel}:${recipient}`, kind: 'THRESHOLD' as const, month, thresholdPercent, channel, recipient }));
}

export async function createThresholdNotifications(setting: { notifyDiscord: boolean; notificationEmails: string[] }, month: string, thresholdPercent: number) {
  const rows = buildThresholdNotificationDeliveries(setting, month, thresholdPercent).map((row) => ({ ...row, kind: AiBudgetNotificationKind.THRESHOLD }));
  await createNotificationDeliveries(rows);
  await enqueuePendingAiBudgetNotifications();
}

export async function createTestNotifications(setting: { notifyDiscord: boolean; notificationEmails: string[] }, channels: AiBudgetNotificationChannel[]) {
  const selected = destinations(setting).filter((destination) => channels.includes(destination.channel));
  if (!selected.length) throw new AppError('選択された通知先がありません。', 400);
  const month = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit' }).format(new Date()).replace('/', '-');
  await createNotificationDeliveries(selected.map(({ channel, recipient }) => ({ dedupeKey: `test:${crypto.randomUUID()}`, kind: AiBudgetNotificationKind.TEST, month, thresholdPercent: 0, channel, recipient })));
  await enqueuePendingAiBudgetNotifications();
}

export async function enqueuePendingAiBudgetNotifications() {
  await Promise.all((await listPendingNotificationDeliveries()).map(({ id }) => enqueueAiBudgetNotification(id)));
}

function requireEnv(name: string) { const value = process.env[name]; if (!value) throw new Error(`${name} is not configured`); return value; }
async function sendDiscord(message: string) { const response = await fetch(requireEnv('AI_BUDGET_DISCORD_WEBHOOK_URL'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: message }) }); if (!response.ok) throw new Error(`Discord delivery failed: ${response.status}`); }
async function sendEmail(to: string, subject: string, text: string) {
  const transporter = nodemailer.createTransport({ host: requireEnv('SMTP_HOST'), port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: requireEnv('SMTP_USER'), pass: requireEnv('SMTP_PASSWORD') } });
  await transporter.sendMail({ from: requireEnv('SMTP_FROM'), to, subject, text });
}
export async function deliverAiBudgetNotification(id: number) {
  const delivery = await findNotificationDelivery(id); if (!delivery || delivery.status === 'SUCCEEDED' || delivery.status === 'FAILED') return;
  const started = await startNotificationDelivery(id);
  const isTest = started.kind === 'TEST'; const subject = isTest ? '[RecAIpt] AI予算通知の試験送信' : `[RecAIpt] AI予算 ${started.thresholdPercent}% 到達`;
  const text = isTest ? 'AI予算通知の試験送信です。' : `AI予算が${started.month}に${started.thresholdPercent}%へ到達しました。`;
  try { if (started.channel === 'DISCORD') await sendDiscord(text); else await sendEmail(started.recipient, subject, text); await completeNotificationDelivery(id); }
  catch (error) { const message = error instanceof Error ? error.message : String(error); await failNotificationDelivery(id, started.attempts, message); if (started.attempts >= 3) await createGlobalAiBudgetAudit({ action: 'notification_failed', reason: '通知配送は最大試行回数に達しました。', afterValue: { deliveryId: id, channel: started.channel, recipient: started.recipient } }); throw error; }
}
