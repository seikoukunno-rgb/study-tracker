import type React from "react";

/**
 * PC（マウス）でスワイプ操作を再現するためのヘルパー。
 *
 * タッチ操作は既存の onTouch* ハンドラが担当するので、ここでは
 * pointerType === "mouse" のときだけ動作する（スマホ/iPad/タブレットの挙動は変えない）。
 *
 * 使い方: <div onPointerDown={(e) => startMouseDrag(e, { onStart, onMove, onEnd })} />
 *  - onMove / onEnd には「押下位置からの移動量 (dx, dy)」が渡る
 *  - 画面外でボタンを離しても window で拾うので、ドラッグが固まらない
 *  - 6px 以上動いたら didDrag = true になり、直後の click を抑止するために使える
 */
export type MouseDragHandlers = {
  onStart?: () => void;
  onMove?: (dx: number, dy: number) => void;
  onEnd?: (dx: number, dy: number, didDrag: boolean) => void;
};

const DRAG_THRESHOLD = 6;

export function startMouseDrag(
  e: React.PointerEvent<HTMLElement>,
  handlers: MouseDragHandlers
) {
  // タッチ・ペンは既存のタッチ処理に任せる。左クリックのみ対象。
  if (e.pointerType !== "mouse" || e.button !== 0) return;

  const startX = e.clientX;
  const startY = e.clientY;
  let didDrag = false;

  handlers.onStart?.();

  const handleMove = (ev: PointerEvent) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (!didDrag && Math.hypot(dx, dy) > DRAG_THRESHOLD) didDrag = true;
    handlers.onMove?.(dx, dy);
  };

  const cleanup = () => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
    window.removeEventListener("pointercancel", handleCancel);
  };

  const handleUp = (ev: PointerEvent) => {
    cleanup();
    handlers.onEnd?.(ev.clientX - startX, ev.clientY - startY, didDrag);
  };

  const handleCancel = () => {
    cleanup();
    handlers.onEnd?.(0, 0, false);
  };

  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", handleUp);
  window.addEventListener("pointercancel", handleCancel);
}
