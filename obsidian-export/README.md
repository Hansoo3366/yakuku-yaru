# Obsidian 문서보내기

`yakuku-yaru` 프로젝트용 옵시디언 노트 모음입니다.

## 복사 방법

```bash
# vault가 ~/Documents/Obsidian 이라면
cp -R obsidian-export/Projects/야크크\ 야르\ 섹시야구 ~/Documents/Obsidian/Projects/
```

또는 vault root를 레포로 두고 `obsidian-export/Projects/야크크 야르 섹시야구/`만 symlink:

```bash
ln -s /path/to/yakuku-yaru/obsidian-export/Projects/야크크\ 야르\ 섹시야구 \
  ~/Documents/Obsidian/Projects/야크크\ 야르\ 섹시야구
```

## 진입점

프로젝트 폴더의 **[[Projects/야크크 야르 섹시야구/README]]** (인덱스)부터 열면 됩니다.

## 폴더 구조

```
Projects/야크크 야르 섹시야구/
├─ README.md          ← 인덱스 (시작점)
├─ 00~06 *.md         ← 개요·설계·운영
├─ Decisions/         ← 의사결정 기록
├─ Issues/            ← 문제·해결
├─ Features/          ← 기능 상세
├─ Snippets/          ← 재사용 코드 조각
└─ 회고.md
```

## 레포 `docs/`와의 관계

| Obsidian | 레포 원본 |
|----------|-----------|
| 요약·의사결정·이슈·회고 | `docs/`에 없음 (옵시디언 전용) |
| DB·화면·배포·KBO | `docs/database.md` 등에서 발췌·재구성 |
| API·디자인 상세 | 레포 `docs/`만 참고 (인덱스 표에 링크) |

상세 스펙은 레포 `docs/`를, 맥락·결정·회고는 Obsidian 노트를 보면 됩니다.
