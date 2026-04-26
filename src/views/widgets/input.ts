export interface InputOptions {
  name: string;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  multiline?: boolean;
  optional?: boolean;
}

export function Input(options: InputOptions): Record<string, unknown> {
  const element: Record<string, unknown> = {
    type: "plain_text_input",
    action_id: `${options.name}-value`,
  };
  if (options.placeholder) {
    element["placeholder"] = { type: "plain_text", text: options.placeholder };
  }
  if (options.initialValue !== undefined) {
    element["initial_value"] = options.initialValue;
  }
  if (options.multiline) {
    element["multiline"] = true;
  }
  return {
    type: "input",
    block_id: options.name,
    label: { type: "plain_text", text: options.label ?? options.name },
    element,
    optional: options.optional ?? false,
  };
}
