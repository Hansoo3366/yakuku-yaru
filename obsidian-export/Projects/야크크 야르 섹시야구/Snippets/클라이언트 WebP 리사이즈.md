# 클라이언트 WebP 리사이즈

**위치**: `apps/web/src/lib/attendance-api.ts` — `optimizeAttendancePhoto`  
(프로필: `apps/web/src/lib/auth-api.ts` — `optimizeProfilePhoto`)

```typescript
const bitmap = await createImageBitmap(file);
const scale = Math.min(1, TARGET_SIZE / Math.max(bitmap.width, bitmap.height));
const width = Math.max(1, Math.round(bitmap.width * scale));
const height = Math.max(1, Math.round(bitmap.height * scale));

const canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height;
context.drawImage(bitmap, 0, 0, width, height);
bitmap.close();

const blob = await new Promise<Blob | null>((resolve) => {
  canvas.toBlob(resolve, 'image/webp', 0.84);
});

return new File([blob], 'attendance-photo.webp', { type: 'image/webp' });
```

## 재사용 포인트

- 업로드 전 용량·해상도 제한 (서버 부하 감소)
- HEIC/AVIF 등 `createImageBitmap` 지원 포맷 일괄 처리
- 서버 `sharp`와 이중 최적화

## 관련

- [[Features/직관 집관 기록]]
