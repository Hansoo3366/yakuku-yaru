'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import type { AttendanceHonorTitle } from '@/lib/attendance-score';

import 'swiper/css';

type Props = {
  titles: AttendanceHonorTitle[];
};

type Tip = {
  key: string;
  text: string;
  /** 칩 가운데의 화면 x 좌표 */
  anchorX: number;
  /** 칩 위쪽 끝의 화면 y 좌표 */
  anchorTop: number;
};

const VIEWPORT_GUTTER = 8;

/**
 * 홈 '내 시즌'의 명예타이틀 칩.
 * 칩 줄은 카드 밖으로 넘치지 않게 잘라 두므로, 설명 툴팁은 그 안이 아니라
 * 화면 맨 위층(body)에 띄운다. 칩 위에 놓고 화면 가장자리에서는 안쪽으로 민다.
 */
export function HonorTitleSwiper({ titles }: Props) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [tipLeft, setTipLeft] = useState<number | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);

  const showTip = useCallback(
    (element: HTMLElement, title: AttendanceHonorTitle) => {
      if (!title.description) {
        return;
      }

      const rect = element.getBoundingClientRect();
      anchorRef.current = element;
      setTipLeft(null);
      setTip({
        key: title.key,
        text: title.description,
        anchorX: rect.left + rect.width / 2,
        anchorTop: rect.top,
      });
    },
    [],
  );

  const hideTip = useCallback(() => {
    anchorRef.current = null;
    setTip(null);
  }, []);

  // 모바일은 마우스 올림이 없으므로 탭으로 열고 닫는다. 바깥을 탭하면 닫는다.
  const tipOpen = tip !== null;

  useEffect(() => {
    if (!tipOpen) {
      return;
    }

    const closeOnOutside = (event: PointerEvent) => {
      if (
        anchorRef.current &&
        event.target instanceof Node &&
        anchorRef.current.contains(event.target)
      ) {
        return;
      }

      hideTip();
    };

    document.addEventListener('pointerdown', closeOnOutside);

    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [hideTip, tipOpen]);

  // 그려진 툴팁 폭을 재서 화면 밖으로 나가지 않게 왼쪽 위치를 맞춘다.
  useLayoutEffect(() => {
    if (!tip || !tipRef.current) {
      return;
    }

    const width = tipRef.current.offsetWidth;
    const max = window.innerWidth - width - VIEWPORT_GUTTER;
    setTipLeft(
      Math.min(Math.max(tip.anchorX - width / 2, VIEWPORT_GUTTER), max),
    );
  }, [tip]);

  // 스크롤하거나 창 크기가 바뀌면 칩을 따라 위치를 다시 잡는다. 칩이 화면 밖으로 나가면 닫는다.
  const tipKey = tip?.key ?? null;

  useEffect(() => {
    if (!tipKey) {
      return;
    }

    const follow = () => {
      const element = anchorRef.current;

      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();

      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        hideTip();
        return;
      }

      setTip((current) =>
        current
          ? {
              ...current,
              anchorX: rect.left + rect.width / 2,
              anchorTop: rect.top,
            }
          : current,
      );
    };

    window.addEventListener('scroll', follow, { passive: true });
    window.addEventListener('resize', follow);

    return () => {
      window.removeEventListener('scroll', follow);
      window.removeEventListener('resize', follow);
    };
  }, [hideTip, tipKey]);

  return (
    <>
      <Swiper
        aria-label="명예타이틀"
        className="home-title-swiper"
        freeMode={{
          enabled: true,
          momentumRatio: 0.35,
        }}
        grabCursor
        modules={[FreeMode]}
        onSliderMove={hideTip}
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
              aria-describedby={
                tip?.key === title.key ? 'honor-title-tip' : undefined
              }
              className="profile-title-pill home-title-pill"
              data-kind={title.kind}
              onBlur={hideTip}
              onClick={(event) => {
                if (tip?.key === title.key) {
                  hideTip();
                } else {
                  showTip(event.currentTarget, title);
                }
              }}
              onFocus={(event) => showTip(event.currentTarget, title)}
              onMouseEnter={(event) => showTip(event.currentTarget, title)}
              onMouseLeave={hideTip}
              tabIndex={0}
            >
              {title.label}
            </span>
          </SwiperSlide>
        ))}
      </Swiper>
      {tip
        ? createPortal(
            <div
              className="honor-title-tip"
              id="honor-title-tip"
              ref={tipRef}
              role="tooltip"
              style={{
                left: tipLeft ?? tip.anchorX,
                top: tip.anchorTop,
                visibility: tipLeft === null ? 'hidden' : 'visible',
                ['--caret-x' as string]: `${tip.anchorX - (tipLeft ?? tip.anchorX)}px`,
              }}
            >
              {tip.text}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
