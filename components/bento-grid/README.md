# Bento Grid

Magic UI's Bento Grid demo: a four-card feature grid. Each card has its own animated background:

- **Save your files**: a marquee of file cards that pauses on hover. Each card is blurred until you hover it.
- **Notifications**: an animated list that scales up when you hover the card.
- **Integrations**: an animated beam that connects one source to several outputs.
- **Calendar**: a calendar with one date selected, used to filter files by date.

On large screens the cards sit in a 1–2 / 2–1 pattern across three columns. On smaller screens every card takes the full width.

## Files

| File | |
| --- | --- |
| `BentoDemo.tsx` | The demo, saved exactly as given. |

## Dependencies

This file is for a Next.js/React project that uses shadcn/ui and Magic UI with Tailwind. It imports from these paths:

| Import | Source |
| --- | --- |
| `@radix-ui/react-icons` | `npm i @radix-ui/react-icons` |
| `lucide-react` | `npm i lucide-react` |
| `@/lib/utils` (`cn`) | shadcn/ui `init` |
| `@/components/ui/calendar` | `npx shadcn@latest add calendar` |
| `@/registry/magicui/bento-grid` | `npx shadcn@latest add "https://magicui.design/r/bento-grid"` |
| `@/registry/magicui/marquee` | `npx shadcn@latest add "https://magicui.design/r/marquee"` |
| `@/registry/example/animated-list-demo` | Magic UI's Animated List demo |
| `@/registry/example/animated-beam-multiple-outputs` | Magic UI's Animated Beam "multiple outputs" demo |

The `@/registry/...` paths come from the Magic UI docs repository. The CLI installs the components under `@/components/magicui/...`, so in your own project change those imports to match. Then copy the two example demos in from the Magic UI docs.

## Usage

```tsx
import { BentoDemo } from "@/components/bento-demo"

export default function Page() {
  return <BentoDemo />
}
```
