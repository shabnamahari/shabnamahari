"use client";

const LINKS = [
  { label: "Index", href: "/", note: "Home" },
  { label: "Services", href: "/services", note: "What we do" },
  { label: "Our Work", href: "/our-work", note: "Projects" },
  { label: "About", href: "/about", note: null },
];

export default function MenuOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed left-0 top-0 z-40 flex h-[100dvh] w-full flex-col bg-ink text-white transition-all duration-700 ease-out ${
        isOpen ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-y-2">
        {LINKS.map((link) => (
          <div key={link.label} className="relative flex w-full justify-center overflow-hidden">
            <a
              href={link.href}
              onClick={onClose}
              className="text-menu relative block text-center whitespace-nowrap"
            >
              {link.label}
            </a>
            {link.note && (
              <span className="text-note absolute left-1/2 top-1/2 hidden -translate-y-1/2 translate-x-[calc(50%+220px)] md:block">
                {link.note}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
