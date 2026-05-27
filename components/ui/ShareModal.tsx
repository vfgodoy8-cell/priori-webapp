"use client";

import { useState, useRef } from "react";

type Props = {
  mode: "squad" | "cross";
  targetRef?: React.RefObject<HTMLElement>;
  onClose: () => void;
};

export function ShareModal({ mode, targetRef, onClose }: Props) {
  const [pdfProgress, setPdfProgress] = useState(false);
  const [toast, setToast] = useState("");

  const modeLabel = mode === "squad" ? "Modo Squad" : "Modo Cross";
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const message = `Priori™ — Priorización visual (${modeLabel}): ${shareUrl}`;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  function copyLink() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => showToast("✅ Enlace copiado al portapapeles"));
    } else {
      const inp = document.querySelector<HTMLInputElement>("#share-url-inp");
      inp?.select();
      document.execCommand("copy");
      showToast("✅ Enlace copiado al portapapeles");
    }
  }

  function shareTeams() {
    window.open(
      `https://teams.microsoft.com/share?href=${encodeURIComponent(shareUrl)}&msgText=${encodeURIComponent(message)}`,
      "_blank"
    );
    showToast("Abriendo Microsoft Teams…");
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    showToast("Abriendo WhatsApp…");
  }

  function shareMail() {
    const subject = encodeURIComponent("Priori™ — Priorización visual");
    const body = encodeURIComponent(
      `Te comparto la previsualización del Estimador de Proyectos:\n\n${message}\n\nAbrí el enlace para ver el estado actual de la planificación.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    showToast("Abriendo cliente de correo…");
  }

  async function exportPDF() {
    setPdfProgress(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf").then((m) => ({ jsPDF: m.jsPDF })),
      ]);

      const el = targetRef?.current ?? document.getElementById("priori-export-target") ?? document.body;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2 - 16;

      // Header bar
      pdf.setFillColor(232, 98, 26);
      pdf.rect(0, 0, pageW, 8, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.text(`priori™  —  ${modeLabel}`, margin, 5.5);
      const today = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
      pdf.text(today, pageW - margin, 5.5, { align: "right" });

      // Image
      const imgRatio = canvas.width / canvas.height;
      let imgW = usableW;
      let imgH = imgW / imgRatio;
      if (imgH > usableH) { imgH = usableH; imgW = imgH * imgRatio; }
      const imgX = margin + (usableW - imgW) / 2;
      pdf.addImage(imgData, "PNG", imgX, margin + 10, imgW, imgH);

      pdf.save(`priori-${mode}-${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast("✅ PDF descargado");
    } catch (err) {
      console.error(err);
      showToast("Error al generar el PDF");
    } finally {
      setPdfProgress(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[500] bg-black/40 flex items-start justify-center overflow-y-auto py-6 px-3"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="bg-white rounded-2xl border border-gray-100 max-w-[480px] w-full my-auto shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-orange-50 border-b border-orange-100">
            <h3 className="text-sm font-bold text-brand-orange">Compartir / Exportar</h3>
            <button onClick={onClose} className="text-brand-gray hover:text-brand-black text-xl leading-none">×</button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* URL */}
            <div>
              <div className="text-[11px] font-bold text-brand-gray uppercase tracking-wider mb-2">Enlace directo</div>
              <div className="flex gap-2">
                <input
                  id="share-url-inp"
                  readOnly
                  value={shareUrl}
                  className="flex-1 text-[11px] px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-brand-gray min-w-0"
                />
                <button
                  onClick={copyLink}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-brand-orange hover:bg-orange-600 text-white transition"
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Channels */}
            <div>
              <div className="text-[11px] font-bold text-brand-gray uppercase tracking-wider mb-2">Compartir vía</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: "🟦", name: "Microsoft Teams", desc: "Compartir en Teams", action: shareTeams },
                  { icon: "🟢", name: "WhatsApp", desc: "Compartir por WhatsApp", action: shareWhatsApp },
                  { icon: "📧", name: "Email", desc: "Enviar por correo", action: shareMail },
                ].map((ch) => (
                  <button
                    key={ch.name}
                    onClick={ch.action}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-100 hover:border-brand-orange hover:bg-orange-50 transition text-left"
                  >
                    <span className="text-xl">{ch.icon}</span>
                    <div>
                      <div className="text-xs font-bold text-brand-black">{ch.name}</div>
                      <div className="text-[10px] text-brand-gray">{ch.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* PDF */}
            <div>
              <div className="text-[11px] font-bold text-brand-gray uppercase tracking-wider mb-2">Exportar PDF</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={exportPDF}
                  disabled={pdfProgress}
                  className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border border-gray-100 hover:border-brand-orange hover:bg-orange-50 transition disabled:opacity-60"
                >
                  <span className="text-xl">📄</span>
                  <span className="text-xs font-bold text-brand-black">Vista actual</span>
                  <span className="text-[10px] text-brand-gray">{modeLabel}</span>
                </button>
              </div>
              {pdfProgress && (
                <p className="text-xs text-brand-orange font-semibold text-center mt-2">Generando PDF…</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[600] bg-brand-black text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </>
  );
}
