import { describe, it, expect } from "vitest";
import type { View } from "@slack/bolt";
import { composeBlocks, composeViews, extendView } from "../../src/views/compose";
import { Button, Input, StaticSelect } from "../../src/views/widgets";
import type { Blocks } from "../../src/views/types";

describe("composeBlocks", () => {
  it("flattens multiple block arrays in order", () => {
    const a: Blocks = [{ type: "section", text: { type: "plain_text", text: "A" } } as never];
    const b: Blocks = [{ type: "divider" } as never];
    const c: Blocks = [{ type: "section", text: { type: "plain_text", text: "C" } } as never];
    expect(composeBlocks(a, b, c)).toEqual([...a, ...b, ...c]);
  });

  it("returns an empty array for no inputs", () => {
    expect(composeBlocks()).toEqual([]);
  });
});

describe("composeViews", () => {
  it("merges blocks and keeps metadata from the first view", () => {
    const v1: View = {
      type: "modal",
      title: { type: "plain_text", text: "Title" },
      blocks: [{ type: "divider" } as never],
    };
    const v2: View = {
      type: "modal",
      title: { type: "plain_text", text: "ignored" },
      blocks: [{ type: "section", text: { type: "plain_text", text: "B" } } as never],
    };
    const merged = composeViews(v1, v2);
    expect(merged.title?.text).toBe("Title");
    expect(merged.blocks).toHaveLength(2);
  });
});

describe("extendView", () => {
  it("appends extra blocks to a view", () => {
    const view: View = {
      type: "modal",
      title: { type: "plain_text", text: "T" },
      blocks: [{ type: "divider" } as never],
    };
    const extended = extendView(view, { type: "divider" } as never);
    expect(extended.blocks).toHaveLength(2);
  });
});

describe("widgets", () => {
  it("Button emits the canonical Block Kit shape", () => {
    expect(Button({ text: "Go", actionId: "go-action" })).toMatchObject({
      type: "button",
      action_id: "go-action",
      text: { type: "plain_text", text: "Go", emoji: true },
    });
  });

  it("Button supports value/style/url overrides", () => {
    const b = Button({
      text: "Open",
      actionId: "x",
      value: "v",
      style: "primary",
      url: "https://example.com",
    });
    expect(b).toMatchObject({ value: "v", style: "primary", url: "https://example.com" });
  });

  it("Input uses the {name}-value action_id convention", () => {
    const input = Input({ name: "email", label: "Email" }) as {
      block_id: string;
      element: { action_id: string };
    };
    expect(input.block_id).toBe("email");
    expect(input.element.action_id).toBe("email-value");
  });

  it("Input supports multiline and initialValue", () => {
    const input = Input({
      name: "notes",
      multiline: true,
      initialValue: "draft",
    }) as { element: { multiline?: boolean; initial_value?: string } };
    expect(input.element.multiline).toBe(true);
    expect(input.element.initial_value).toBe("draft");
  });

  it("StaticSelect carries its options through", () => {
    const select = StaticSelect({
      name: "kind",
      options: [
        { text: "A", value: "a" },
        { text: "B", value: "b" },
      ],
    }) as { element: { options: { value: string }[] } };
    expect(select.element.options.map((o) => o.value)).toEqual(["a", "b"]);
  });
});
