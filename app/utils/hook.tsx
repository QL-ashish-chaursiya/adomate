import { useState, useCallback, useEffect, useRef, RefObject } from 'react';
import * as fabric from 'fabric';
import { FontOption, ImageDimensions } from '../types';
import {
  UNDO_STACK_LIMIT,
  AUTOSAVE_DELAY,
  LOCAL_STORAGE_KEYS,
  CANVAS_CONFIG
} from './constant';
import {
  loadGoogleFont,
  fetchGoogleFonts,
  saveToLocalStorage,
  loadFromLocalStorage
} from './index';

// Hook for managing Google Fonts
export const useGoogleFonts = () => {
  const [fontList, setFontList] = useState<FontOption[]>([]);
  const [selectedFont, setSelectedFont] = useState<FontOption | null>(null);
  const [loadingFonts, setLoadingFonts] = useState(true);

  useEffect(() => {
    const loadFonts = async () => {
      const fonts = await fetchGoogleFonts();
      setFontList(fonts);
      setSelectedFont(fonts[0] || null);
      setLoadingFonts(false);
    };

    loadFonts();
  }, []);

  const loadFont = useCallback(async (fontFamily: string) => {
    await loadGoogleFont(fontFamily);
  }, []);

  return {
    fontList,
    selectedFont,
    setSelectedFont,
    loadingFonts,
    loadFont
  };
};

// Hook for managing undo/redo functionality
export const useUndoRedo = (canvas: fabric.Canvas | null) => {
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const pushToUndoStack = useCallback(() => {
    if (!canvas) return;

    const state = JSON.stringify(canvas.toJSON());
    setUndoStack((prev) => {
      const newStack = [...prev, state];
      return newStack.slice(-UNDO_STACK_LIMIT);
    });
    setRedoStack([]);
  }, [canvas]);

  const undo = useCallback(() => {
    if (undoStack.length <= 1 || !canvas) return;

    const current = undoStack[undoStack.length - 1];
    const previous = undoStack[undoStack.length - 2];

    setRedoStack((prev) => [...prev, current]);
    setUndoStack((prev) => prev.slice(0, -1));

    canvas.loadFromJSON(previous, () => {
      canvas.getObjects().forEach((obj) => {
        if (obj.type === 'textbox') {
          loadGoogleFont((obj as fabric.Textbox).fontFamily || 'Roboto');
        }
      });
      canvas.renderAll();
    });
  }, [undoStack, canvas]);

  const redo = useCallback(() => {
    if (redoStack.length === 0 || !canvas) return;

    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, next]);
    setRedoStack((prev) => prev.slice(0, -1));

    canvas.loadFromJSON(next, () => {
      canvas.getObjects().forEach((obj) => {
        if (obj.type === 'textbox') {
          loadGoogleFont((obj as fabric.Textbox).fontFamily || 'Roboto');
        }
      });
      canvas.renderAll();
    });
  }, [redoStack, canvas]);

  return {
    undoStack,
    redoStack,
    pushToUndoStack,
    undo,
    redo
  };
};

// Hook for managing autosave functionality
export const useAutosave = (canvas: fabric.Canvas | null) => {
  const [autosaveStatus, setAutosaveStatus] = useState('');

  const triggerAutosave = useCallback(() => {
    if (!canvas) return;

    const state = canvas.toJSON();
    saveToLocalStorage(LOCAL_STORAGE_KEYS.COMPOSER_STATE, state);
    setAutosaveStatus('Autosaved!');
    setTimeout(() => setAutosaveStatus(''), AUTOSAVE_DELAY);
  }, [canvas]);

  return {
    autosaveStatus,
    triggerAutosave
  };
};

// Hook for managing canvas state
export const useCanvasState = () => {
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [layers, setLayers] = useState<fabric.Object[]>([]);
  const [displayScale, setDisplayScale] = useState(1);
  const [originalImageDimensions, setOriginalImageDimensions] = useState<ImageDimensions | null>(null);

  const updateLayersList = useCallback((canvas: fabric.Canvas | null) => {
    if (canvas) {
      setLayers([...canvas.getObjects()]);
    }
  }, []);

  const updateControlsFromObject = useCallback((obj: fabric.Object) => {
    if (obj.type === 'textbox') {
      const textObj = obj as fabric.Textbox;
      return {
        fontFamily: textObj.fontFamily || 'Roboto',
        fontSize: textObj.fontSize || 50,
        fontWeight: textObj.fontWeight?.toString() || '400',
        fill: textObj.fill?.toString() || '#222222',
        opacity: textObj.opacity || 1,
        textAlign: (textObj.textAlign as 'left' | 'center' | 'right') || 'left',
        text: textObj.text || ''
      };
    }
    return null;
  }, []);

  return {
    selectedObject,
    setSelectedObject,
    layers,
    displayScale,
    setDisplayScale,
    originalImageDimensions,
    setOriginalImageDimensions,
    updateLayersList,
    updateControlsFromObject
  };
};

// Hook for managing keyboard shortcuts
export const useKeyboardShortcuts = (
  selectedObject: fabric.Object | null,
  canvas: fabric.Canvas | null,
  onDelete: () => void,
  onUndo: () => void,
  onRedo: () => void
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedObject || !canvas) return;

      // Delete key
      if (e.key === 'Delete') {
        onDelete();
        e.preventDefault();
        return;
      }

      // Undo/Redo with Ctrl/Cmd
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
        e.preventDefault();
        return;
      }

      // Arrow key navigation
      const delta = e.shiftKey ? 10 : 1;
      let moved = false;

      switch (e.key) {
        case 'ArrowLeft':
          selectedObject.left! -= delta;
          moved = true;
          break;
        case 'ArrowRight':
          selectedObject.left! += delta;
          moved = true;
          break;
        case 'ArrowUp':
          selectedObject.top! -= delta;
          moved = true;
          break;
        case 'ArrowDown':
          selectedObject.top! += delta;
          moved = true;
          break;
        default:
          return;
      }

      if (moved) {
        selectedObject.setCoords();
        canvas.renderAll();
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, canvas, onDelete, onUndo, onRedo]);
};

// Hook for managing localStorage persistence
export const useLocalStorage = (canvasRef: RefObject<fabric.Canvas | null>) => {
  const restoreFromLocalStorage = useCallback((onDone?: (c: fabric.Canvas) => void) => {
    const saved = loadFromLocalStorage<string>(LOCAL_STORAGE_KEYS.COMPOSER_STATE);

    const canvas = canvasRef.current;
    if (!saved || !canvas) return;
    const hasContext = Boolean((canvas as any).contextContainer);
    if (!hasContext) return;

    try {
      const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
      canvas.loadFromJSON(parsed, () => {
        canvas.getObjects().forEach((obj) => {
          if (obj.type === 'textbox') {
            loadGoogleFont((obj as fabric.Textbox).fontFamily || 'Roboto');
          }
        });
        canvas.renderAll();
        if (onDone) onDone(canvas);
      });
    } catch (err) {
      // Swallow errors during HMR/reload if canvas was torn down
      console.error('restoreFromLocalStorage failed:', err);
    }
  }, [canvasRef]);

  const clearLocalStorage = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.COMPOSER_STATE);
  }, []);

  return {
    restoreFromLocalStorage,
    clearLocalStorage
  };
};

export function useHandleCanvasReady({
  fabricCanvasRef,
  setSelectedObject,
  updateControlsFromObject,
  setTextProperties,
  setTextInput,
  pushToUndoStack,
  triggerAutosave,
  restoreFromLocalStorage,
  setDisplayScale,
  setOriginalImageDimensions,
}: any) {
  return useCallback(
    (canvas: fabric.Canvas) => {
      fabricCanvasRef.current = canvas;

      // --- Canvas event listeners ---
      canvas.on('selection:created', (e: any) => {
        const obj = e.selected?.[0] ?? null;
        setSelectedObject(obj);
        if (obj) {
          const controls = updateControlsFromObject(obj);
          if (controls) {
            setTextProperties(controls);
            setTextInput(controls.text);
          }
        }
      });

      canvas.on('selection:updated', (e: any) => {
        const obj = e.selected?.[0] ?? null;
        setSelectedObject(obj);
        if (obj) {
          const controls = updateControlsFromObject(obj);
          if (controls) {
            setTextProperties(controls);
            setTextInput(controls.text);
          }
        }
      });

      canvas.on('selection:cleared', () => {
        setSelectedObject(null);
        setTextInput('');
      });

      canvas.on('object:modified', () => {
        pushToUndoStack();
        triggerAutosave();
      });

      // --- Load initial state safely ---
      if (canvas && (canvas as any).contextContainer) {
        restoreFromLocalStorage((c: fabric.Canvas) => {
          // Ensure a restored background image scales the internal dims
          const bg = c.backgroundImage as fabric.Image | undefined;
          if (bg) {
            const w = (bg as any).width ?? 0;
            const h = (bg as any).height ?? 0;
            if (w && h) {
              const sx = (bg.scaleX ?? 1);
              const sy = (bg.scaleY ?? 1);
              c.setDimensions({ width: w * sx, height: h * sy });
              setOriginalImageDimensions({ width: w, height: h });
              setDisplayScale(sx);
              c.renderAll();
            }
          }
        });
      }
    },
    [
      fabricCanvasRef,
      setSelectedObject,
      updateControlsFromObject,
      setTextProperties,
      setTextInput,
      pushToUndoStack,
      triggerAutosave,
      restoreFromLocalStorage,
      setDisplayScale,
      setOriginalImageDimensions,
    ]
  );
}
