'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper';

import 'swiper/css';

export type SeasonTimelineSlide = {
  key: string;
  isToday: boolean;
  content: ReactNode;
};

type Props = {
  slides: SeasonTimelineSlide[];
  /** 처음 열었을 때 가운데에 둘 칸. 오늘 경기, 없으면 가장 가까운 다음 경기. */
  initialIndex: number;
};

/**
 * 최근 기록 → 다가오는 경기를 한 줄로 넘겨 보는 타임라인.
 * 처음에는 오늘(없으면 다음 경기) 칸이 가운데 오고, 좌우 화살표나 밀기로 넘긴다.
 */
export function SeasonTimeline({ slides, initialIndex }: Props) {
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const syncEdges = useCallback((instance: SwiperInstance) => {
    setEdges({ start: instance.isBeginning, end: instance.isEnd });
  }, []);

  // Swiper 는 처음 만들어질 때만 시작 칸을 읽는다. 기록·일정이 늦게 들어와 칸 수가
  // 바뀌면 오늘 칸으로 다시 옮긴다. (사용자가 넘긴 뒤에는 칸 수가 바뀔 때만 움직인다)
  useEffect(() => {
    if (!swiper || swiper.destroyed) {
      return;
    }

    swiper.update();
    swiper.slideTo(initialIndex, 0);
    syncEdges(swiper);
  }, [swiper, initialIndex, slides.length, syncEdges]);

  return (
    <div className="season-timeline">
      <Swiper
        centeredSlides
        centeredSlidesBounds
        className="season-swiper"
        grabCursor
        initialSlide={initialIndex}
        onAfterInit={syncEdges}
        onResize={syncEdges}
        onSlideChange={syncEdges}
        onSwiper={(instance) => {
          setSwiper(instance);
          syncEdges(instance);
        }}
        onReachBeginning={syncEdges}
        onReachEnd={syncEdges}
        slidesPerView="auto"
        spaceBetween={8}
      >
        {slides.map((slide) => (
          <SwiperSlide
            className={`season-slide${slide.isToday ? ' is-today' : ''}`}
            key={slide.key}
          >
            {slide.isToday ? (
              <span className="season-slide__badge">오늘</span>
            ) : null}
            {slide.content}
          </SwiperSlide>
        ))}
      </Swiper>
      <button
        aria-label="이전 경기"
        className="season-timeline__nav season-timeline__nav--prev"
        disabled={edges.start}
        onClick={() => swiper?.slidePrev()}
        type="button"
      >
        <ChevronLeft aria-hidden="true" size={18} strokeWidth={2.4} />
      </button>
      <button
        aria-label="다음 경기"
        className="season-timeline__nav season-timeline__nav--next"
        disabled={edges.end}
        onClick={() => swiper?.slideNext()}
        type="button"
      >
        <ChevronRight aria-hidden="true" size={18} strokeWidth={2.4} />
      </button>
    </div>
  );
}
