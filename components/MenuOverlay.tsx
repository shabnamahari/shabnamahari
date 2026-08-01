"use client";

import { usePathname, useRouter } from "next/navigation";
import Asterisk from "./Asterisk";
import ParenMedia from "./ParenMedia";
import VideoSlot from "./VideoSlot";
import { scrollContactIntoView } from "@/lib/scrollToContact";

type Item = {
  label: string;
  href: string;
  note: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

/** Text roll-up on hover — two stacked copies, exactly like adcker's menu links. */
function RollLink({
  label,
  href,
  onClick,
}: {
  label: string;
  href: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="text-menu group relative block overflow-hidden text-center whitespace-nowrap will-change-transform"
    >
      <span className="ease-custom-text-links block px-1 transition-all duration-700 lg:group-hover:-translate-y-full">
        {label}
      </span>
      <span className="ease-custom-text-links absolute top-0 left-0 block w-full translate-y-[105%] transition-all duration-700 lg:group-hover:translate-y-0">
        {label}
      </span>
    </a>
  );
}

/** One menu row: slides up on open with a stagger, note slides in on hover. */
function MenuRow({
  item,
  index,
  isOpen,
}: {
  item: Item;
  index: number;
  isOpen: boolean;
}) {
  return (
    <div className="flex w-full justify-center overflow-hidden">
      <div
        className={`group/wrapper ease-custom-less relative flex transition-all duration-1000 ${
          isOpen ? "translate-y-0" : "translate-y-[102%]"
        }`}
        style={{ transitionDelay: `${(index + 1) * 0.0667}s` }}
      >
        <RollLink label={item.label} href={item.href} onClick={item.onClick} />
        <div
          className="text-note ease-custom-less absolute top-1/2 left-4 -translate-x-full -translate-y-1/2 transition-all duration-700 max-md:hidden lg:group-hover/wrapper:left-0"
          style={{ marginLeft: "-28px" }}
        >
          {item.note}
        </div>
      </div>
    </div>
  );
}

export default function MenuOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const items: Item[] = [
    { label: "Index", href: "/", note: "Home" },
    { label: "Learn", href: "/services", note: "What you do" },
    { label: "About", href: "/about", note: "Who I am" },
    {
      label: "Contact",
      href: "/#contact",
      note: "Get in touch",
      onClick: (e) => {
        e.preventDefault();
        onClose();
        if (pathname === "/") {
          scrollContactIntoView();
        } else {
          // ContactHashScroll picks this up once the homepage mounts.
          router.push("/#contact");
        }
      },
    },
  ];

  // The showreel block sits between "Services" and "About", so rows after it
  // keep advancing the entrance stagger.
  const before = items.slice(0, 2);
  const after = items.slice(2);

  return (
    <div
      className={`ease-custom fixed left-0 top-0 z-40 flex h-[100dvh] w-full flex-col bg-ink text-white transition-all duration-1000 ${
        isOpen ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-y-2">
        {before.map((item, i) => (
          <MenuRow key={item.label} item={item} index={i} isOpen={isOpen} />
        ))}

        <div className="flex w-full justify-center overflow-hidden">
          <div
            className={`ease-custom-less relative flex shrink-0 items-center px-28 transition-all duration-1000 ${
              isOpen ? "translate-y-0" : "translate-y-[102%]"
            }`}
            style={{ transitionDelay: `${3 * 0.0667}s` }}
          >
            <span className="absolute left-24 w-[calc((0.9em+2.7vw)*1.5)] -translate-x-full pt-1 text-white">
              <Asterisk />
            </span>
            <div className="text-menu flex items-center justify-center font-bold">
              <ParenMedia>
                <VideoSlot label="Showreel" />
              </ParenMedia>
            </div>
            <span className="text-note absolute right-28 top-1/2 max-md:hidden -translate-y-1/2 translate-x-full pl-[1vw] md:pl-[1.5vw]">
              Showreel
            </span>
          </div>
        </div>

        {after.map((item, i) => (
          <MenuRow key={item.label} item={item} index={i + 3} isOpen={isOpen} />
        ))}
      </div>
    </div>
  );
}
