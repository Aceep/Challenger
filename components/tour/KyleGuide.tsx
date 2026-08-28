"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Rich } from "@/app/(player)/help/HelpView";
import { Kyle } from "@/components/ui/Kyle";
import { STEP_PARAM, TOUR_PARAM, TOURS, clampStep, isTourId, resolvePath, skipKey, tourHref, type TourStep } from "@/lib/tour/steps";

type Rect = { top: number; left: number; width: number; height: number };

/** How long we keep looking for the step's target before centring the bubble. */
const TARGET_TIMEOUT = 1500;

export type KyleGuideProps = {
  /** "" in the real app, "/demo" on the public demo. */
  base: "" | "/demo";
  /** Real app only: marks the user as onboarded when the visit ends. */
  onFinish?: () => Promise<void> | void;
};

/**
 * Kyle's guided tour. The state lives in the URL (`?tour=player&step=3`) so it
 * survives navigation and reloads and can be shared; `sessionStorage` only
 * remembers a « Passer » so the auto-start does not fire again.
 */
export function KyleGuide(props: KyleGuideProps) {
  return (
    <Suspense fallback={null}>
      <Guide {...props} />
    </Suspense>
  );
}

function Guide({ base, onFinish }: KyleGuideProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const raw = search.get(TOUR_PARAM);
  const tour = isTourId(raw) ? raw : null;
  const steps = tour ? TOURS[tour] : null;
  const index = tour ? clampStep(tour, Number(search.get(STEP_PARAM) ?? 0)) : 0;
  const step: TourStep | null = steps ? steps[index] : null;

  // The step lives on another route: go there, keeping the tour state.
  const wanted = step ? resolvePath(step.path, base) : null;
  useEffect(() => {
    if (tour && wanted && wanted !== pathname) router.push(tourHref(tour, index, base));
  }, [tour, wanted, pathname, router, index, base]);

  const go = useCallback(
    (n: number) => {
      if (tour) router.push(tourHref(tour, n, base));
    },
    [tour, router, base],
  );

  const close = useCallback(async () => {
    if (tour) {
      try {
        sessionStorage.setItem(skipKey(tour), "1");
      } catch {
        // Private mode: the auto-start may fire again, harmless.
      }
    }
    router.replace(pathname);
    await onFinish?.();
  }, [tour, router, pathname, onFinish]);

  if (!tour || !steps || !step || wanted !== pathname) return null;
  return <Overlay key={`${tour}:${index}`} step={step} index={index} total={steps.length} go={go} close={close} />;
}

type OverlayProps = {
  step: TourStep;
  index: number;
  total: number;
  go: (n: number) => void;
  close: () => Promise<void>;
};

/**
 * One step: finds and follows its target, then draws the spotlight and Kyle's
 * bubble in a portal. Remounted on every step (keyed), so its state resets on
 * its own instead of being cleared from an effect.
 */
function Overlay({ step, index, total, go, close }: OverlayProps) {
  const [rect, setRect] = useState<Rect | null>(null);
  // Without a target we are ready immediately: the bubble is simply centred.
  const [ready, setReady] = useState(!step.target);

  useEffect(() => {
    const selector = step.target ? `[data-tour="${step.target}"]` : null;
    if (!selector) return;

    let frame = 0;
    let node: HTMLElement | null = null;
    let observer: ResizeObserver | null = null;
    const started = Date.now();

    const measure = () => {
      if (!node) return;
      const r = node.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const look = () => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) {
        node = el;
        // Instant, not smooth: the page is frozen as soon as we are ready.
        el.scrollIntoView({ block: "center" });
        observer = new ResizeObserver(measure);
        observer.observe(el);
        measure();
        setReady(true);
        return;
      }
      // The page may still be streaming in: retry until we give up.
      if (Date.now() - started > TARGET_TIMEOUT) return setReady(true);
      frame = requestAnimationFrame(look);
    };
    frame = requestAnimationFrame(look);

    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [step.target]);

  // Freeze the page behind the spotlight — only once the target was scrolled to,
  // otherwise `scrollIntoView` would have nothing left to scroll.
  useEffect(() => {
    if (!ready) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void close();
      else if (e.key === "ArrowRight" && index < total - 1) go(index + 1);
      else if (e.key === "ArrowLeft" && index > 0) go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, total, go, close]);

  const style = useMemo(() => bubbleStyle(rect, step.placement), [rect, step.placement]);

  if (!ready || typeof document === "undefined") return null;
  const last = index === total - 1;

  return createPortal(
    <div className="kyle-tour">
      <div className="kyle-spot" style={rect ? spotStyle(rect) : undefined} aria-hidden />
      <div className={`kyle-guide${rect ? "" : " centered"}`} style={style} role="dialog" aria-modal="true" aria-label={step.title}>
        <div className="head">
          <Kyle width={56} alt="" />
          <div className="min-w-0">
            <p className="eyebrow">
              Visite guidée · {index + 1} / {total}
            </p>
            <h2>{step.title}</h2>
          </div>
        </div>
        <p className="body">
          <Rich text={step.body} />
        </p>
        <div className="dots" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <i key={i} className={i === index ? "on" : ""} />
          ))}
        </div>
        <div className="acts">
          <button type="button" className="btn sm ghost" onClick={() => go(index - 1)} disabled={index === 0}>
            Précédent
          </button>
          <button type="button" className="skip" onClick={() => void close()}>
            Passer
          </button>
          <button type="button" className="btn sm" onClick={() => (last ? void close() : go(index + 1))}>
            {last ? "C'est parti !" : "Suivant"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The hole in the dimmed overlay, drawn with a very large outer shadow. */
function spotStyle(rect: Rect): React.CSSProperties {
  const pad = 6;
  return {
    top: Math.max(0, rect.top - pad),
    left: Math.max(0, rect.left - pad),
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

/**
 * Mobile-first: the bubble is fixed at the bottom (above the BottomNav) and
 * only moves next to its target when the viewport is wide enough.
 */
function bubbleStyle(rect: Rect | null, placement?: "top" | "bottom"): React.CSSProperties | undefined {
  if (!rect || typeof window === "undefined" || window.innerWidth < 720) return undefined;
  const width = Math.min(420, window.innerWidth - 32);
  const height = 260; // generous estimate: only used to pick a side
  const below = placement !== "top" && rect.top + rect.height + height + 24 < window.innerHeight;
  const top = below ? rect.top + rect.height + 12 : Math.max(12, rect.top - height - 12);
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12);
  return { top, left, width, right: "auto", bottom: "auto" };
}
