/* eslint-disable @next/next/no-img-element */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatKoreanDateShort } from '@/lib/date-format';
import { getPlayerCheerType, type PlayerCheer } from '@/lib/player-cheer-api';
import { getPlayerProfileImageSrc } from '@/lib/player-image';
import { fetchPublicPlayerCheerResult } from '@/lib/server-baseball-api';
import { getAbsoluteUrl } from '@/lib/site-url';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { extractYoutubeId } from '@/lib/youtube';
import styles from './player-cheer.module.css';

/**
 * 선수 한 명의 응원가 페이지.
 * 응원가 목록에서는 가사가 클릭해야 뜨는 창 안에 있어 크롤러가 읽을 수 없다.
 * 이 페이지는 서버에서 가사와 영상을 그대로 HTML 로 내보내 검색·AI 가 읽을 수 있게 한다.
 */
type PlayerCheerPageProps = {
  params: Promise<{ playerId: string }>;
};

function parsePlayerId(value: string) {
  const playerId = Number(value);

  return Number.isInteger(playerId) && playerId > 0 ? playerId : null;
}

function hasCheer(player: PlayerCheer) {
  return Boolean(player.cheerId);
}

function summarizeLyrics(lyrics: string | null, maxLength = 110) {
  if (!lyrics) {
    return null;
  }

  const text = lyrics.replace(/\s+/g, ' ').trim();

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function describePlayer(player: PlayerCheer) {
  return [
    player.teamName,
    player.backNumber ? `No.${player.backNumber}` : null,
    player.position,
  ]
    .filter(Boolean)
    .join(' · ');
}

export async function generateMetadata({
  params,
}: PlayerCheerPageProps): Promise<Metadata> {
  const playerId = parsePlayerId((await params).playerId);
  const { item: player } = playerId
    ? await fetchPublicPlayerCheerResult(playerId)
    : { item: null };

  if (!player) {
    return { title: 'KBO 선수 응원가' };
  }

  const cheerType = getPlayerCheerType(player);
  const title = `${player.name} ${cheerType} 가사 - ${player.teamName}`;
  const lyricSummary = summarizeLyrics(player.lyrics);
  const description = hasCheer(player)
    ? `${describePlayer(player)} ${player.name} 선수의 ${cheerType} 가사와 영상입니다.${lyricSummary ? ` ${lyricSummary}` : ''}`
    : `${describePlayer(player)} ${player.name} 선수의 ${cheerType}는 아직 등록되지 않았습니다.`;
  const canonical = `/cheers/${player.playerId}`;

  return {
    title,
    description,
    alternates: { canonical },
    // 응원가가 아직 없는 선수의 페이지는 내용이 없으므로 검색에 올리지 않는다.
    robots: hasCheer(player) ? undefined : { index: false, follow: true },
    openGraph: { type: 'article', url: canonical, title, description },
  };
}

export default async function PlayerCheerPage({
  params,
}: PlayerCheerPageProps) {
  const playerId = parsePlayerId((await params).playerId);

  if (!playerId) {
    notFound();
  }

  const { item: player, missing } =
    await fetchPublicPlayerCheerResult(playerId);

  if (missing) {
    notFound();
  }

  if (!player) {
    return (
      <main className={`app-shell ${styles.page}`}>
        <Link className={styles.back} href="/cheers">
          ← 응원가 목록
        </Link>
        <p className={styles.empty}>
          응원가를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      </main>
    );
  }

  const cheerType = getPlayerCheerType(player);
  const youtubeId = player.youtubeId ?? extractYoutubeId(player.youtubeUrl);
  const lyricSummary = summarizeLyrics(player.lyrics);
  const jsonLd = hasCheer(player)
    ? {
        '@context': 'https://schema.org',
        '@type': 'MusicComposition',
        name: `${player.name} ${cheerType}`,
        alternateName: player.cheerTitle ?? undefined,
        inLanguage: 'ko',
        url: getAbsoluteUrl(`/cheers/${player.playerId}`),
        dateModified: player.cheerUpdatedAt ?? undefined,
        about: {
          '@type': 'Person',
          name: player.name,
          jobTitle: player.position ?? undefined,
          memberOf: {
            '@type': 'SportsTeam',
            name: player.teamName,
            sport: 'Baseball',
          },
        },
        ...(player.lyrics
          ? { lyrics: { '@type': 'CreativeWork', text: player.lyrics } }
          : {}),
        // Google 은 VideoObject 에 썸네일과 게시일이 없으면 검색 결과에 쓰지 않는다.
        // 게시일은 이 사이트에 응원가를 등록한 날짜로 둔다. 그 값마저 없으면 영상 항목을 빼고 가사만 둔다.
        ...(youtubeId && player.cheerUpdatedAt
          ? {
              video: {
                '@type': 'VideoObject',
                name: `${player.name} ${cheerType} 영상`,
                description:
                  `${player.teamName} ${player.name} 선수의 ${cheerType} 영상입니다.` +
                  (lyricSummary ? ` ${lyricSummary}` : ''),
                thumbnailUrl: [
                  `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
                ],
                uploadDate: player.cheerUpdatedAt,
                embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
              },
            }
          : {}),
      }
    : null;

  return (
    <main className={`app-shell ${styles.page}`}>
      {jsonLd ? (
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
          type="application/ld+json"
        />
      ) : null}

      <Link className={styles.back} href="/cheers">
        ← 응원가 목록
      </Link>

      <header className={styles.header}>
        <img
          alt=""
          className={styles.photo}
          height={88}
          src={getPlayerProfileImageSrc(player.profileImageUrl)}
          width={88}
        />
        <div className={styles.identity}>
          <span className={styles.team}>
            <img
              alt=""
              height={20}
              src={getTeamLogoSrc({ shortName: player.teamShortName })}
              width={20}
            />
            {player.teamName}
          </span>
          <h1>
            {player.name} {cheerType}
          </h1>
          <p>
            {[
              player.backNumber ? `No.${player.backNumber}` : null,
              player.position,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </header>

      {hasCheer(player) ? (
        <article className={styles.body}>
          {youtubeId ? (
            <div className={styles.video}>
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                title={`${player.name} ${cheerType} 영상`}
              />
            </div>
          ) : null}

          <section
            aria-labelledby="cheer-lyrics-title"
            className={styles.lyrics}
          >
            <h2 id="cheer-lyrics-title">
              {player.cheerTitle && player.cheerTitle !== cheerType
                ? `가사 · ${player.cheerTitle}`
                : '가사'}
            </h2>
            {player.lyrics ? (
              <p>{player.lyrics}</p>
            ) : (
              <p className={styles.muted}>
                가사는 아직 등록되지 않았어요. 영상으로 확인해 주세요.
              </p>
            )}
          </section>

          {player.cheerUpdatedAt ? (
            <p className={styles.updated}>
              {formatKoreanDateShort(player.cheerUpdatedAt)} 업데이트
            </p>
          ) : null}
        </article>
      ) : (
        <p className={styles.empty}>
          {player.name} 선수의 {cheerType}는 아직 준비 중이에요.
        </p>
      )}

      <Link className={styles.more} href="/cheers">
        다른 선수 응원가 보기 →
      </Link>
    </main>
  );
}
