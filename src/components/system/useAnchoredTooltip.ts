import { useCallback, useId, useMemo, useState } from "react";

export interface AnchoredTooltipState<Id extends string = string> {
  readonly idBase: string;
  readonly openId: Id | null;
  readonly anchorRect: DOMRect | null;
  readonly isOpen: (id: Id) => boolean;
  readonly describedBy: (id: Id) => string | undefined;
  readonly open: (id: Id, el: HTMLElement) => void;
  readonly close: (id: Id) => void;
  readonly closeAll: () => void;
}

/**
 * Centralizes a common tooltip pattern used across components: manage a single
 * open tooltip identified by a stable id, and expose helpers for aria-describedby
 * and anchor rect capture. Pair with useEscapeToClose in the component to close
 * on Escape when open.
 */
export function useAnchoredTooltip<Id extends string = string>(): AnchoredTooltipState<Id> {
  const idBase = useId();
  const [openId, setOpenId] = useState<Id | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const open = useCallback((id: Id, el: HTMLElement) => {
    setOpenId(id);
    setAnchorRect(el.getBoundingClientRect());
  }, []);

  const close = useCallback((id: Id) => {
    setOpenId((prev) => (prev === id ? null : prev));
    setAnchorRect((prev) => (openId === id ? null : prev));
  }, [openId]);

  const closeAll = useCallback(() => {
    setOpenId(null);
    setAnchorRect(null);
  }, []);

  const isOpen = useCallback((id: Id) => openId === id, [openId]);

  const describedBy = useCallback(
    (id: Id) => (openId === id ? `${idBase}-${id}` : undefined),
    [idBase, openId],
  );

  return useMemo(
    () => ({ idBase, openId, anchorRect, isOpen, describedBy, open, close, closeAll }),
    [idBase, openId, anchorRect, isOpen, describedBy, open, close, closeAll],
  );
}
