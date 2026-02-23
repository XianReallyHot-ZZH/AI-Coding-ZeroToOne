---
description: MotherDuck-inspired front-end style guardrails
globs: ["site/**/*.{ts,tsx,astro,mdx,css,scss,sass,less}", "src/**/*.{ts,tsx,astro,mdx,css,scss,sass,less}"]
alwaysApply: false
---

# MotherDuck Design System

A playful yet technical design system featuring yellow + blue palette, illustration-heavy aesthetics, and the iconic offset card shadow.

---

## Color Palette

### Brand Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--md-yellow` | `#FFE234` | Primary brand color, CTA buttons, highlights |
| `--md-yellow-dark` | `#F5D800` | Yellow hover state |
| `--md-yellow-pale` | `#FFFBE6` | Yellow tinted backgrounds |
| `--md-blue` | `#1A2B6B` | Deep navy, primary text, dark backgrounds |
| `--md-blue-mid` | `#2C3E9A` | Mid blue for gradients |
| `--md-blue-light` | `#E8ECFF` | Light blue backgrounds |

### Accent Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--md-duck-orange` | `#F4820A` | Eyebrow text, emphasis, warnings |
| `--md-teal` | `#00BFA5` | Success states, checkmarks, positive indicators |

### Neutral Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--md-white` | `#FFFFFF` | Pure white |
| `--md-off-white` | `#F9F8F5` | Page background (warm paper tone, NOT pure white) |
| `--md-gray-100` | `#F3F2EE` | Section backgrounds |
| `--md-gray-200` | `#E5E3DC` | Borders, dividers |
| `--md-gray-400` | `#9E9B8F` | Muted text, placeholders |
| `--md-gray-600` | `#5C5A53` | Body text (warm gray, NOT cold gray) |
| `--md-gray-900` | `#1C1B17` | Near black for headings |

---

## Typography

### Font Stack
```css
--font-sans: 'DM Sans', sans-serif;
--font-mono: 'DM Mono', monospace;
```

### Type Scale
| Token | Size | Usage |
|-------|------|-------|
| `--text-xs` | `0.75rem` (12px) | Captions, badges, meta |
| `--text-sm` | `0.875rem` (14px) | Small text, nav links |
| `--text-base` | `1rem` (16px) | Body text |
| `--text-lg` | `1.125rem` (18px) | Large body, lead text |
| `--text-xl` | `1.25rem` (20px) | Card titles |
| `--text-2xl` | `1.5rem` (24px) | Section subtitles |
| `--text-3xl` | `1.875rem` (30px) | Small headings |
| `--text-4xl` | `2.25rem` (36px) | Medium headings |
| `--text-5xl` | `3rem` (48px) | Large headings |
| `--text-6xl` | `3.75rem` (60px) | Hero headings |
| `--text-7xl` | `4.5rem` (72px) | Display headings |

### Line Height
| Token | Value | Usage |
|-------|-------|-------|
| `--lh-tight` | `1.15` | Headings (super tight) |
| `--lh-snug` | `1.3` | Card titles |
| `--lh-normal` | `1.5` | Default |
| `--lh-relaxed` | `1.7` | Body text, descriptions |

### Font Weight
| Token | Value |
|-------|-------|
| `--fw-regular` | `400` |
| `--fw-medium` | `500` |
| `--fw-semi` | `600` |
| `--fw-bold` | `700` |

### Typography Rules
- H1: `72px`, `letter-spacing: -0.03em`, `line-height: 1.15`
- Body text: `color: #5C5A53` (warm gray), `line-height: 1.7`
- Headings: `letter-spacing: -0.025em` to `-0.04em`

---

## Spacing (4pt Grid)

| Token | Value |
|-------|-------|
| `--sp-1` | `0.25rem` (4px) |
| `--sp-2` | `0.5rem` (8px) |
| `--sp-3` | `0.75rem` (12px) |
| `----sp-4` | `1rem` (16px) |
| `--sp-5` | `1.25rem` (20px) |
| `--sp-6` | `1.5rem` (24px) |
| `--sp-8` | `2rem` (32px) |
| `--sp-10` | `2.5rem` (40px) |
| `--sp-12` | `3rem` (48px) |
| `--sp-16` | `4rem` (64px) |
| `--sp-20` | `5rem` (80px) |
| `--sp-24` | `6rem` (96px) |
| `--sp-32` | `8rem` (128px) |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `6px` | Small elements, step numbers |
| `--radius-md` | `10px` | Buttons, inputs |
| `--radius-lg` | `16px` | Medium cards |
| `--radius-xl` | `24px` | Cards, modals |
| `--radius-2xl` | `32px` | Large containers |
| `--radius-pill` | `9999px` | Badges, tags, pills |

---

## Shadows

### Standard Shadows
```css
--shadow-sm:  0 1px 3px rgba(26,43,107,0.08);
--shadow-md:  0 4px 16px rgba(26,43,107,0.10);
--shadow-lg:  0 12px 40px rgba(26,43,107,0.14);
--shadow-xl:  0 24px 64px rgba(26,43,107,0.18);
```

### Offset Card Shadow (Signature Style)
The most iconic MotherDuck visual element - flat offset shadow creating an illustration-like depth:

```css
--shadow-card: 3px 3px 0 0 var(--md-blue);
```

**Usage Pattern:**
```css
.card {
  border: 2px solid var(--md-blue);
  box-shadow: 3px 3px 0 0 var(--md-blue);
  transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
}

.card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 0 var(--md-blue);
}

.card:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 0 var(--md-blue);
}
```

---

## Animation

### Timing
| Token | Value |
|-------|-------|
| `--dur-fast` | `150ms` |
| `--dur-base` | `250ms` |
| `--dur-slow` | `400ms` |

### Easing
```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
```

### Key Animations

**Float Animation (Hero elements):**
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
```

**Infinite Scroll (Testimonials):**
```css
@keyframes scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
```

---

## Components

### Buttons

**Primary Button (Yellow):**
```css
.btn--primary {
  background: var(--md-yellow);
  color: var(--md-blue);
  border: 2px solid var(--md-blue);
  box-shadow: 3px 3px 0 0 var(--md-blue);
  border-radius: var(--radius-md);
  padding: 10px 20px;
  font-weight: 600;
  font-size: 14px;
}

.btn--primary:hover {
  background: var(--md-yellow-dark);
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 0 var(--md-blue);
}
```

**Ghost Button:**
```css
.btn--ghost {
  background: transparent;
  color: var(--md-blue);
  border: 2px solid var(--md-gray-200);
}

.btn--ghost:hover {
  border-color: var(--md-blue);
  background: var(--md-blue-light);
}
```

**Dark Button:**
```css
.btn--dark {
  background: var(--md-blue);
  color: var(--md-yellow);
  border: 2px solid var(--md-blue);
  box-shadow: 3px 3px 0 0 var(--md-blue);
}
```

### Cards

```css
.card {
  background: var(--md-white);
  border-radius: var(--radius-xl);
  border: 1px solid var(--md-gray-200);
  padding: var(--sp-8);
}

.card:hover {
  border-color: var(--md-blue);
  box-shadow: var(--shadow-card);
  transform: translate(-2px, -2px);
}
```

**Card Variants:**
- `.card--wide`: `grid-column: span 2` (Bento grid)
- `.card--accent`: Dark blue background, yellow text
- `.card--yellow`: Yellow background, blue text

### Tags/Badges

```css
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.tag--blue {
  background: var(--md-blue-light);
  color: var(--md-blue);
  border: 1px solid rgba(26,43,107,0.12);
}
```

**Important:** Tags use light background + thin border, NOT solid fill.

### Bento Grid

```css
.bento {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-5);
}

.card--wide {
  grid-column: span 2;
}
```

Non-equal column layout with 1+2 span combinations.

---

## Layout Patterns

### Container
```css
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--sp-6);
}
```

### Section Spacing
- Hero: `padding: 96px 0 128px`
- Standard section: `padding: 96px 0`

### Navigation
```css
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--md-white);
  border-bottom: 1px solid var(--md-gray-200);
  height: 64px;
}
```

---

## Design Principles

1. **Playful yet Technical**: Balance whimsy (duck mascot, bright yellow) with technical credibility (clean code blocks, clear hierarchy)

2. **Illustration-Heavy**: Flat, geometric illustrations with bold outlines

3. **Offset Shadow = Identity**: The flat offset shadow is the most distinctive element - always pair with 2px solid border

4. **Warm Neutrals**: Never use pure cold grays; always lean warm (`#5C5A53` over `#666666`)

5. **Paper-like Background**: Off-white `#F9F8F5` creates warmth vs sterile pure white

6. **Generous Spacing**: Wide padding, breathing room, never cramped

7. **Bento Grid Asymmetry**: Non-uniform grid layouts create visual interest

---

## Quick Reference CSS Variables

```css
:root {
  --md-yellow:        #FFE234;
  --md-yellow-dark:   #F5D800;
  --md-yellow-pale:   #FFFBE6;
  --md-blue:          #1A2B6B;
  --md-blue-mid:      #2C3E9A;
  --md-blue-light:    #E8ECFF;
  --md-duck-orange:   #F4820A;
  --md-teal:          #00BFA5;
  --md-white:         #FFFFFF;
  --md-off-white:     #F9F8F5;
  --md-gray-100:      #F3F2EE;
  --md-gray-200:      #E5E3DC;
  --md-gray-400:      #9E9B8F;
  --md-gray-600:      #5C5A53;
  --md-gray-900:      #1C1B17;
  
  --font-sans:        'DM Sans', sans-serif;
  --font-mono:        'DM Mono', monospace;
  
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-2xl:  32px;
  --radius-pill: 9999px;
  
  --shadow-card: 3px 3px 0 0 var(--md-blue);
  
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 150ms;
  --dur-base: 250ms;
  --dur-slow: 400ms;
}
```
