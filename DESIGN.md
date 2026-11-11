---
version: alpha
colors:
  primary: "#245D8B"
  primaryDeep: "#1F4F7A"
  accent: "#4C8FC5"
  surface: "#FFFFFF"
  canvas: "#F4F7FB"
  ink: "#14233A"
  muted: "#68758A"
  line: "#DFE5EE"
typography:
  display:
    fontFamily: "Inter, Avenir Next, Segoe UI, system-ui, sans-serif"
  body:
    fontFamily: "Inter, Avenir Next, Segoe UI, system-ui, sans-serif"
  data:
    fontFamily: "Inter, Segoe UI, system-ui, sans-serif"
rounded:
  card: "18px"
  control: "12px"
  compact: "9px"
spacing:
  compact: "8px"
  standard: "16px"
  section: "24px"
components:
  card:
    background: "#FFFFFF"
    border: "#DFE5EE"
  button:
    primary: "#245D8B"
  icon:
    family: "Lucide"
---

## Overview
Miaki is a compact, blue travel-and-life workspace for Mia and Taiki. It should feel like a well-kept personal organizer: friendly, direct, and dense enough to scan without decorative clutter. The product register leads; the memorable signature is the layered blue navigation paired with crisp white working surfaces.

## Colors
Blue communicates navigation and action. Pale blue may group information, but icons remain unboxed. Red is reserved for destructive actions and negative financial states.

## Typography
Use the established sans stack. Money and time use tabular numerals. Large values carry hierarchy; labels stay concise and uppercase only for utility captions.

## Layout
Desktop uses a fixed blue sidebar and one natural document scroller. The overview pairs a chronological schedule with a quieter bookings column beneath a compact summary strip. Mobile stacks these sections and retains bottom navigation. Use Segoe UI/Avenir Next for readable text, restrained 600-weight headings, and pale blue form surfaces. app/refinement.css owns this shared presentation.

## Elevation & Depth
Use borders first. Working cards have no shadow; reserve restrained shadows for floating dialogs. Runtime tokens live in app/globals.css with the shared refinement in app/refinement.css, imported last by the root layout.

## Shapes
Cards are softly rounded; controls are tighter. Avoid excessive pill shapes and icon tiles.

## Components
Use consistent user-facing nouns: Itinerary (never Agenda), traveler (never Person), booking (never Reservation), expense, packing item, and trip. Use these same terms in navigation, buttons, dialogs, empty states, and feedback. Internal data keys stay stable.
Toolbar actions use SVG icons with accessible names and tooltips. Search, time, and action controls share a 38px height. Trip selection lives in the top context row, alongside the current section title, with create/delete actions preserved. Hide routine successful sync copy; retain visible save failures. Summary cards omit explanatory captions and use compact padding. Prefer short budget headings over decorative labels and paragraphs.
Forms use visible labels, native semantic controls, explicit status feedback, and reversible editing where practical. Charts use the same blue family with text values available outside color alone.

## Do's and Don'ts
Do keep data scannable, use Lucide SVG icons, and preserve mobile reachability. Do not use emoji icons, black sidebars, oversized empty padding, or decorative gradients unrelated to hierarchy.

Budget uses one compact paycheck-and-totals strip, 36px commitment fields, and short empty states. Keep the page identity in navigation instead of repeating it inside the budget. Use “Savings” consistently in summary and chart labels. Narrow screens wrap rows while retaining readable input text and natural document scrolling.
Desktop navigation uses an explicit Show/Hide sidebar button in the workspace header. Open displays a 190px labeled sidebar; closed removes it and returns the space to the workspace. Hover does not change visibility. Mobile retains bottom navigation. The toggle remains available on every desktop page, including Mia Budget.

Notes uses the existing per-trip tripNotes field and shared autosave. Edits in the Notes editor also keep a browser-only draft, offered for explicit recovery when it differs; never silently overwrite shared notes. Mobile navigation scrolls horizontally to keep all seven destinations reachable.

Monthly budget history uses native expandable rows, newest first, with paycheck, bills, savings, and remaining visible. Expanded rows show immutable recorded commitment amounts and recurrence. Legacy totals stay readable without inventing missing item details. Keep all recorded months.

Itinerary offers List and Horizontal views of the same day sections. Horizontal lays dates left to right in a locally scrolling region with keyboard focus and explicit earlier/later scroll buttons; edits, search, and completion remain shared. Print expands all days.

Itinerary refinements use flat compact summary counts, plain blue dates, 8px corners, 10px event padding, and sentence-case text categories. Activities support optional closing times and an explicit hours-pending state; notes preserve room details and timing caveats. Never invent unpublished operating hours.

Shared compact density applies across Overview, Itinerary, Expenses, Packing, Notes, Audit Log, Mia Budget, and dialogs: 12px section gaps, 14px desktop/12px mobile panel padding, 8px corners, 17px panel headings, and 8–10px row padding. Summaries use quiet white surfaces; avoid oversized empty states. Notes remains resizable with a 220px minimum. Keep mobile form text at 16px and coarse-pointer controls usable.
