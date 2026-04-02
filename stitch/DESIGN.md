# Design System Document: Industrial Refinement

## 1. Overview & Creative North Star: "The Architectural Monolith"

This design system moves away from the cluttered, utility-first aesthetic common in the construction industry. Our Creative North Star is **"The Architectural Monolith."** 

We treat digital space like a high-end construction site: structured, heavy-duty, yet governed by precise engineering and clean lines. We break the "template" look by utilizing intentional asymmetry, where large-scale editorial typography sits offset against dense, functional data. The goal is to convey "Industrial Trust" through sophisticated tonal layering and expansive breathing room, rather than rigid boxes and borders. We are not just delivering gravel and slate; we are the foundation of professional French infrastructure.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule

The palette transitions from the raw, earthy heat of `primary` (#a43700) to the cool, professional stability of `tertiary` (#005bb3) and `secondary` (#546067).

### The "No-Line" Rule
To achieve a premium, architectural feel, **designers are prohibited from using 1px solid borders for sectioning.** Boundaries must be defined solely through background shifts. For example, a `surface-container-low` section should sit directly against a `surface` background to define its territory.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of stone and glass. 
- Use `surface-container-lowest` (#ffffff) for the most elevated interactive elements (like cards).
- Use `surface-container` (#dbf1fe) or `surface-dim` (#c7dde9) for the "ground" or structural background.
- **Nesting:** An inner detail panel should use a slightly higher or lower tier than its parent to define importance without a single stroke of a pen.

### The "Glass & Gradient" Rule
To avoid a "flat" industrial look, use Glassmorphism for floating navigation or overlays. Utilize `surface` colors at 80% opacity with a `20px` backdrop blur. For primary CTAs, apply a subtle linear gradient from `primary` (#a43700) to `primary_container` (#cd4700) at a 135-degree angle to provide a "metallic" luster and visual soul.

---

## 3. Typography: Robust Authority

We pair **Work Sans** (Display/Headline) with **Manrope** (Body/Label) to balance industrial grit with modern legibility.

- **Display-LG (3.5rem, Work Sans):** Reserved for hero moments. Use tight letter-spacing (-0.02em) to mimic the weight of a stamped steel beam.
- **Headline-MD (1.75rem, Work Sans):** Used for section starts. Place these with generous leading and often offset from the grid for an editorial feel.
- **Body-LG (1rem, Manrope):** The workhorse. Manrope’s geometric nature ensures high readability for delivery specs and material descriptions.
- **Label-MD (0.75rem, Manrope):** All-caps for technical data (SKUs, weight, dimensions) to evoke the feel of a blueprint or shipping manifest.

---

## 4. Elevation & Depth: Tonal Layering

We reject traditional box-shadows. Depth is earned through light and material, not artificial outlines.

- **The Layering Principle:** Stack `surface-container-lowest` cards on `surface-container-low` sections. This creates a "soft lift" that feels like a physical object resting on a matte surface.
- **Ambient Shadows:** For high-priority floating elements (Modals/FABs), use a multi-layered shadow: `0px 12px 32px rgba(7, 30, 39, 0.06)`. The shadow color is a tinted version of `on_surface` to mimic natural ambient occlusion.
- **The "Ghost Border" Fallback:** If a container absolutely requires a boundary for accessibility, use `outline_variant` (#e3bfb2) at **15% opacity**. It should be felt, not seen.
- **Glassmorphism:** Use `surface_bright` with a `0.7` alpha and `blur(12px)` for headers to allow content to bleed through, softening the transition between heavy industrial sections.

---

## 5. Components: The Industrial Primitives

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `rounded-md` (0.375rem). No border. High-contrast `on_primary` text.
- **Secondary:** `surface_container_highest` fill with `on_surface` text. Feels like "machined aluminum."
- **Tertiary:** Transparent background, `primary` text. Used for low-emphasis actions like "Cancel" or "View Details."

### Input Fields
- **Industrial Form:** No bottom border only. Use a solid `surface_container_highest` background with a `rounded-sm` (0.125rem) corner. 
- **Focus State:** Transition the background to `surface_container_lowest` and add a `2px` "Ghost Border" of `primary` at 40% opacity.

### Cards & Lists
- **The Forbidding of Dividers:** Never use a horizontal line to separate list items. Use a `1.5` (0.375rem) vertical gap and a subtle background shift on hover to `surface_container_low`.
- **Material Status Chips:** Use `tertiary_fixed` for "In Transit" and `primary_fixed` for "Dispatched." These should be `rounded-full` with `label-sm` typography.

### Custom Component: The "Load Meter"
A specialized progress bar for delivery weight. Use `surface_variant` as the track and a `primary` to `primary_container` gradient for the fill. This reinforces the core business of TVM38.

---

## 6. Do’s and Don’ts

### Do
- **Use "Aggressive" Whitespace:** Use the `16` (4rem) and `24` (6rem) spacing tokens to separate major content blocks. Efficiency is born from clarity.
- **Asymmetric Layouts:** Place your `headline-lg` on the left and your `body-md` description offset to the right, creating a sophisticated architectural flow.
- **Tinted Neutrals:** Always use `on_surface` (#071e27) for text rather than pure black; it keeps the design tied to the "Slate Grey" earthy roots.

### Don't
- **Don't use 100% opaque borders:** It makes the UI look like a legacy spreadsheet.
- **Don't use generic icons:** Use thick-stroke (2px or 2.5px) industrial icons that match the weight of the Work Sans headlines.
- **Don't clutter:** If a screen feels "busy," increase the surface nesting depth rather than adding more lines or boxes.