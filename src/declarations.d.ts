declare module "*.css";

declare module "@dragdroptouch/drag-drop-touch" {
  export interface EnableDragDropTouchOptions {
    readonly allowDragScroll?: boolean;
    readonly contextMenuDelayMS?: number;
    readonly dragImageOpacity?: number;
    readonly dragScrollPercentage?: number;
    readonly dragScrollSpeed?: number;
    readonly dragThresholdPixels?: number;
    readonly isPressHoldMode?: boolean;
    readonly forceListen?: boolean;
    readonly pressHoldDelayMS?: number;
    readonly pressHoldMargin?: number;
    readonly pressHoldThresholdPixels?: number;
  }
  export function enableDragDropTouch(
    dragRoot?: Element | Document,
    dropRoot?: Element | Document,
    options?: EnableDragDropTouchOptions,
  ): void;
}
