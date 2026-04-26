export interface StaticSelectOption {
  text: string;
  value: string;
}

export interface StaticSelectOptions {
  name: string;
  options: StaticSelectOption[];
  label?: string;
  placeholder?: string;
}

export function StaticSelect(opts: StaticSelectOptions): Record<string, unknown> {
  return {
    type: "input",
    block_id: opts.name,
    element: {
      type: "static_select",
      action_id: `${opts.name}-value`,
      placeholder: { type: "plain_text", text: opts.placeholder ?? opts.name },
      options: opts.options.map(({ text, value }) => ({
        text: { type: "plain_text", text, emoji: true },
        value,
      })),
    },
    label: { type: "plain_text", text: opts.label ?? opts.name },
  };
}
