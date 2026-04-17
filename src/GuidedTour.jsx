import { useEffect, useRef, useState } from 'react';

const MOBILE_BREAKPOINT = 640;
const SPOTLIGHT_PADDING = 12;
const VIEWPORT_PADDING = 16;
const CARD_WIDTH = 320;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getSpotlightRect(target) {
  if (!target) return null;
  const rect = target.getBoundingClientRect();
  if (!rect.width && !rect.height) return null;

  const top = clamp(rect.top - SPOTLIGHT_PADDING, VIEWPORT_PADDING, window.innerHeight - VIEWPORT_PADDING);
  const left = clamp(rect.left - SPOTLIGHT_PADDING, VIEWPORT_PADDING, window.innerWidth - VIEWPORT_PADDING);
  const right = clamp(rect.right + SPOTLIGHT_PADDING, VIEWPORT_PADDING, window.innerWidth - VIEWPORT_PADDING);
  const bottom = clamp(rect.bottom + SPOTLIGHT_PADDING, VIEWPORT_PADDING, window.innerHeight - VIEWPORT_PADDING);

  return {
    top,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function getCardPosition(rect, cardBox) {
  const width = cardBox?.width || CARD_WIDTH;
  const height = cardBox?.height || 240;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (!rect) {
    return {
      top: clamp((viewportHeight - height) / 2, VIEWPORT_PADDING, viewportHeight - height - VIEWPORT_PADDING),
      left: clamp((viewportWidth - width) / 2, VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING),
      placement: 'center',
    };
  }

  const gap = 18;
  const canRight = rect.left + rect.width + gap + width <= viewportWidth - VIEWPORT_PADDING;
  const canLeft = rect.left - gap - width >= VIEWPORT_PADDING;
  const canBelow = rect.top + rect.height + gap + height <= viewportHeight - VIEWPORT_PADDING;
  const canAbove = rect.top - gap - height >= VIEWPORT_PADDING;

  if (canRight) {
    return {
      top: clamp(rect.top, VIEWPORT_PADDING, viewportHeight - height - VIEWPORT_PADDING),
      left: rect.left + rect.width + gap,
      placement: 'right',
    };
  }

  if (canLeft) {
    return {
      top: clamp(rect.top, VIEWPORT_PADDING, viewportHeight - height - VIEWPORT_PADDING),
      left: rect.left - width - gap,
      placement: 'left',
    };
  }

  if (canBelow) {
    return {
      top: rect.top + rect.height + gap,
      left: clamp(rect.left, VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING),
      placement: 'bottom',
    };
  }

  if (canAbove) {
    return {
      top: rect.top - height - gap,
      left: clamp(rect.left, VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING),
      placement: 'top',
    };
  }

  return {
    top: clamp((viewportHeight - height) / 2, VIEWPORT_PADDING, viewportHeight - height - VIEWPORT_PADDING),
    left: clamp((viewportWidth - width) / 2, VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING),
    placement: 'center',
  };
}

export default function GuidedTour({ open, steps, onComplete }) {
  const [index, setIndex] = useState(0);
  const [layout, setLayout] = useState({
    rect: null,
    card: { top: VIEWPORT_PADDING, left: VIEWPORT_PADDING, placement: 'center' },
  });
  const cardRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
  }, [open, steps]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onComplete();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onComplete]);

  useEffect(() => {
    if (!open || !steps.length) return;

    let frameId = null;
    const step = steps[index];

    const measure = () => {
      frameId = null;
      const selector = step.target ? `[data-tour="${step.target}"]` : null;
      const target = selector ? document.querySelector(selector) : null;
      const rect = getSpotlightRect(target);
      const cardBox = cardRef.current?.getBoundingClientRect();
      setLayout({ rect, card: getCardPosition(rect, cardBox) });
    };

    const scheduleMeasure = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(measure);
    };

    const selector = step.target ? `[data-tour="${step.target}"]` : null;
    const target = selector ? document.querySelector(selector) : null;
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleMeasure) : null;

    observer?.observe(document.documentElement);
    if (target) observer?.observe(target);

    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('scroll', scheduleMeasure, true);
    scheduleMeasure();

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('scroll', scheduleMeasure, true);
    };
  }, [index, open, steps]);

  if (!open || !steps.length || window.innerWidth <= MOBILE_BREAKPOINT) return null;

  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <div className="tour-layer" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="tour-backdrop" />
      {layout.rect && (
        <div
          className="tour-spotlight"
          style={{
            top: `${layout.rect.top}px`,
            left: `${layout.rect.left}px`,
            width: `${layout.rect.width}px`,
            height: `${layout.rect.height}px`,
          }}
        />
      )}

      <div
        ref={cardRef}
        className={`tour-card placement-${layout.card.placement}`}
        style={{
          top: `${layout.card.top}px`,
          left: `${layout.card.left}px`,
        }}
      >
        <div className="tour-card-head">
          <span className="tour-kicker">guided tour</span>
          <span className="tour-progress">{index + 1}/{steps.length}</span>
        </div>
        <h2 id="tour-title" className="tour-title">{step.title}</h2>
        <p className="tour-body">{step.body}</p>
        <div className="tour-actions">
          <button className="tour-btn" onClick={onComplete}>skip</button>
          <button
            className="tour-btn tour-btn-primary"
            onClick={() => {
              if (isLast) onComplete();
              else setIndex((current) => current + 1);
            }}
          >
            {isLast ? 'done' : 'next'}
          </button>
        </div>
      </div>
    </div>
  );
}
