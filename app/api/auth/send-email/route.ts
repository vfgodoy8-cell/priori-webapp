import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";


type EmailActionType =
  | "signup"
  | "recovery"
  | "magic_link"
  | "invite"
  | "email_change_new"
  | "email_change_current";

type HookPayload = {
  user: { id: string; email: string };
  email_data: {
    token_hash: string;
    redirect_to: string;
    email_action_type: EmailActionType;
  };
};

export async function POST(req: NextRequest) {
  const secret = process.env.SUPABASE_HOOK_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = "priori <onboarding@resend.dev>";
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  let payload: HookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { user, email_data } = payload;
  const { token_hash, redirect_to, email_action_type } = email_data;

  const confirmationUrl =
    `${SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to)}`;

  const { subject, html } = buildEmail(email_action_type, confirmationUrl);

  const { error } = await resend.emails.send({
    from: FROM,
    to: user.email,
    subject,
    html,
  });

  if (error) {
    console.error("[auth-hook] Resend error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({});
}

function buildEmail(
  type: EmailActionType,
  url: string
): { subject: string; html: string } {
  switch (type) {
    case "signup":
      return {
        subject: "Confirma tu cuenta en Priori™",
        html: buildHtml({
          title: "Confirma tu cuenta",
          body: `Hace clic en el boton para verificar tu direccion de email y activar tu cuenta en <b style="color:#111111">Priori™</b>.`,
          btnLabel: "Confirmar email &rarr;",
          url,
          footer: "Si no creaste una cuenta en Priori™, podes ignorar este email.",
        }),
      };
    case "recovery":
      return {
        subject: "Resetear contrasena en Priori™",
        html: buildHtml({
          title: "Resetear contrasena",
          body: `Recibimos una solicitud para resetear la contrasena de tu cuenta en <b style="color:#111111">Priori™</b>.`,
          btnLabel: "Resetear contrasena &rarr;",
          url,
          footer: "Si no solicitaste este cambio, podes ignorar este email.",
        }),
      };
    case "magic_link":
      return {
        subject: "Tu link de acceso a Priori™",
        html: buildHtml({
          title: "Acceder a Priori™",
          body: "Usa el boton para ingresar a tu cuenta. Este link es de uso unico y expira en 1 hora.",
          btnLabel: "Ingresar &rarr;",
          url,
          footer: "Si no solicitaste este acceso, podes ignorar este email.",
        }),
      };
    case "email_change_new":
    case "email_change_current":
      return {
        subject: "Confirma tu nuevo email en Priori™",
        html: buildHtml({
          title: "Confirma tu nuevo email",
          body: "Hace clic para confirmar el cambio de direccion de email en tu cuenta de Priori™.",
          btnLabel: "Confirmar nuevo email &rarr;",
          url,
          footer: "Si no solicitaste este cambio, contactanos de inmediato.",
        }),
      };
    default:
      return {
        subject: "Accion requerida en Priori™",
        html: buildHtml({
          title: "Accion requerida",
          body: "Hace clic para completar la accion en tu cuenta de Priori™.",
          btnLabel: "Continuar &rarr;",
          url,
          footer: "Si no reconoces esta solicitud, podes ignorar este email.",
        }),
      };
  }
}

function buildHtml({
  title,
  body,
  btnLabel,
  url,
  footer,
}: {
  title: string;
  body: string;
  btnLabel: string;
  url: string;
  footer: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#F5F5F5;margin:0;padding:32px 16px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #E5E7EB;padding:40px 36px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px">
      <div>
        <div style="height:6px;width:32px;border-radius:99px;background:#E8621A;margin-bottom:4px"></div>
        <div style="height:6px;width:20px;border-radius:99px;background:#E8621A;opacity:.65;margin-bottom:4px"></div>
        <div style="height:6px;width:12px;border-radius:99px;background:#E8621A;opacity:.30"></div>
      </div>
      <span style="font-weight:700;font-size:20px;color:#111111">priori</span>
    </div>
    <h1 style="font-size:20px;font-weight:700;color:#111111;margin:0 0 8px">${title}</h1>
    <p style="font-size:14px;color:#6B6B6B;margin:0 0 24px">${body}</p>
    <a href="${url}"
       style="display:inline-block;background:#E8621A;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:10px;margin-bottom:24px">
      ${btnLabel}
    </a>
    <p style="font-size:12px;color:#9CA3AF;margin:0 0 4px">Si el boton no funciona, copia este enlace en tu navegador:</p>
    <p style="font-size:11px;color:#E8621A;word-break:break-all;margin:0 0 24px">${url}</p>
    <hr style="border:none;border-top:1px solid #F3F4F6;margin:24px 0">
    <p style="font-size:11px;color:#9CA3AF;margin:0">${footer}</p>
  </div>
</body>
</html>`;
}
