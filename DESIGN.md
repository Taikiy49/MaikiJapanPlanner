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
Desktop uses a fixed sidebar and one natural document scroller. Mobile uses a fixed bottom navigation and stacked cards with no horizontal overflow.

## Elevation & Depth
Use borders first. Working cards have no shadow; reserve restrained shadows for floating dialogs. Runtime tokens live in app/globals.css with the shared refinement in app/refinement.css, imported last by the root layout.

## Shapes
Cards are softly rounded; controls are tighter. Avoid excessive pill shapes and icon tiles.

## Components
Forms use visible labels, native semantic controls, explicit status feedback, and reversible editing where practical. Charts use the same blue family with text values available outside color alone.

## Do's and Don'ts
Do keep data scannable, use Lucide SVG icons, and preserve mobile reachability. Do not use emoji icons, black sidebars, oversized empty padding, or decorative gradients unrelated to hierarchy.
