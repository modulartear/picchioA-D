const admin = require("firebase-admin");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineBoolean, defineInt, defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");

admin.initializeApp();

const SMTP_HOST = defineString("SMTP_HOST");
const SMTP_USER = defineString("SMTP_USER");
const SMTP_PASS = defineString("SMTP_PASS");
const SMTP_FROM = defineString("SMTP_FROM");
const SMTP_PORT = defineInt("SMTP_PORT", { default: 587 });
const SMTP_SECURE = defineBoolean("SMTP_SECURE", { default: false });
const ADMIN_NOTIFY_TO = defineString("ADMIN_NOTIFY_TO", { default: "picchioamob@outlook.com" });

function paramValue(p) {
  return String(p?.value?.() || "").trim();
}

function buildTransporter() {
  const host = paramValue(SMTP_HOST);
  const user = paramValue(SMTP_USER);
  const pass = paramValue(SMTP_PASS);
  const port = Number(SMTP_PORT.value());
  const secure = !!SMTP_SECURE.value();

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function safeJson(x) {
  try {
    return JSON.stringify(x ?? null, null, 2);
  } catch (_) {
    return String(x);
  }
}

function toList(x) {
  return Array.isArray(x) ? x : [];
}

function orderEmail({ orderId, order }) {
  const contact = order?.contact || {};
  const items = toList(order?.items);
  const subject = `Nuevo pedido ${orderId ? "#" + orderId : ""}`.trim();

  const lines = [
    subject,
    "",
    "Contacto:",
    `- Nombre: ${[contact?.nombre, contact?.apellido].filter(Boolean).join(" ").trim() || "-"}`,
    `- Email: ${contact?.email || "-"}`,
    `- WhatsApp: ${contact?.tel || "-"}`,
    "",
    `Ítems (${items.length}):`,
    ...items.map((it, idx) => {
      const name = it?.name || it?.id || "Producto";
      const qty = Number(it?.qty || 0);
      const color = it?.color?.name ? ` (${it.color.name})` : "";
      return `- ${idx + 1}. ${name}${color} x${qty || 1}`;
    }),
    "",
    "Datos completos (Firestore):",
    safeJson(order),
  ];

  const text = lines.join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.45;">
      <h2 style="margin: 0 0 12px;">${subject}</h2>
      <h3 style="margin: 18px 0 8px;">Contacto</h3>
      <ul style="margin: 0; padding-left: 18px;">
        <li><b>Nombre:</b> ${[contact?.nombre, contact?.apellido].filter(Boolean).join(" ").trim() || "-"}</li>
        <li><b>Email:</b> ${contact?.email || "-"}</li>
        <li><b>WhatsApp:</b> ${contact?.tel || "-"}</li>
      </ul>
      <h3 style="margin: 18px 0 8px;">Ítems (${items.length})</h3>
      <ul style="margin: 0; padding-left: 18px;">
        ${items
          .map((it) => {
            const name = it?.name || it?.id || "Producto";
            const qty = Number(it?.qty || 0) || 1;
            const color = it?.color?.name ? ` (${it.color.name})` : "";
            return `<li>${name}${color} x${qty}</li>`;
          })
          .join("")}
      </ul>
      <h3 style="margin: 18px 0 8px;">Datos completos (Firestore)</h3>
      <pre style="white-space: pre-wrap; background: #f6f6f6; padding: 12px; border-radius: 8px; overflow: auto;">${safeJson(order)}</pre>
    </div>
  `.trim();

  return { subject, text, html };
}

function leadEmail({ leadId, lead }) {
  const kind = String(lead?.kind || "consulta").trim();
  const subject = `Nueva consulta ${kind}${leadId ? " #" + leadId : ""}`.trim();
  const text = [subject, "", "Datos completos (Firestore):", safeJson(lead)].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.45;">
      <h2 style="margin: 0 0 12px;">${subject}</h2>
      <h3 style="margin: 18px 0 8px;">Datos completos (Firestore)</h3>
      <pre style="white-space: pre-wrap; background: #f6f6f6; padding: 12px; border-radius: 8px; overflow: auto;">${safeJson(lead)}</pre>
    </div>
  `.trim();
  return { subject, text, html };
}

async function send({ subject, text, html }) {
  const to = paramValue(ADMIN_NOTIFY_TO) || "picchioamob@outlook.com";
  const from = paramValue(SMTP_FROM) || paramValue(SMTP_USER);
  const transporter = buildTransporter();

  if (!transporter) {
    logger.error("SMTP no configurado. Falta SMTP_HOST/SMTP_USER/SMTP_PASS.");
    return;
  }
  if (!from) {
    logger.error("SMTP_FROM no configurado (o SMTP_USER vacío).");
    return;
  }

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

exports.onOrderCreated = onDocumentCreated("orders/{orderId}", async (event) => {
  const orderId = event?.params?.orderId || "";
  const snap = event.data;
  if (!snap) return;
  const order = snap.data();
  try {
    await send(orderEmail({ orderId, order }));
  } catch (err) {
    logger.error("Error enviando email de pedido", err);
  }
});

exports.onLeadCreated = onDocumentCreated("leads/{leadId}", async (event) => {
  const leadId = event?.params?.leadId || "";
  const snap = event.data;
  if (!snap) return;
  const lead = snap.data();
  try {
    await send(leadEmail({ leadId, lead }));
  } catch (err) {
    logger.error("Error enviando email de consulta", err);
  }
});
