# Persona

AI Elements' Persona demo: an animated AI avatar in the `halo` style, with a row of five icon buttons underneath that switch its state. Each button has a tooltip, and the active state's button is filled.

| State | Icon |
| --- | --- |
| Idle | Circle |
| Listening | Mic |
| Thinking | Brain |
| Speaking | Megaphone |
| Asleep | Closed eye |

The avatar starts in **Idle** and is 128px square (`size-32`), centred above the buttons.

## Files

| File | |
| --- | --- |
| `PersonaDemo.tsx` | The demo, saved as given (only the line breaks restored). |

## Dependencies

This file is for a Next.js/React project that uses shadcn/ui with Tailwind and Vercel's AI Elements. It imports from these paths:

| Import | Source |
| --- | --- |
| `lucide-react` | `npm i lucide-react` |
| `@/components/ai-elements/persona` | `npx ai-elements@latest add persona` |
| `@/components/ui/button` | `npx shadcn@latest add button` |
| `@/components/ui/button-group` | `npx shadcn@latest add button-group` |
| `@/components/ui/tooltip` | `npx shadcn@latest add tooltip` |

The `icon-sm` button size comes with the current shadcn/ui `button`. If your copy is older, re-add it to get that size.

## Usage

```tsx
import PersonaDemo from "@/components/persona-demo"

export default function Page() {
  return (
    <div className="h-80">
      <PersonaDemo />
    </div>
  )
}
```

The demo fills its parent (`size-full`), so give the parent a height.
