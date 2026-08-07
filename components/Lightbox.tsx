"use client";

import { createContext, useContext, useState } from "react";

const LightboxContext = createContext<(content: React.ReactNode) => void>(
  () => {},
);

export function useLightbox() {
  return useContext(LightboxContext);
}

export default function LightboxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [content, setContent] = useState<React.ReactNode>(null);

  return (
    <LightboxContext.Provider value={setContent}>
      {children}
      {content && (
        <div
          className="fixed inset-0 z-[999999998] flex items-center justify-center bg-cream/95 p-4 md:p-8"
          onClick={() => setContent(null)}
        >
          <div className="max-h-[calc(100vh-110px)] max-w-[calc(100vw-62px)]">
            {content}
          </div>
          <button
            type="button"
            className="text-note absolute bottom-0 left-1/2 -translate-x-1/2 py-4"
            onClick={() => setContent(null)}
          >
            ( Close )
          </button>
        </div>
      )}
    </LightboxContext.Provider>
  );
}
