# PWA Spec

## Goal

야크크 야르~ 섹시야구를 모바일 브라우저에서 홈 화면에 추가해 앱처럼 사용할 수 있게 합니다.

## Required PWA Features

- Web App Manifest
- App icon
- Theme color
- Standalone display mode
- Service worker
- Offline fallback page

## Manifest Draft

```json
{
  "name": "야크크 야르~ 섹시야구",
  "short_name": "Yakuku",
  "description": "야구 직관 기록 캘린더",
  "start_url": "/calendar",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0f766e",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## Offline Strategy

현재 버전에서는 단순한 fallback을 사용합니다.

- 앱 shell 캐싱
- 오프라인 상태에서는 안내 화면 표시
- API 데이터 오프라인 수정/동기화는 초기 범위에서 제외

## Push Notification

경기 알림 기능은 단계적으로 구현합니다.

### Current

- 경기 상세에서 알림 설정 UI 제공
- 사용자가 알림 설정을 저장하면 DB에 저장
- 실제 브라우저 푸시 발송은 아직 제외

### Later

- Web Push API 사용
- 사용자 브라우저 구독 정보 저장
- 경기 시작 전 서버 스케줄러로 푸시 발송

## Install UX

- 브라우저가 설치 가능하다고 판단하면 홈 화면 추가 안내를 표시한다.
- iOS는 브라우저 제약이 있으므로 Safari 공유 메뉴 안내가 필요할 수 있다.

## Notes

- PWA는 앱스토어 설치 앱이 아니라 웹앱이다.
- iOS/Android에서 지원 기능이 다를 수 있으므로 알림은 별도 검증이 필요하다.
