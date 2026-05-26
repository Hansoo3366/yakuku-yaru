import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

export function getVerificationUrl(token: string) {
  return `${env.appUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
}

export function getPasswordResetUrl(token: string) {
  return `${env.appUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationEmail(input: {
  email: string;
  nickname: string;
  token: string;
}) {
  if (!env.smtp.user || !env.smtp.password || !env.smtp.from) {
    console.warn('SMTP is not configured. Skipping verification email.');
    return false;
  }

  const verificationUrl = getVerificationUrl(input.token);
  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.password,
    },
  });

  await transporter.sendMail({
    from: env.smtp.from,
    to: input.email,
    subject: '[야크크 야르] 이메일 인증을 완료해주세요',
    text: `${input.nickname}님, 아래 링크를 열어 이메일 인증을 완료해주세요.\n\n${verificationUrl}\n\n이 링크는 24시간 동안 유효합니다.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#14213d">
        <h1 style="font-size:22px">야크크 야르 이메일 인증</h1>
        <p>${input.nickname}님, 아래 버튼을 눌러 이메일 인증을 완료해주세요.</p>
        <p>
          <a href="${verificationUrl}" style="display:inline-block;background:#0f6b4f;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700">
            이메일 인증하기
          </a>
        </p>
        <p style="font-size:13px;color:#667085">이 링크는 24시간 동안 유효합니다.</p>
      </div>
    `,
  });

  return true;
}

export async function sendPasswordResetEmail(input: {
  email: string;
  nickname: string;
  token: string;
}) {
  if (!env.smtp.user || !env.smtp.password || !env.smtp.from) {
    console.warn('SMTP is not configured. Skipping password reset email.');
    return false;
  }

  const resetUrl = getPasswordResetUrl(input.token);
  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.password,
    },
  });

  await transporter.sendMail({
    from: env.smtp.from,
    to: input.email,
    subject: '[야크크 야르] 비밀번호 재설정',
    text: `${input.nickname}님, 아래 링크에서 비밀번호를 새로 설정해주세요.\n\n${resetUrl}\n\n이 링크는 1시간 동안 유효합니다. 요청하지 않으셨다면 이 메일을 무시하세요.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#14213d">
        <h1 style="font-size:22px">비밀번호 재설정</h1>
        <p>${input.nickname}님, 아래 버튼을 눌러 새 비밀번호를 설정해주세요.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#0f6b4f;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700">
            비밀번호 재설정하기
          </a>
        </p>
        <p style="font-size:13px;color:#667085">이 링크는 1시간 동안 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시하세요.</p>
      </div>
    `,
  });

  return true;
}
