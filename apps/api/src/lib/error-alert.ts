import os from 'node:os';
import { env } from '../config/env.js';
import { createSmtpTransport, isSmtpConfigured } from './mailer.js';

type AlertContext = Record<string, string | number | null | undefined>;

export type ErrorAlertInput = {
  /** 알림 출처. 예: api, kbo-sync:today, process */
  source: string;
  /** 메일 제목에 들어갈 한 줄 요약 */
  title: string;
  error: unknown;
  context?: AlertContext;
};

const SEND_TIMEOUT_MS = 10_000;
const MAX_TRACKED_KEYS = 500;

/** 같은 오류가 몰릴 때 메일 폭탄을 막기 위한 key별 마지막 발송 시각/누락 횟수 */
const recentAlerts = new Map<string, { sentAt: number; suppressed: number }>();

function describeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? `${error.name}: ${error.message}`,
    };
  }

  const message = typeof error === 'string' ? error : JSON.stringify(error);

  return { name: 'NonError', message, stack: message };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatKst(date: Date) {
  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour12: false,
  });
}

/** 발송 여부 판단 + 쿨다운 동안 누락된 횟수 반환. null이면 이번엔 건너뜀 */
function takeAlertSlot(key: string, now: number) {
  const recent = recentAlerts.get(key);

  if (recent && now - recent.sentAt < env.errorAlert.cooldownMs) {
    recent.suppressed += 1;
    return null;
  }

  if (recentAlerts.size >= MAX_TRACKED_KEYS) {
    recentAlerts.clear();
  }

  recentAlerts.set(key, { sentAt: now, suppressed: 0 });

  return recent?.suppressed ?? 0;
}

/**
 * 관리자에게 서버 오류 메일을 보낸다. 실패해도 절대 throw 하지 않는다.
 * 크래시 직전처럼 발송 완료를 기다려야 할 때만 await 한다.
 */
export async function sendErrorAlert(input: ErrorAlertInput) {
  if (!env.errorAlert.enabled) return false;

  if (!isSmtpConfigured() || env.errorAlert.recipients.length === 0) {
    console.warn(
      '[error-alert] SMTP 또는 수신자가 설정되지 않아 알림을 건너뜁니다.',
    );
    return false;
  }

  const described = describeError(input.error);
  const now = new Date();
  const key = `${input.source}|${described.name}|${described.message.split('\n')[0]}`;
  const suppressed = takeAlertSlot(key, now.getTime());

  if (suppressed === null) return false;

  const rows: [string, string][] = [
    ['출처', input.source],
    ['시각 (KST)', formatKst(now)],
    ['환경', `${env.nodeEnv} / ${os.hostname()} / pid ${process.pid}`],
    ...Object.entries(input.context ?? {})
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== '',
      )
      .map(([label, value]): [string, string] => [label, String(value)]),
  ];

  if (suppressed > 0) {
    rows.push(['직전 쿨다운 중 누락', `${suppressed}건`]);
  }

  const subject = `[야크크 야르] 서버 오류 - ${input.title}`.slice(0, 180);
  const text = [
    subject,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    described.stack,
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#14213d">
      <h1 style="font-size:20px;color:#b42318">서버 오류 알림</h1>
      <p style="font-weight:700">${escapeHtml(input.title)}</p>
      <table style="border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td style="padding:4px 12px 4px 0;color:#667085;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`,
          )
          .join('')}
      </table>
      <pre style="margin-top:16px;padding:12px;background:#f2f4f7;border-radius:6px;font-size:12px;white-space:pre-wrap;word-break:break-all">${escapeHtml(described.stack)}</pre>
    </div>
  `;

  try {
    await Promise.race([
      createSmtpTransport().sendMail({
        from: env.smtp.from,
        to: env.errorAlert.recipients,
        subject,
        text,
        html,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('메일 발송 시간 초과')),
          SEND_TIMEOUT_MS,
        ).unref(),
      ),
    ]);
    return true;
  } catch (mailError) {
    console.error('[error-alert] 오류 알림 메일 발송 실패', mailError);
    // 못 보낸 알림이 쿨다운을 잡아먹지 않도록 다음 오류 때 다시 시도한다.
    recentAlerts.delete(key);
    return false;
  }
}

/** 요청 처리를 막지 않는 fire-and-forget 버전 */
export function notifyError(input: ErrorAlertInput) {
  void sendErrorAlert(input);
}

let crashAlertsInstalled = false;

/**
 * 처리되지 않은 예외/Promise 거부(top-level await 포함)를 메일로 알리고 종료한다.
 * API 서버와 cron으로 실행되는 동기화 스크립트 진입점에서 호출한다.
 */
export function installCrashAlerts(source: string) {
  if (crashAlertsInstalled) return;
  crashAlertsInstalled = true;

  let exiting = false;

  process.on('uncaughtException', (error, origin) => {
    console.error(`[${source}] 처리되지 않은 오류 (${origin})`, error);

    if (exiting) return;
    exiting = true;

    void sendErrorAlert({
      source,
      title: `${source} 프로세스 비정상 종료`,
      error,
      context: { 원인: origin, 명령: process.argv.slice(2).join(' ') },
    }).finally(() => process.exit(1));
  });
}
