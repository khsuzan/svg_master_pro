<p align="center">
  <a href="https://github.com/khsuzan/svg_master_pro">
    <img src="assets/banner.png" alt="SVG Master Pro Logo" height="120" style="border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); display: block; margin: 0 auto;" />
  </a>
</p>

<h1 align="center">🎨 SVG Master Pro</h1>

<p align="center">
  <strong>The Ultimate Developer-Focused SVG Visual Canvas & Code Editor</strong>
</p>

<p align="center">
  <a href="https://github.com/khsuzan/svg_master_pro/releases">
    <img src="https://img.shields.io/badge/version-v1.0.7-f97316?style=for-the-badge&logo=semver" alt="Version" />
  </a>
  <a href="https://github.com/khsuzan/svg_master_pro">
    <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License" />
  </a>
  <a href="https://github.com/khsuzan/svg_master_pro/actions">
    <img src="https://img.shields.io/badge/build-passing-success?style=for-the-badge" alt="Build Status" />
  </a>
</p>

<p align="center">
  <a href="https://khsuzan.github.io/svg_master_pro/"><strong>⚡ Live Demo</strong></a> • 
  <a href="https://github.com/khsuzan/svg_master_pro"><strong>📂 GitHub Repository</strong></a>
</p>

---

SVG Master Pro is a state-of-the-art, developer-focused interactive SVG design tool and code editor. It brings together high-fidelity visual canvas manipulation and a real-time, bi-directional code editor powered by **CodeMirror** for professional vector design, refactoring, formatting, and custom styling.

> [!NOTE]
> All visual changes on the canvas are reflected instantly inside the code inspector. Similarly, editing the raw SVG nodes inside the code inspector immediately updates the visual design artboard.

---

## The Motivation: Why SVG Master Pro?

### The Challenge of Complex SVGs
When dealing with complex vector files—such as a single massive SVG sheet containing multiple diagrams, blueprints, or perspectives of an object (e.g., a **car schematic** featuring **front, back, top, right side, and left side views**)—we face significant design and development friction:
1. **Interactive Scale Limits**: Showing everything inside a single unified SVG results in tiny, hard-to-view parts, making precise visual interaction or isolated viewport focus near impossible.
2. **Export Loss in Figma / Illustrator**: Traditional vector tools like Figma or Adobe Illustrator are great for styling, but when you re-export the SVG, they **completely strip out custom HTML/SVG attributes**, clean DOM `id`s, semantic grouping wrappers (`<g>`), interactive anchor tags (`<a>`), custom classes, and standard HTML events.

### The Solution: Intact HTML with Live Preview
**SVG Master Pro** was born out of this exact pain point. It bridges the gap between raw web code integrity and visual drawing editors:
* **Zero Metadata Loss**: It allows developers to visually select, move, rotate, scale, isolate, zoom, and group paths **while keeping all custom HTML tags, IDs, event triggers, links, and code structures completely untouched**.
* **Visual Isolation & Extraction**: Features like right-click advanced zoom (to isolate elements) and right-click advanced delete (like *Delete Unselected*) allow you to easily carve out specific perspectives (e.g., front-view or top-view) into clean individual SVGs instantly.
* **Side-by-Side Bi-directional Control**: Provides a real-time visual canvas alongside an advanced **CodeMirror** console, allowing you to edit interactive SVGs with high-fidelity accuracy without ever breaking the underlying developer-injected DOM logic.

---

## The Interactive Floating Toolbar

The visual editing core of SVG Master Pro resides within its floating multi-action toolbar. While the left-click performs the primary tool action, several tools contain advanced context sub-menus triggered via **Right-Click** (or long-press context actions).

| 🛠️ Tool Name | ⚡ Primary Left-Click Action | 🖱️ Right-Click Context Menu Options |
| :--- | :--- | :--- |
| **🖱️ Select Tool** | Standard element/marquee group selection | *None (utilizes keyboard-drag overrides)* |
| **📍 Path Select Tool** | Granular vector selector targeting specific tags | Target filters: **Any Element**, **`<a>`** tags, **`<g>`** groups, or **`<path>`** shapes |
| **🔀 Move Tool** | Visual coordinate translation and offset shifts | *None* |
| **🔍 Zoom Tool** | Manual click/drag viewport scale adjustments | Camera tools: **Select to Zoom In**, **Snap Window to Content**, **Zoom to Center** |
| **🗑️ Delete Tool** | Instantly purges active selected canvas elements | Selective purges: **Delete Selection**, **Delete Unselected (Inverse)**, **Delete All** |
| **🔄 Rotate Tool** | Dynamic angular transformation overlays | Fast rotations: **Rotate 90° CW**, **Rotate 90° CCW**, **Rotate 180°** |
| **🖌️ Brush Select Tool** | Paintbrush-style multi-select by area | Brush size slider + presets (10–80px) via right-click |


### 1. Select Tool
The default interactive mode for general workspace selections.
* **Primary Function:** 
  * Select single SVG elements on click.
  * Drag marquee bounding boxes over visual elements to select multiple nodes simultaneously.
* **💡 Active Shortcut Action:** 
  * While objects are selected, hold the **`Ctrl` key** and drag your cursor to move the selected elements anywhere on the canvas dynamically.
* **Status Bar Feedback:** Updates the selection badge count in real-time.

---

### 2. Path Select Tool
Designed for specific nodes and isolated path selections, allowing granular filtering.
* **Primary Function:** Filters focus specifically on targeted tags. Click to select.
* **⚡ Right-Click Context Menu Filter:**
  By right-clicking this tool button, you can apply filters to restrict active mouse selection targets:
  | Filter Option | Tag Selector | Target Elements |
  | :--- | :--- | :--- |
  | **Any element** | `any` | Matches all selectable tags |
  | **`<a>`** | `a` | Selects only anchor link containers |
  | **`<g>`** | `g` | Selects only grouped elements |
  | **`<path>`** | `path` | Selects only raw `<path>` vector components |

---

### 3. Move Tool
Translates coordinates and re-aligns elements visually.
* **Primary Function:** Left-click and hold drag to translate and move selected SVG objects smoothly inside the workspace coordinates.
* **Usage Tip:** Best paired with the multi-select marquee to shift structural clusters together.

---

### 4. Zoom Tool
Camera navigation controls for the artboard viewport.
* **Primary Function:** Navigate the canvas viewport scale.
* **💡 Active Shortcut Action:** 
  * Hold the **`Ctrl` key** while scrolling your mouse wheel (or pinching/scrolling your trackpad) to zoom in and out of the artboard.
  * Press `Ctrl + Left Click` to zoom out incremental steps.
* **⚡ Right-Click Advanced Zoom Menu:**
  Right-click to access optimized viewport camera transformations:
  * 🔍 **Select to zoom in:** Activates high-precision zoom boundary selection (drag a rectangle to crop and fill the viewport).
  * 📐 **Snap window to content:** Auto-measures the canvas bounding box of all SVG elements, then automatically fits the camera directly inside those boundary margins.
  * 🎯 **Zoom to center:** Centers and resets the camera coordinate viewport to `(0,0)`.

---

### 5. Delete Tool
Powerful layer cleaning and quick element purging commands.
* **Primary Function:** Deletes the active visual selections instantly.
* **⚡ Right-Click Advanced Delete Sub-Menu:**
  Unleash advanced selective cleanup workflows directly from the canvas:
  * 🗑️ **Delete selection:** Clears only active highlighted elements.
  * 🔄 **Delete unselected (inverse):** Keeps only selected items and purges all other active artboard content. Extremely powerful for isolation refactoring.
  * ⚠️ **Delete all:** Total artboard wipeout. Clears every single item on the visual frame.

---

### 6. Rotate Tool
Angular rotations and transformations of vector structures.
* **Primary Function:** Performs direct angular manipulations on active selections.
* **⚡ Right-Click Transformation Menu:**
  Apply precise rotational math angles to selected nodes:
  * ↪️ **Rotate 90° CW:** Clockwise rotation (`90°`).
  * ↩️ **Rotate 90° CCW:** Counter-clockwise rotation (`-90°`).
  * 🔃 **Rotate 180°:** Inverts the graphic completely upside down (`180°`).

---

### 7. Brush Select Tool
Area-based multi-select using a circular brush cursor.
* **Primary Function:** Drag across the canvas to select all SVG elements whose bounding boxes intersect the brush circle. Elements are added to the selection in real time as you move.
* **⚡ Right-Click Brush Size Menu:**
  * **Slider:** Adjust brush radius from 5px to 100px.
  * **Presets:** Quick-select common sizes: **10px**, **20px**, **30px**, **50px**, **80px**.
* **💡 Active Shortcut Actions:**
  * `[` / `]` — Decrease / increase brush size by 5px (hold `Shift` for 1px steps).
  * Hold **`Shift`** while dragging to subtract elements from the current selection instead of adding.
  * Without `Shift`, dragging adds elements to the existing selection (or starts fresh if nothing was selected).

---

## Clipboard Operations & History Controls

SVG Master Pro features a robust internal clipboard buffer and history state manager to move, clone, and replicate graphic assets smoothly.

### Toolbar Buttons & Context Menu Commands
* **📋 Copy:** Saves the raw serialized XML elements of selected shapes into the internal memory buffer.
* **✂️ Cut:** Copies elements to the buffer while cleanly purging them from the artboard.
* **📥 Paste:** Spawns buffered SVG nodes from the clipboard directly onto the design canvas workspace.

### Active Keyboard Hotkeys
* **↩️ Undo (`Ctrl + Z`):** Rewind visual or code changes (up to 50 operations in buffer).
* **🔁 Redo (`Ctrl + Shift + Z`):** Fast-forward undone design updates.

---

## Structural Restructuring & Grouping

Maintain clean and standard SVG tree nodes through logical scoping controls.

### Group Tool
Wraps selected visual nodes into a unified group `<g>` element. 
* Triggering grouping (via the Group button in the floating toolbar or right-click canvas context menu) opens the **Group Attributes Modal**, allowing you to specify:
  * Custom `id` identifiers
  * Inline transforms
  * Classnames
  * Presentation attributes

### Extract Tool
Promotes or elevates selected nested SVG children out of their wrapping groups up into their parent containers, breaking complex groupings.

---

## Automated Housekeeping & Group Sweepers

Ensure light file footprints by clearing redundant, nested wrappers that contain no child visuals.

### 1. Clean Empty Groups (Instant Clean)
Standard click automatically traverses the SVG structure and sweeps empty node wrappers away.
* **Right-Click Filters:** Restricts instant sweeps to specific nodes:
  * **Empty groups:** Traverses `g, div, section` wrappers.
  * **Empty `<g>`:** Targets standard SVG vector groups.
  * **Empty `<a>`:** Sweeps anchor nodes with missing elements.
  * **Empty `<defs>`:** Cleans empty def definitions.
  * **All empty elements:** Sweeps any tag name containing empty nodes.

### 2. Confirmed Empty Group Removal
Performs identical sweeping rules as the instant clean tool but opens a visual confirmation dialog indicating the exact total of empty targets found prior to execution.

---

## SVG Optimization & Formatting

* **Minify / Compression mode:** Compresses code size down to its absolute minimum footprint—removing whitespace, unnecessary indentations, and comments. Perfect for loading assets into production apps.
* **Pretty-Print / Format mode:** Beautifully structures, indents, and splits tags onto clean, legible lines. Crucial for developer debugging and manual inspections.

---

## Visual Custom CSS & State Inhibitors

Add custom inline styles, custom classes, hover interactions, or custom vector keyframe animations directly into your SVG.

```css
/* Example injected styles */
svg {
  background: #121212;
}
.vector-node:hover {
  fill: #f97316 !important;
  stroke: #ffffff !important;
  transition: all 0.2s ease;
}
```

* **🎨 CSS Injector Modal:** 
  Click to open the CSS modal where you can write custom classes or import external `.css` files directly. Active injection will be compiled natively into the rendered SVG output.
* **⚡ Disable Hover Effects (Context Menu Switch):**
  When designing elements that have custom hover effects or interactive animations, selecting them can trigger styling shifts. Right-click the CSS Tool to toggle **Disable hover effects**. This disables hover triggers during editor interaction, letting you select and reposition elements in their default state.

---

## Status Bar Indicators

Located at the bottom of the canvas viewport, this bar offers real-time status feedback:

1. **Selection Counter Badge:** Shows active selected target counts (`X selected`). Features a quick-action clear button (`✕`) to clear selections.
2. **Clipboard Size Badge:** Displays active payloads in the copy/paste stack (`Y in clipboard`).


