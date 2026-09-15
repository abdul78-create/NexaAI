# NexaAI — Design System

> Visual design language, tokens, typography, animation principles, and component patterns.

---

## 1. Brand Identity

**NexaAI** is a premium AI platform. Its visual language communicates:

- **Intelligence** — precise, purposeful, nothing superfluous
- **Power** — bold typography, confident use of space
- **Fluidity** — smooth motion, organic gradients
- **Trust** — consistent, accessible, never deceptive

---

## 2. Color System

### Base Palette (HSL)

```css
/* Backgrounds */
--color-base-950: hsl(222, 25%, 4%);    /* Page background (dark) */
--color-base-900: hsl(222, 20%, 7%);    /* Card background */
--color-base-850: hsl(222, 18%, 10%);   /* Elevated surface */
--color-base-800: hsl(222, 15%, 14%);   /* Input / popover */
--color-base-700: hsl(222, 12%, 20%);   /* Border */
--color-base-600: hsl(222, 10%, 30%);   /* Subtle border */
--color-base-400: hsl(222, 8%,  50%);   /* Muted text */
--color-base-200: hsl(222, 6%,  80%);   /* Secondary text */
--color-base-50:  hsl(222, 5%,  96%);   /* Primary text */

/* Brand — Electric Violet */
--color-brand-600: hsl(258, 90%, 45%);
--color-brand-500: hsl(258, 90%, 55%);  /* Primary brand */
--color-brand-400: hsl(258, 85%, 65%);
--color-brand-300: hsl(258, 80%, 75%);

/* Accent — Cyan */
--color-accent-500: hsl(188, 90%, 50%);
--color-accent-400: hsl(188, 85%, 60%);

/* Semantic */
--color-success: hsl(145, 65%, 42%);
--color-warning: hsl(38, 95%, 52%);
--color-error:   hsl(0,   75%, 55%);
--color-info:    hsl(210, 80%, 55%);
```

### Gradient System

```css
/* Hero gradient mesh */
--gradient-mesh: radial-gradient(
  ellipse at 20% 30%, hsl(258, 90%, 25% / 0.4) 0%,
  transparent 60%
), radial-gradient(
  ellipse at 80% 70%, hsl(188, 90%, 20% / 0.3) 0%,
  transparent 60%
);

/* Brand gradient (buttons, highlights) */
--gradient-brand: linear-gradient(
  135deg,
  hsl(258, 90%, 55%),
  hsl(188, 90%, 50%)
);

/* Card shimmer */
--gradient-shimmer: linear-gradient(
  90deg,
  transparent 0%,
  hsl(258, 90%, 65% / 0.06) 50%,
  transparent 100%
);
```

---

## 3. Typography

### Font Stack

```css
/* Heading — Display font */
--font-display: 'Outfit', 'Inter', system-ui, sans-serif;

/* Body — Clean readable */
--font-body: 'Inter', system-ui, sans-serif;

/* Code — Monospace */
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

> Load from Google Fonts: Outfit (300–800), Inter (300–700), JetBrains Mono (400–600)

### Type Scale

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `display-2xl` | 4.5rem | 1.1 | 700 | Hero headline |
| `display-xl`  | 3.75rem | 1.1 | 700 | Section headline |
| `display-lg`  | 3rem | 1.2 | 600 | Page title |
| `display-md`  | 2.25rem | 1.25 | 600 | Card title |
| `display-sm`  | 1.875rem | 1.3 | 600 | Sub-section |
| `text-xl`     | 1.25rem | 1.6 | 400 | Large body |
| `text-lg`     | 1.125rem | 1.6 | 400 | Body (default) |
| `text-md`     | 1rem | 1.6 | 400 | UI text |
| `text-sm`     | 0.875rem | 1.5 | 400 | Caption / helper |
| `text-xs`     | 0.75rem | 1.4 | 400 | Label / badge |

---

## 4. Spacing Scale

Based on a 4px base unit:

```
space-1:  4px     Tight internal padding
space-2:  8px     Input padding
space-3:  12px    Component gap
space-4:  16px    Section inner padding
space-5:  20px    Card padding
space-6:  24px    Component gap (large)
space-8:  32px    Section gap
space-10: 40px    Container padding
space-12: 48px    Hero spacing
space-16: 64px    Section padding
space-20: 80px    Large section gap
space-24: 96px    Hero margin
```

---

## 5. Border Radius

```css
--radius-sm:   4px;   /* Tags, badges */
--radius-md:   8px;   /* Inputs, buttons */
--radius-lg:   12px;  /* Cards */
--radius-xl:   16px;  /* Modals, large cards */
--radius-2xl:  24px;  /* Hero cards */
--radius-full: 9999px; /* Pills, avatars */
```

---

## 6. Shadow System

```css
/* Elevation */
--shadow-sm:  0 1px 2px hsl(0 0% 0% / 0.3);
--shadow-md:  0 4px 12px hsl(0 0% 0% / 0.4);
--shadow-lg:  0 8px 32px hsl(0 0% 0% / 0.5);
--shadow-xl:  0 16px 64px hsl(0 0% 0% / 0.6);

/* Brand glow */
--shadow-brand-sm:  0 0 12px hsl(258, 90%, 55% / 0.3);
--shadow-brand-md:  0 0 32px hsl(258, 90%, 55% / 0.4);
--shadow-brand-lg:  0 0 64px hsl(258, 90%, 55% / 0.3);
```

---

## 7. Animation Principles

### Core Principles

1. **Purpose first** — Every animation communicates state, relationship, or hierarchy. No decoration without function.
2. **Subtle, not showy** — Default durations are short. Big animations are reserved for first impressions.
3. **Physics-based** — Use spring/ease curves, not linear. Motion feels natural.
4. **Respect preferences** — All animations respect `prefers-reduced-motion: reduce`.

### Duration Tokens

```css
--duration-instant: 0ms;
--duration-fast:    100ms;   /* Hover states, tooltips */
--duration-normal:  200ms;   /* UI transitions */
--duration-slow:    350ms;   /* Page transitions, modals */
--duration-slower:  500ms;   /* Feature animations */
--duration-crawl:   800ms;   /* Hero entrance */
```

### Easing Tokens

```css
--ease-standard:  cubic-bezier(0.4, 0, 0.2, 1);   /* Default */
--ease-decelerate: cubic-bezier(0, 0, 0.2, 1);    /* Enter */
--ease-accelerate: cubic-bezier(0.4, 0, 1, 1);    /* Exit */
--ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1); /* Bounce */
--ease-smooth:    cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

### Motion Variants (Motion for React)

```tsx
// Fade up — default entrance
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
}

// Stagger container
const staggerContainer = {
  visible: { transition: { staggerChildren: 0.08 } }
}

// Scale in
const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] } }
}
```

---

## 8. Component Patterns

### Button

```tsx
// Variants: primary | secondary | ghost | danger | outline
// Sizes: sm | md | lg

// Primary — brand gradient
<Button variant="primary" size="md">Start Chatting</Button>

// Visual:
// background: var(--gradient-brand)
// border-radius: var(--radius-md)
// box-shadow: var(--shadow-brand-sm)
// hover: brightness(1.1) + shadow-brand-md
// active: scale(0.98)
```

### Card

```tsx
// background: var(--color-base-900)
// border: 1px solid var(--color-base-700)
// border-radius: var(--radius-lg)
// hover: border-color var(--color-brand-500 / 0.4)
//        box-shadow: var(--shadow-brand-sm)
```

### Input

```tsx
// background: var(--color-base-800)
// border: 1px solid var(--color-base-700)
// focus: border-color var(--color-brand-500)
//        box-shadow: 0 0 0 3px hsl(258 90% 55% / 0.2)
```

---

## 9. Layout System

### Breakpoints

```css
sm:  640px   /* Small tablets */
md:  768px   /* Tablets */
lg:  1024px  /* Laptops */
xl:  1280px  /* Desktops */
2xl: 1536px  /* Large screens */
```

### App Shell Layout

```
┌───────────────────────────────────────────────────┐
│  Topbar (60px height, full width)                 │
├──────────┬────────────────────────────────────────┤
│          │                                        │
│ Sidebar  │           Main Content Area            │
│ (260px)  │           (flex-1)                     │
│          │                                        │
│          │                                        │
└──────────┴────────────────────────────────────────┘
```

- Sidebar collapses to icon-only on mobile (with overlay)
- Content area has max-width: 900px centered for chat
- Full-width for dashboard/analytics views

---

## 10. Accessibility Standards

- **Color contrast** — All text meets WCAG AA (4.5:1 minimum)
- **Focus rings** — Visible, brand-colored focus indicators on all interactive elements
- **Keyboard navigation** — Full keyboard access to all features
- **Screen readers** — Proper ARIA labels, roles, live regions for streaming content
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` disables/simplifies all animations
- **Semantic HTML** — Correct heading hierarchy, landmark regions, button vs. div distinctions
