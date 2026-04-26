import type { App } from "@slack/bolt";
import {
  Button,
  Input,
  composeBlocks,
  composeRoutes,
  getFormField,
  type RouteRegistrar,
} from "slack-bot-kit";

const homeView = () => ({
  type: "home" as const,
  blocks: composeBlocks(
    [
      {
        type: "header",
        text: { type: "plain_text", text: "Echo bot" },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: "Type `/echo something` or click below." },
      },
    ],
    [
      {
        type: "actions",
        elements: [
          Button({ text: "Open echo modal", actionId: "open-echo-modal", style: "primary" }),
        ],
      },
    ],
  ),
});

const echoModal = () => ({
  type: "modal" as const,
  callback_id: "echo-modal-submit",
  title: { type: "plain_text" as const, text: "Echo" },
  submit: { type: "plain_text" as const, text: "Send" },
  blocks: composeBlocks([Input({ name: "phrase", label: "Phrase to echo back" })]),
});

const events: RouteRegistrar = (app: App) => {
  app.event("app_home_opened", async ({ payload, client }) => {
    await client.views.publish({ user_id: payload.user, view: homeView() });
  });
};

const messages: RouteRegistrar = (app: App) => {
  app.message(/^echo\s+(.+)$/i, async ({ context, say }) => {
    const captured = (context.matches as RegExpMatchArray | undefined)?.[1];
    if (captured) await say(captured);
  });
};

const actions: RouteRegistrar = (app: App) => {
  app.action("open-echo-modal", async ({ ack, body, client }) => {
    await ack();
    const trigger = (body as { trigger_id?: string }).trigger_id;
    if (!trigger) return;
    await client.views.open({ trigger_id: trigger, view: echoModal() });
  });

  app.view("echo-modal-submit", async ({ ack, view, body, client }) => {
    await ack();
    const phrase = getFormField({ view }, "phrase") ?? "(empty)";
    await client.chat.postMessage({ channel: body.user.id, text: phrase });
  });
};

export const routes = composeRoutes(events, messages, actions);
