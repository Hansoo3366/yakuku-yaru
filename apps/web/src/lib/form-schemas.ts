import { z } from 'zod';
import {
  ATTENDANCE_MEMO_MAX_LENGTH,
  COMMENT_CONTENT_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  POST_CONTENT_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  validateBoardTextClient,
  validateEmailClient,
  validatePasswordClient,
} from '@/lib/user-input';

function requiredText(fieldName: string) {
  return z
    .string()
    .trim()
    .min(1, `${fieldName}을 입력해주세요.`);
}

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .max(EMAIL_MAX_LENGTH, `${EMAIL_MAX_LENGTH}자 이하로 입력해주세요.`)
    .refine((value) => !validateEmailClient(value), {
      message: '올바른 이메일 형식이 아닙니다.',
    }),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`)
    .max(PASSWORD_MAX_LENGTH, `비밀번호는 ${PASSWORD_MAX_LENGTH}자 이하로 입력해주세요.`)
    .refine((value) => !validatePasswordClient(value), {
      message: '비밀번호 형식을 확인해주세요.',
    }),
});

export const postFormSchema = z.object({
  category: z.enum(['review', 'free', 'info', 'feature', 'notice']),
  isPinned: z.boolean(),
  title: requiredText('제목')
    .max(POST_TITLE_MAX_LENGTH, `${POST_TITLE_MAX_LENGTH}자 이하로 입력해주세요.`)
    .refine((value) => !validateBoardTextClient(value, POST_TITLE_MAX_LENGTH), {
      message: '제목에 스크립트, CSS, HTML 태그는 입력할 수 없습니다.',
    }),
  content: requiredText('본문').refine(
    (value) => !validateBoardTextClient(value, POST_CONTENT_MAX_LENGTH),
    { message: `${POST_CONTENT_MAX_LENGTH}자 이하로 입력해주세요.` },
  ),
});

export const commentFormSchema = z.object({
  content: requiredText('댓글').refine(
    (value) => !validateBoardTextClient(value, COMMENT_CONTENT_MAX_LENGTH),
    { message: `${COMMENT_CONTENT_MAX_LENGTH}자 이하로 입력해주세요.` },
  ),
});

export const attendanceFormSchema = z.object({
  watchType: z.enum(['stadium', 'home']),
  memo: z
    .string()
    .max(
      ATTENDANCE_MEMO_MAX_LENGTH,
      `${ATTENDANCE_MEMO_MAX_LENGTH}자 이하로 입력해주세요.`,
    )
    .refine(
      (value) =>
        !value.trim() ||
        !validateBoardTextClient(value, ATTENDANCE_MEMO_MAX_LENGTH),
      { message: '메모에 스크립트, CSS, HTML 태그는 입력할 수 없습니다.' },
    ),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type PostFormValues = z.infer<typeof postFormSchema>;
export type CommentFormValues = z.infer<typeof commentFormSchema>;
export type AttendanceFormValues = z.infer<typeof attendanceFormSchema>;
