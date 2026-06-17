import { config } from "./config.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmail({ to, subject, text, html }) {
  if (!config.email.resendApiKey || !config.email.from) {
    console.warn(`Email not sent to ${to}: RESEND_API_KEY and EMAIL_FROM are not configured`);
    return { sent: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.email.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.email.from,
      to,
      subject,
      text,
      html,
    }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Resend email failed: ${response.status} ${body}`);
  return { sent: true };
}

function appLink(path, token) {
  const base = config.frontendUrl?.replace(/\/$/, "");
  return base ? `${base}${path}?token=${encodeURIComponent(token)}` : null;
}

export async function sendVerificationEmail({ to, name, token }) {
  const link = appLink("/verify-email", token);
  const safeName = escapeHtml(name || "there");
  const text = [
    `Hi ${name || "there"},`,
    "",
    "Welcome to PawPin. Use this verification token to verify your email:",
    token,
    "",
    link ? `You can also open this link: ${link}` : null,
    "",
    "This token expires soon. If you did not create a PawPin account, you can ignore this email.",
  ].filter(Boolean).join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#33251f">
      <h2>Welcome to PawPin</h2>
      <p>Hi ${safeName}, use this verification token to verify your email:</p>
      <p style="font-size:18px;font-weight:700;letter-spacing:.04em;background:#fff4ea;border:1px solid #f0e1d2;border-radius:10px;padding:12px">${escapeHtml(token)}</p>
      ${link ? `<p><a href="${escapeHtml(link)}">Open PawPin verification</a></p>` : ""}
      <p style="color:#806f65">This token expires soon. If you did not create a PawPin account, you can ignore this email.</p>
    </div>
  `;
  return sendEmail({ to, subject: "Verify your PawPin email", text, html });
}

export async function sendPasswordResetEmail({ to, name, token }) {
  const link = appLink("/reset-password", token);
  const safeName = escapeHtml(name || "there");
  const text = [
    `Hi ${name || "there"},`,
    "",
    "Use this token to reset your PawPin password:",
    token,
    "",
    link ? `You can also open this link: ${link}` : null,
    "",
    "If you did not request a password reset, you can ignore this email.",
  ].filter(Boolean).join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#33251f">
      <h2>Reset your PawPin password</h2>
      <p>Hi ${safeName}, use this token to reset your password:</p>
      <p style="font-size:18px;font-weight:700;letter-spacing:.04em;background:#fff4ea;border:1px solid #f0e1d2;border-radius:10px;padding:12px">${escapeHtml(token)}</p>
      ${link ? `<p><a href="${escapeHtml(link)}">Open PawPin password reset</a></p>` : ""}
      <p style="color:#806f65">If you did not request a password reset, you can ignore this email.</p>
    </div>
  `;
  return sendEmail({ to, subject: "Reset your PawPin password", text, html });
}
