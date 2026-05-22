export const EMAIL_MAX_LENGTH = 255;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9_]+$/;

const BLOCKED_INPUT_PATTERNS = [
  /<script\b/i,
  /<\/script>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /<style\b/i,
  /expression\s*\(/i,
  /@import/i,
  /url\s*\(\s*javascript/i,
];

function containsBlockedPayload(value: string) {
  return BLOCKED_INPUT_PATTERNS.some((pattern) => pattern.test(value));
}

function stripControlCharacters(value: string) {
  return value
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');
}

export function sanitizePlainText(value: string, maxLength: number) {
  return stripControlCharacters(value.replace(/<[^>]*>/g, ''))
    .trim()
    .slice(0, maxLength);
}

export function validateEmailClient(email: string) {
  const sanitized = sanitizePlainText(email, EMAIL_MAX_LENGTH).toLowerCase();

  if (!sanitized || !EMAIL_PATTERN.test(sanitized)) {
    return '올바른 이메일 형식이 아닙니다.';
  }

  if (containsBlockedPayload(sanitized)) {
    return '허용되지 않는 문자가 포함되어 있습니다.';
  }

  return null;
}

export function validatePasswordClient(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`;
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `비밀번호는 ${PASSWORD_MAX_LENGTH}자 이하로 입력해주세요.`;
  }

  if (containsBlockedPayload(password)) {
    return '허용되지 않는 문자가 포함되어 있습니다.';
  }

  return null;
}

export function validateNicknameClient(nickname: string) {
  const sanitized = sanitizePlainText(nickname, NICKNAME_MAX_LENGTH);

  if (sanitized.length < NICKNAME_MIN_LENGTH) {
    return `닉네임은 ${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자로 입력해주세요.`;
  }

  if (!NICKNAME_PATTERN.test(sanitized)) {
    return '닉네임은 한글, 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.';
  }

  if (containsBlockedPayload(sanitized)) {
    return '허용되지 않는 문자가 포함되어 있습니다.';
  }

  return null;
}
