/**
 * Server-only email sender. Never import from client components.
 * Uses Resend when RESEND_API_KEY + EMAIL_FROM are set; otherwise simulates delivery.
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult =
  | { mode: "sent"; providerId?: string }
  | { mode: "simulated" }
  | { mode: "failed"; error: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const recipientDomain = input.to.trim().toLowerCase().split("@").at(-1) || "";
  const isDevelopmentTestAddress =
    process.env.NODE_ENV !== "production" &&
    [
      "demo",
      "test",
      "example",
      "example.com",
      "example.org",
      "example.net",
      "invalid",
      "localhost",
    ].some(
      (suffix) =>
        recipientDomain === suffix || recipientDomain.endsWith(`.${suffix}`),
    );

  if (!apiKey || !from || isDevelopmentTestAddress) {
    return { mode: "simulated" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        mode: "failed",
        error: `Email provider error (${res.status}): ${body.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as { id?: string };
    return { mode: "sent", providerId: data.id };
  } catch (e) {
    return {
      mode: "failed",
      error: e instanceof Error ? e.message : "Failed to send email.",
    };
  }
}
