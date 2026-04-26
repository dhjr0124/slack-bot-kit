import type { Block as BoltBlock, KnownBlock, View } from "@slack/bolt";

export type Block = KnownBlock | BoltBlock;
export type Blocks = Block[];
export type ViewFunction<T> = (props: T) => View;
export type ViewType = "home" | "modal" | "workflow_step";
