'use client';

import {
  CSSProperties,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface DropdownPortalProps {
  /** Elemento ancla respecto al cual se posiciona el menú. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Controla si el menú flotante está visible. */
  open: boolean;
  /** Ref opcional expuesta al padre para comprobaciones de clic externo. */
  menuRef?: RefObject<HTMLDivElement | null>;
  /** Altura máxima deseada del menú en píxeles (default: 240). */
  maxHeight?: number;
  /** Separación vertical entre el ancla y el menú en píxeles (default: 4). */
  gap?: number;
  /** Permite que el menú crezca horizontalmente más allá del ancho del ancla para mostrar textos completos. */
  allowWider?: boolean;
  className?: string;
  children: ReactNode;
}

const VIEWPORT_MARGIN = 8;
const MIN_USABLE_HEIGHT = 120;

export function DropdownPortal({
  anchorRef,
  open,
  menuRef,
  maxHeight = 240,
  gap = 4,
  allowWider = false,
  className,
  children,
}: Readonly<DropdownPortalProps>) {
  const internalRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<CSSProperties | null>(null);

  const assignRef = useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node;
      if (menuRef && 'current' in menuRef) {
        (menuRef as { current: HTMLDivElement | null }).current = node;
      }
    },
    [menuRef],
  );

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    const spaceBelow = Math.max(0, viewportH - rect.bottom - gap - VIEWPORT_MARGIN);
    const spaceAbove = Math.max(0, rect.top - gap - VIEWPORT_MARGIN);
    const contentHeight = internalRef.current?.scrollHeight || maxHeight;
    const desiredHeight = Math.min(maxHeight, contentHeight);

    const openUpward = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove : spaceBelow;
    const computedMaxHeight = Math.max(
      Math.min(MIN_USABLE_HEIGHT, availableSpace || maxHeight),
      Math.min(maxHeight, availableSpace),
    );

    const nextStyle: CSSProperties = {
      position: 'fixed',
      zIndex: 2000,
      maxHeight: computedMaxHeight > 0 ? computedMaxHeight : maxHeight,
    };

    if (openUpward) {
      nextStyle.bottom = viewportH - rect.top + gap;
    } else {
      nextStyle.top = rect.bottom + gap;
    }

    const maxViewportWidth = Math.max(160, viewportW - VIEWPORT_MARGIN * 2);
    if (allowWider) {
      const measuredWidth = internalRef.current?.offsetWidth ?? rect.width;
      const effectiveWidth = Math.min(Math.max(rect.width, measuredWidth), maxViewportWidth);
      const clampedLeft = Math.max(
        VIEWPORT_MARGIN,
        Math.min(rect.left, viewportW - effectiveWidth - VIEWPORT_MARGIN),
      );
      nextStyle.left = clampedLeft;
      nextStyle.minWidth = Math.min(rect.width, maxViewportWidth);
      nextStyle.width = 'max-content';
      nextStyle.maxWidth = maxViewportWidth;
    } else {
      const clampedWidth = Math.min(rect.width, maxViewportWidth);
      const clampedLeft = Math.max(
        VIEWPORT_MARGIN,
        Math.min(rect.left, viewportW - clampedWidth - VIEWPORT_MARGIN),
      );
      nextStyle.left = clampedLeft;
      nextStyle.width = clampedWidth;
    }

    setCoords(nextStyle);
  }, [allowWider, anchorRef, gap, maxHeight]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition, children]);

  useEffect(() => {
    if (!open) return;

    const handleReposition = () => updatePosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, updatePosition]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      ref={assignRef}
      style={coords ?? { position: 'fixed', zIndex: 2000, visibility: 'hidden' }}
      className={cn(
        'fixed z-[2000] overflow-y-auto overscroll-contain',
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}

