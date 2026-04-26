import type { View } from "@slack/bolt";
import type { Block, Blocks } from "./types";

/**
 * Flatten one or more block arrays into a single Blocks array.
 * Useful when assembling a view from reusable section fragments.
 */
export function composeBlocks(...blockArrays: Blocks[]): Blocks {
  return blockArrays.flat();
}

/**
 * Merge multiple Views, taking metadata from the first and concatenating
 * blocks from all in order.
 */
export function composeViews(first: View, ...rest: View[]): View {
  const blocks = [first, ...rest].map((v) => v.blocks ?? []);
  return {
    ...first,
    blocks: composeBlocks(...(blocks as Blocks[])),
  };
}

/**
 * Append additional blocks to the end of an existing View.
 */
export function extendView(view: View, ...extra: Block[]): View {
  return {
    ...view,
    blocks: composeBlocks((view.blocks ?? []) as Blocks, extra),
  };
}
