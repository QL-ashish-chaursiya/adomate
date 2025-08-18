## Setup and run instructions
Clear Localstorage before start
```bash
npm install
npm run dev
# open http://localhost:3000
```

Production build:
```bash
npm run build
npm start
```

Lint:
```bash
npm run lint
```

## Concise description of the architecture

- **App entry (`app/page.tsx`)**: Wires together UI components and hooks; holds minimal page-level state and callbacks.
- **Components (`app/components/`)**:
  - `Canvas.tsx`: Initializes a Fabric.js canvas and exposes it via a ready callback.
  - `Toolbar.tsx`: Text editing controls, undo/redo/reset/export buttons.
  - `ImageUpload.tsx`: PNG file upload input.
  - `LayerPanel.tsx`: Lists layers, select/move/delete actions.
- **Hooks (`app/utils/hook.tsx`)**:
  - `useGoogleFonts`, `useUndoRedo`, `useAutosave`, `useCanvasState`, `useKeyboardShortcuts`, `useLocalStorage`, `useHandleCanvasReady`.
- **Utilities (`app/utils/index.ts`)**: Fabric helpers (create canvas, snapping), Google Fonts loader, storage helpers, export helpers, text object factory.
- **Configuration (`app/utils/constant.ts`)**: Canvas size/colors, limits, Google Fonts API config, localStorage keys.
- **Types (`app/types/index.ts`)**: Centralized TypeScript interfaces.

Data and control flow: user actions in `Toolbar`/`LayerPanel` modify the Fabric canvas; hooks snapshot state to undo/redo stacks and autosave to localStorage; the canvas emits selection/modified events to sync UI controls.

## Technology choices and trade-offs

- **Fabric.js 6**: Rich object-based canvas editing with selection, transforms, and serialization.
  - Trade-off: Snapshot-based history can be memory-heavy for large scenes; Fabric’s type surface is broad and occasionally requires narrow casts.
- **Next.js 15 + React 19**: Modern app-router project structure and fast dev (Turbopack).
  - Trade-off: App Router SSR isn’t used for the editor; mostly a client-side tool, but Next gives good DX and deployment ergonomics.
- **TypeScript**: Strong typing for hooks/utilities/components.
  - Trade-off: Some Fabric event payloads need careful typing to avoid `any`.
- **Google Fonts (on-demand CSS injection)**: Simple runtime font loading.
  - Trade-off: First render with a new font may wait ~200ms for stylesheet.
- **localStorage autosave**: Zero-backend persistence for a single-user editor.
  - Trade-off: Limited storage and device-local only; no multi-device sync.

- **Undo/Redo**: 20-step history, toolbar buttons and shortcuts (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z).
- **Autosave**: Debounced save of canvas JSON to `localStorage` (`composer_state`).
- **Keyboard controls**: Delete to remove selection; Arrow keys to nudge (Shift for 10px).
- **Layer management**: Select from list, move up/down, delete.
- **Snapping**: Basic snap-to-canvas-center when moving objects.
- **Export**: PNG export; when original image dimensions are known, exports at source resolution.
- **Google Fonts integration**: Dynamic font list and runtime loading.

## Known limitations

- PNG uploads only (max 4MB).
- Snapshot-based undo/redo; very large scenes can increase memory usage.
- No backend persistence or collaboration; autosave is device-local.
- Font loading depends on Google Fonts availability; brief flash/delay possible when switching fonts.
