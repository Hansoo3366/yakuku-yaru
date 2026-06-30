'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import type { AttendanceHonorTitle } from '@/lib/attendance-score';

import 'swiper/css';

type Props = {
  titles: AttendanceHonorTitle[];
};

export function HonorTitleSwiper({ titles }: Props) {
  return (
    <Swiper
      aria-label="명예타이틀"
      className="home-title-swiper"
      freeMode={{
        enabled: true,
        momentumRatio: 0.35,
      }}
      grabCursor
      modules={[FreeMode]}
      slidesPerView="auto"
      spaceBetween={6}
    >
      {titles.map((title) => (
        <SwiperSlide
          className="home-title-swiper-slide"
          key={title.key}
          style={{ width: 'auto' }}
        >
          <span
            className="profile-title-pill home-title-pill"
            data-description={title.description}
            data-kind={title.kind}
            tabIndex={0}
          >
            {title.label}
          </span>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
