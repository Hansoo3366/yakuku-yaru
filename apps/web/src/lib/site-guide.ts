/** 가이드 내용이 크게 바뀌면 버전을 올려 모든 사용자에게 다시 보여준다. */
export const SITE_GUIDE_STORAGE_KEY = 'yakuku.siteGuideSeen.v1';
export const SITE_GUIDE_OPEN_EVENT = 'yakuku:open-site-guide';

/** 첫 방문이어도 가이드를 띄우지 않을 화면 (발표, 관리자, 메일 링크 착지 페이지 등) */
export const SITE_GUIDE_SKIP_PATHS = [
  '/presentation',
  '/admin',
  '/verify-email',
  '/reset-password',
  '/offline',
];

export function openSiteGuide() {
  window.dispatchEvent(new Event(SITE_GUIDE_OPEN_EVENT));
}

export function hasSeenSiteGuide() {
  try {
    return window.localStorage.getItem(SITE_GUIDE_STORAGE_KEY) === 'true';
  } catch {
    // 저장소를 못 쓰는 환경에서는 매번 띄우지 않도록 본 것으로 처리한다.
    return true;
  }
}

export function markSiteGuideSeen() {
  try {
    window.localStorage.setItem(SITE_GUIDE_STORAGE_KEY, 'true');
  } catch {
    // 무시
  }
}
