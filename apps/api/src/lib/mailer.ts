import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export function isSmtpConfigured() {
  return Boolean(env.smtp.user && env.smtp.password && env.smtp.from);
}

export function createSmtpTransport() {
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.password,
    },
  });
}
