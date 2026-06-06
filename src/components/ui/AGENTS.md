# UI Primitives — shadcn/ui Style

**9 components** — low-level primitives built on Radix UI + `class-variance-authority` + Tailwind.

## COMPONENTS
| Component | Base | Variants |
|-----------|------|----------|
| `button.tsx` | `<button>` | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` + sizes |
| `card.tsx` | Radix `forwardRef` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `tabs.tsx` | `@radix-ui/react-tabs` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| `tooltip.tsx` | `@radix-ui/react-tooltip` | `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` |
| `input.tsx` | `<input>` | Standard text input with focus ring |
| `label.tsx` | `@radix-ui/react-label` | `cva` variant support |
| `switch.tsx` | `@radix-ui/react-switch` | Toggle switch |
| `error-boundary.tsx` | React class component | Full-page fallback with reload button |
| `index.ts` | — | Barrel re-export |

## CONVENTIONS

**Pattern**: All primitives use `React.forwardRef` + `cn()` for class merging. Props extend native HTML or Radix props.

**Styling**: Tailwind utilities only. Dark mode via `dark:` prefix. Focus rings baked in. No CSS modules.

**Accessibility**: Radix handles ARIA. `ErrorBoundary` is the only class component.

## ANTI-PATTERNS
- Never add app-specific logic to `ui/` — use `shared/` or `dashboard/` instead
- Never bypass `cn()` for conditional classes — import from `@/lib/utils`
- Never add non-primitive components here — this is the shadcn layer only
