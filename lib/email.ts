import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function sendInvitationEmail({
  to,
  orgName,
  roleLabel,
  token,
  invitedByName,
}: {
  to: string;
  orgName: string;
  roleLabel: string;
  token: string;
  invitedByName?: string;
}): Promise<{ error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping invitation email");
    return {};
  }

  const inviteUrl = `${getBaseUrl()}/invite/${token}`;
  const fromName = "Priori™";
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "noreply@priori.app";

  const { error } = await resend.emails.send({
    from: `${fromName} <${fromAddress}>`,
    to,
    subject: `Invitación a ${orgName} en Priori™`,
    html: buildInviteHtml({ orgName, roleLabel, inviteUrl, invitedByName }),
  });

  if (error) {
    console.error("[email] Error sending invitation:", error);
    return { error: error.message };
  }
  return {};
}

function buildInviteHtml({
  orgName,
  roleLabel,
  inviteUrl,
  invitedByName,
}: {
  orgName: string;
  roleLabel: string;
  inviteUrl: string;
  invitedByName?: string;
}) {
  const byLine = invitedByName ? `<b>${invitedByName}</b> te invitó a` : "Fuiste invitado a";
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#F5F5F5;margin:0;padding:32px 16px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #E5E7EB;padding:40px 36px">
    <!-- Logo -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px">
      <div>
        <div style="height:6px;width:32px;border-radius:99px;background:#E8621A;margin-bottom:4px"></div>
        <div style="height:6px;width:20px;border-radius:99px;background:#E8621A;opacity:.65;margin-bottom:4px"></div>
        <div style="height:6px;width:12px;border-radius:99px;background:#E8621A;opacity:.30"></div>
      </div>
      <span style="font-weight:700;font-size:20px;color:#111111">priori</span>
    </div>

    <h1 style="font-size:20px;font-weight:700;color:#111111;margin:0 0 8px">Invitación al equipo</h1>
    <p style="font-size:14px;color:#6B6B6B;margin:0 0 24px">
      ${byLine} unirte a <b style="color:#111111">${orgName}</b> como
      <b style="color:#111111">${roleLabel}</b>.
    </p>

    <a href="${inviteUrl}"
       style="display:inline-block;background:#E8621A;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:10px;margin-bottom:24px">
      Aceptar invitación
    </a>

    <p style="font-size:12px;color:#9CA3AF;margin:0 0 4px">Si el botón no funciona, copia este enlace en tu navegador:</p>
    <p style="font-size:11px;color:#E8621A;word-break:break-all;margin:0 0 24px">${inviteUrl}</p>

    <hr style="border:none;border-top:1px solid #F3F4F6;margin:24px 0">
    <p style="font-size:11px;color:#9CA3AF;margin:0">
      Este enlace expira en 7 días. Si no esperabas esta invitación, podés ignorar este email.
    </p>
  </div>
</body>
</html>`;
}
