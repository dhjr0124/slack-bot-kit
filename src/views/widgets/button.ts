export interface ButtonOptions {
  text: string;
  actionId: string;
  value?: string;
  style?: "primary" | "danger";
  url?: string;
}

export function Button(options: ButtonOptions): Record<string, unknown> {
  const block: Record<string, unknown> = {
    type: "button",
    text: { type: "plain_text", text: options.text, emoji: true },
    action_id: options.actionId,
  };
  if (options.value !== undefined) block["value"] = options.value;
  if (options.style !== undefined) block["style"] = options.style;
  if (options.url !== undefined) block["url"] = options.url;
  return block;
}
