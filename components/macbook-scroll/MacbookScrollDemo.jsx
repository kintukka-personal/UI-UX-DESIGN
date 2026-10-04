import { MacbookScroll } from "@/components/ui/macbook-scroll";

export function MacbookScrollDemo({ src = "/linear.webp" }) {
  return (
    // overflow-clip, not overflow-hidden: a hidden-overflow ancestor turns into
    // a scroll container and stops the sticky stage from pinning.
    <div className="w-full overflow-clip bg-white dark:bg-[#0B0B0F]">
      <MacbookScroll
        title={
          <span>
            Add the main hook of your <br /> software/app.
          </span>
        }
        badge={
          <a
            href="https://www.google.com"
            className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-900 shadow-lg transition-colors hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Click me
          </a>
        }
        src={src}
        showGradient={false}
      />
    </div>
  );
}
