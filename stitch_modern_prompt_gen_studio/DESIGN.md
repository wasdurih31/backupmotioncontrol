---
name: Monolith Prompt Architecture
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1b'
  surface-container: '#1f1f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#303030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#ffffff'
  on-tertiary: '#303030'
  tertiary-container: '#e4e2e1'
  on-tertiary-container: '#656464'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474747'
  background: '#131313'
  on-background: '#e2e2e2'
  surface-variant: '#353535'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  container-max: 1200px
---

## Brand & Style

The design system is engineered for high-performance prompt engineering and AI interaction. It targets power users, developers, and creative technologists who require a distraction-free environment that prioritizes content and logic over decorative elements.

The aesthetic follows a **High-Contrast Minimalism** approach. By utilizing a strictly restricted palette of absolute blacks and pure whites, the UI achieves a "terminal-plus" feel—combining the efficiency of a command-line interface with the sophisticated precision of modern high-tech software. The emotional response should be one of focus, authority, and technological edge. Every pixel must serve a functional purpose; whitespace is used not just for aesthetics, but as a structural tool to separate complex logic blocks.

## Colors

This design system utilizes a "Deep Dark" philosophy to minimize eye strain during long technical sessions. 

- **Backgrounds:** The base layer is absolute `#000000`. This creates a sense of infinite depth and ensures maximum contrast for text.
- **Surface Containers:** We use subtle steps of gray (`#1A1A1A` and `#333333`) to define functional areas without relying on heavy borders or shadows.
- **Typography & Icons:** Pure White (`#FFFFFF`) is reserved for primary actions and headings. High-utility text uses a 70% opacity white to manage visual hierarchy.
- **Accents:** While the brand is monochromatic, a vibrant "Electric Blue" (`#007AFF`) is used sparingly as a "logic-state" indicator (e.g., active focus rings, progress bars, or "Run" success states).

## Typography

The typography system relies on **Inter** for its neutral, highly legible characteristics. We introduce **JetBrains Mono** specifically for prompt input fields and technical output to reinforce the "tooling" nature of the application.

- **Scale:** High contrast between Display and Body sizes ensures a clear path for the eye.
- **Case:** Use `label-caps` for section headers and metadata to provide a structured, architectural feel.
- **Spacing:** Tighten letter spacing on large headlines for a more "locked-in" appearance. Increase line-height on body text to 150% to improve readability of long-form AI prompts.

## Layout & Spacing

The layout is built on a **Strict 8px Grid**. This ensures that all components align mathematically, contributing to the "High-Tech" precision of the UI.

- **Grid Model:** Use a 12-column fluid grid for desktop and a single-column layout for mobile. 
- **The "Logic Gap":** Use larger spacing (48px+) between the "Input Zone" and the "Output/Generation Zone" to visually separate the user's intent from the AI's result.
- **Margins:** Desktop views should feature generous side margins (`40px`) to keep content centered and focused, preventing line lengths from becoming too long for readability.

## Elevation & Depth

In a minimalist dark system, we avoid traditional drop shadows which can appear "muddy" on black backgrounds.

- **Tonal Tiers:** Elevation is expressed through color, not shadows. Level 0 is `#000000`. Level 1 (cards/inputs) is `#1A1A1A`. Level 2 (modals/popovers) is `#262626`.
- **Borders:** Use 1px solid borders for definition. On Level 1 surfaces, the border should be `#333333`. This creates a crisp, "wireframe" aesthetic.
- **Active State:** Use a 1px White border to indicate focus or selection. This provides an unmistakable high-contrast signal to the user.

## Shapes

The shape language is **Soft-Geometric**. We use small corner radii to make the UI feel modern and approachable without losing its professional, "engineered" edge.

- **Small Components:** Buttons and Input fields use a 4px radius (`0.25rem`).
- **Containers:** Large cards and section blocks use an 8px radius (`0.5rem`).
- **Interactive Elements:** Avoid pill shapes or circles unless they are specifically for status indicators or avatars. Square corners with slight rounding convey more stability for a technical tool.

## Components

### Primary Buttons
Pure White background with Black text. No shadow. On hover, apply a subtle 90% opacity. The transition should be instant (50ms) to feel responsive.

### Input Fields
Background of `#1A1A1A` with a `#333333` border. Use `code-md` (JetBrains Mono) for text entry. When focused, the border changes to Pure White.

### Chips & Tags
Ghost-style borders (1px white at 20% opacity) with `label-caps` text. Used for prompt categories or variables.

### Cards (Prompt Library)
Minimalist containers with a 1px border. No background color change from the main surface unless nested. Titles in `headline-sm`, metadata in `body-sm` (60% opacity).

### Action Lists
Vertical stacks of actions with 1px bottom borders in `#1A1A1A`. Hover states use a subtle background shift to `#1A1A1A`.

### The "Prompt Shell"
A dedicated code-block component for the main generator output. Background should be `#0D0D0D` (slightly lighter than black) with a persistent "Copy" action in the top-right corner using the Accent Blue on hover.