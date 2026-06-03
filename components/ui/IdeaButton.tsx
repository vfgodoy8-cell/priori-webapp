"use client";

import { useState } from "react";
import { IdeaInterviewModal } from "@/components/ai/IdeaInterviewModal";

export function IdeaButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-lg bg-white text-brand-gray hover:text-brand-orange hover:border-brand-orange transition"
        style={{ border: "1.5px solid #E5E5E5", borderRadius: 8 }}
      >
        💡 Tengo una idea
      </button>
      {open && <IdeaInterviewModal onClose={() => setOpen(false)} />}
    </>
  );
}
