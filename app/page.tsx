'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import Select from 'react-select';

// Google Fonts list (top 30)
const FONT_LIST = [
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Poppins', 'Merriweather', 'PT Sans',
  'Noto Sans', 'Josefin Sans', 'Raleway', 'Quicksand', 'Bebas Neue', 'Nunito', 'Playfair Display',
  'Source Sans Pro', 'Pacifico', 'Alfa Slab One', 'Abel', 'Anton', 'Bangers', 'Cabin', 'Dancing Script',
  'Fjalla One', 'Indie Flower', 'Lobster', 'Rubik', 'Slabo 27px', 'Work Sans', 'Varela Round'
].map(font => ({ value: font, label: font }));

interface TextLayerState {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fill: string;
  opacity: number;
  textAlign: string;
  left: number;
  top: number;
  angle: number;
}

interface ComposerState {
  layers: TextLayerState[];
  backgroundImageUrl: string | null;
}

const ImageTextComposer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [selectedFont, setSelectedFont] = useState(FONT_LIST[0]);
  const [fontSize, setFontSize] = useState(50);
  const [fontWeight, setFontWeight] = useState('400');
  const [textColor, setTextColor] = useState('#222222');
  const [textOpacity, setTextOpacity] = useState(1);
  const [textAlign, setTextAlign] = useState('left');
  const [textInput, setTextInput] = useState('');
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [layers, setLayers] = useState<fabric.Object[]>([]);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [autosaveStatus, setAutosaveStatus] = useState('');
  const [displayScale, setDisplayScale] = useState(1);
  // New state to store original image dimensions
  const [originalImageDimensions, setOriginalImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const maxWidth = 1100;
  const maxHeight = 600;
  // Push current state to undo stack
  const pushToUndoStack = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const state = JSON.stringify(fabricCanvasRef.current.toJSON());
    setUndoStack((prev) => {
      const newStack = [...prev, state];
      return newStack.slice(-20); // Keep only last 20 states
    });
    setRedoStack([]); // Clear redo stack
  }, []);

  // Autosave to localStorage
  const triggerAutosave = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const state = JSON.stringify(fabricCanvasRef.current.toJSON());
    localStorage.setItem('composer_state', state);
    setAutosaveStatus('Autosaved!');
    setTimeout(() => setAutosaveStatus(''), 1500);
  }, []);

  // Load Google Font
  const loadFont = useCallback((fontFamily: string) => {
    const linkId = `fontLink_${fontFamily.replace(/\s/g, '')}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.id = linkId;
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
        fontFamily.replace(/\s/g, '+')
      )}:wght@300;400;700&display=swap`;
      document.head.appendChild(link);
      // Wait for font to load
      setTimeout(() => {
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.renderAll();
        }
      }, 500); // Delay to ensure font is applied
    }
  }, []);

  // Update control values from selected object
  const updateControlsFromObject = useCallback((obj: fabric.Object) => {
    if (obj.type === 'textbox') {
      const textObj = obj as fabric.Textbox;
      setSelectedFont({ value: textObj.fontFamily || 'Roboto', label: textObj.fontFamily || 'Roboto' });
      setFontSize(textObj.fontSize || 50);
      setFontWeight(textObj.fontWeight?.toString() || '400');
      setTextColor(textObj.fill?.toString() || '#222222');
      setTextOpacity(textObj.opacity || 1);
      setTextAlign(textObj.textAlign || 'left');
      setTextInput(textObj.text || '');
    }
  }, []);

  // Update layers list
  const updateLayersList = useCallback(() => {
    if (fabricCanvasRef.current) {
      setLayers([...fabricCanvasRef.current.getObjects()]);
    }
  }, []);

  // Delete selected layer
  const deleteSelectedLayer = useCallback(() => {
    if (!selectedObject || !fabricCanvasRef.current) return;

    fabricCanvasRef.current.remove(selectedObject);
    setSelectedObject(null);
    updateLayersList();
    pushToUndoStack();
    triggerAutosave();
  }, [selectedObject, pushToUndoStack, triggerAutosave, updateLayersList]);

  // Restore from localStorage
  const restoreFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem('composer_state');
    if (saved && fabricCanvasRef.current) {
      fabricCanvasRef.current.loadFromJSON(saved, () => {
        fabricCanvasRef.current?.getObjects().forEach((obj) => {
          if (obj.type === 'textbox') {
            loadFont((obj as fabric.Textbox).fontFamily || 'Roboto');
          }
        });
        fabricCanvasRef.current?.renderAll();
        updateLayersList();
        const bg = fabricCanvasRef.current?.backgroundImage as fabric.FabricImage | undefined;
        if (bg) {
          setDisplayScale(bg.scaleX || 1);
          // Optionally, restore original dimensions if saved in state
        }
      });
    }
  }, [loadFont, updateLayersList]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width:maxWidth,
      height:  maxHeight,
      backgroundColor: '#ffffff'
    });

    fabricCanvasRef.current = canvas;

    // Canvas event listeners
    canvas.on('selection:created', (e: any) => {
      setSelectedObject(e.selected[0]);
      updateControlsFromObject(e.selected[0]);
    });

    canvas.on('selection:updated', (e: any) => {
      setSelectedObject(e.selected[0]);
      updateControlsFromObject(e.selected[0]);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
      setTextInput('');
    });

    canvas.on('object:modified', () => {
      pushToUndoStack();
      triggerAutosave();
    });

    // Snap to center
    canvas.on('object:moving', (e: any) => {
      const obj = e.target;
      if (!obj) return;

      const centerX = canvas.width! / 2;
      const centerY = canvas.height! / 2;
      const objCenterX = obj.left! + obj.getScaledWidth() / 2;
      const objCenterY = obj.top! + obj.getScaledHeight() / 2;
      const threshold = 10;

      if (Math.abs(objCenterX - centerX) < threshold) {
        obj.left = centerX - obj.getScaledWidth() / 2;
      }
      if (Math.abs(objCenterY - centerY) < threshold) {
        obj.top = centerY - obj.getScaledHeight() / 2;
      }
    });

    // Load initial state
    restoreFromLocalStorage();

    return () => {
      canvas.dispose();
    };
  }, [restoreFromLocalStorage, updateControlsFromObject, pushToUndoStack, triggerAutosave]);

  // Keyboard nudge and delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedObject || !fabricCanvasRef.current) return;

      if (e.key === 'Delete') {
        deleteSelectedLayer();
        e.preventDefault();
        return;
      }

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
        fabricCanvasRef.current.renderAll();
        pushToUndoStack();
        triggerAutosave();
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, pushToUndoStack, triggerAutosave, deleteSelectedLayer]);
  const MAX_IMAGE_SIZE_MB = 4; // 4MB max
  const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
  // Handle image upload
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file || file.type !== 'image/png') {
      alert('Please select a valid PNG image file under 4MB.');
      // Reset the input to clear file name
      if (event.target.value) event.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      alert('Image exceeds 4MB. Please choose a smaller PNG.');
      if (event.target.value) event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target?.result as string;
      fabric.FabricImage.fromURL(imgUrl).then((img: fabric.FabricImage) => {
        if (!fabricCanvasRef.current) return;

        const canvas = fabricCanvasRef.current;
        const origWidth = img.width!;
        const origHeight = img.height!;
        
        const scale = Math.min(maxWidth / origWidth, maxHeight / origHeight, 1);

        // Store original dimensions
        setOriginalImageDimensions({ width: origWidth, height: origHeight });

        canvas.setWidth(origWidth * scale);
        canvas.setHeight(origHeight * scale);

        img.set({
          scaleX: scale,
          scaleY: scale,
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
        });

        canvas.backgroundImage = img;
        canvas.renderAll();
        setDisplayScale(scale);
        pushToUndoStack();
        triggerAutosave();
      });
    };
    reader.readAsDataURL(file);
  }, [pushToUndoStack, triggerAutosave]);

  // Add new text layer
  const addTextLayer = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    loadFont(selectedFont.value);

    const textObj = new fabric.Textbox('New text', {
      left: 100,
      top: 100,
      fontFamily: selectedFont.value,
      fontSize: fontSize,
      fontWeight: fontWeight,
      fill: textColor,
      opacity: textOpacity,
      textAlign: textAlign as any,
      editable: true,
      selectable: true,
      evented: true,
      hasControls: true,
      lockScalingFlip: true,
      objectCaching: false,
    });

    fabricCanvasRef.current.add(textObj);
    fabricCanvasRef.current.setActiveObject(textObj);
    fabricCanvasRef.current.requestRenderAll();

    updateLayersList();
    pushToUndoStack();
    triggerAutosave();
  }, [selectedFont, fontSize, fontWeight, textColor, textOpacity, textAlign, loadFont, pushToUndoStack, triggerAutosave, updateLayersList]);

  // Update selected text object
  const updateSelectedText = useCallback(() => {
    if (!selectedObject || selectedObject.type !== 'textbox') return;

    const textObj = selectedObject as fabric.Textbox;
    textObj.set({
      text: textInput,
      fontFamily: selectedFont.value,
      fontSize: fontSize,
      fontWeight: fontWeight,
      fill: textColor,
      opacity: textOpacity,
      textAlign: textAlign as any
    });

    loadFont(selectedFont.value);
    fabricCanvasRef.current?.renderAll();
    updateLayersList();
    pushToUndoStack();
    triggerAutosave();
  }, [selectedObject, textInput, selectedFont, fontSize, fontWeight, textColor, textOpacity, textAlign, loadFont, pushToUndoStack, triggerAutosave, updateLayersList]);

  // Move layer up/down
  const moveLayer = useCallback((obj: fabric.Object, direction: 'up' | 'down') => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current as any; // Type assertion to bypass TypeScript error
    if (direction === 'up') {
      canvas.bringForward(obj, true);
    } else {
      canvas.sendBackwards(obj, true);
    }

    updateLayersList();
    pushToUndoStack();
    triggerAutosave();
  }, [pushToUndoStack, triggerAutosave, updateLayersList]);

  // Undo
  const undo = useCallback(() => {
    if (undoStack.length <= 1 || !fabricCanvasRef.current) return;

    const current = undoStack[undoStack.length - 1];
    const previous = undoStack[undoStack.length - 2];

    setRedoStack((prev) => [...prev, current]);
    setUndoStack((prev) => prev.slice(0, -1));

    fabricCanvasRef.current.loadFromJSON(previous, () => {
      fabricCanvasRef.current?.getObjects().forEach((obj) => {
        if (obj.type === 'textbox') {
          loadFont((obj as fabric.Textbox).fontFamily || 'Roboto');
        }
      });
      fabricCanvasRef.current?.renderAll();
      updateLayersList();
      const bg = fabricCanvasRef.current?.backgroundImage as fabric.FabricImage | undefined;
      if (bg) {
        setDisplayScale(bg.scaleX || 1);
      }
      triggerAutosave();
    });
  }, [undoStack, loadFont, updateLayersList, triggerAutosave]);

  // Redo
  const redo = useCallback(() => {
    if (redoStack.length === 0 || !fabricCanvasRef.current) return;

    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, next]);
    setRedoStack((prev) => prev.slice(0, -1));

    fabricCanvasRef.current.loadFromJSON(next, () => {
      fabricCanvasRef.current?.getObjects().forEach((obj) => {
        if (obj.type === 'textbox') {
          loadFont((obj as fabric.Textbox).fontFamily || 'Roboto');
        }
      });
      fabricCanvasRef.current?.renderAll();
      updateLayersList();
      const bg = fabricCanvasRef.current?.backgroundImage as fabric.FabricImage | undefined;
      if (bg) {
        setDisplayScale(bg.scaleX || 1);
      }
      triggerAutosave();
    });
  }, [redoStack, loadFont, updateLayersList, triggerAutosave]);

  // Reset canvas
  const resetCanvas = useCallback(() => {
    if (!confirm('Reset and clear all content?')) return;

    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundImage = undefined; // Fixed assignment
      fabricCanvasRef.current.setWidth(maxWidth);
      fabricCanvasRef.current.setHeight(maxHeight);
      fabricCanvasRef.current.renderAll();
    }

    localStorage.removeItem('composer_state');
    setLayers([]);
    setSelectedObject(null);
    setUndoStack([]);
    setRedoStack([]);
    setDisplayScale(1);
    setOriginalImageDimensions(null); // Reset original dimensions
    updateLayersList();
  }, [updateLayersList]);

  // Export as PNG
  const exportToPNG = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    // If no background image is set, use default canvas dimensions
    if (!originalImageDimensions) {
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 1
      });

      const link = document.createElement('a');
      link.download = 'composition.png';
      link.href = dataURL;
      link.click();
      return;
    }

    // Temporarily set canvas to original dimensions for export
    const canvas = fabricCanvasRef.current;
    const currentWidth = canvas.getWidth();
    const currentHeight = canvas.getHeight();
    const currentBackground = canvas.backgroundImage as fabric.FabricImage | undefined;

    // Scale canvas and objects to original dimensions
    canvas.setWidth(originalImageDimensions.width);
    canvas.setHeight(originalImageDimensions.height);

    if (currentBackground) {
      currentBackground.set({
        scaleX: 1,
        scaleY: 1
      });
    }

    // Adjust text objects to maintain their relative size
    canvas.getObjects().forEach((obj) => {
      if (obj.type === 'textbox') {
        const textObj = obj as fabric.Textbox;
        textObj.scaleX = (textObj.scaleX || 1) / displayScale;
        textObj.scaleY = (textObj.scaleY || 1) / displayScale;
        textObj.left = (textObj.left || 0) / displayScale;
        textObj.top = (textObj.top || 0) / displayScale;
        textObj.setCoords();
      }
    });

    canvas.renderAll();

    // Export at original dimensions
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1.0,
      multiplier: 1 // No scaling needed as canvas is set to original dimensions
    });

    const link = document.createElement('a');
    link.download = 'composition.png';
    link.href = dataURL;
    link.click();

    // Restore canvas to display dimensions
    canvas.setWidth(currentWidth);
    canvas.setHeight(currentHeight);
    if (currentBackground) {
      currentBackground.set({
        scaleX: displayScale,
        scaleY: displayScale
      });
    }

    // Restore text objects
    canvas.getObjects().forEach((obj) => {
      if (obj.type === 'textbox') {
        const textObj = obj as fabric.Textbox;
        textObj.scaleX = (textObj.scaleX || 1) * displayScale;
        textObj.scaleY = (textObj.scaleY || 1) * displayScale;
        textObj.left = (textObj.left || 0) * displayScale;
        textObj.top = (textObj.top || 0) * displayScale;
        textObj.setCoords();
      }
    });

    canvas.renderAll();
  }, [displayScale, originalImageDimensions]);

  const onFontSizeChange = (size: number) => {
    setFontSize(size);
    if (selectedObject && selectedObject.type === 'textbox') {
      (selectedObject as fabric.Textbox).set('fontSize', size);
      fabricCanvasRef.current?.requestRenderAll();
      pushToUndoStack();
      triggerAutosave();
    }
  };

  const onFontWeightChange = (weight: string) => {
    setFontWeight(weight);
    if (selectedObject && selectedObject.type === 'textbox') {
      (selectedObject as fabric.Textbox).set('fontWeight', weight);
      fabricCanvasRef.current?.requestRenderAll();
      pushToUndoStack();
      triggerAutosave();
    }
  };

  const onFontChange = (option: any) => {
    if (!option) return;
    setSelectedFont(option);
    if (selectedObject && selectedObject.type === 'textbox') {
      (selectedObject as fabric.Textbox).set('fontFamily', option.value);
      loadFont(option.value);
      fabricCanvasRef.current?.requestRenderAll();
      pushToUndoStack();
      triggerAutosave();
    }
  };

  const onColorChange = (color: string) => {
    setTextColor(color);
    if (selectedObject && selectedObject.type === 'textbox') {
      (selectedObject as fabric.Textbox).set('fill', color);
      fabricCanvasRef.current?.requestRenderAll();
      pushToUndoStack();
      triggerAutosave();
    }
  };

  const onOpacityChange = (opacity: number) => {
    setTextOpacity(opacity);
    if (selectedObject && selectedObject.type === 'textbox') {
      selectedObject.set('opacity', opacity);
      fabricCanvasRef.current?.requestRenderAll();
      pushToUndoStack();
      triggerAutosave();
    }
  };

  const onTextAlignChange = (align: string) => {
    setTextAlign(align);
    if (selectedObject && selectedObject.type === 'textbox') {
      (selectedObject as fabric.Textbox).set('textAlign', align as any);
      fabricCanvasRef.current?.requestRenderAll();
      pushToUndoStack();
      triggerAutosave();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-6">Image Text Composer</h1>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-4 p-4 bg-gray-50 rounded">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png"
          onChange={handleImageUpload}
          className="text-sm"
        />

        <button
          onClick={addTextLayer}
          className="px-4 py-2 bg-blue-500 text-white rounded font-bold hover:bg-blue-600"
        >
          Add Text
        </button>

        <Select
          options={FONT_LIST}
          value={selectedFont}
          onChange={onFontChange}
          placeholder="Select a font"
          isSearchable
          className="w-48"
        />

        <input
          type="number"
          min="10"
          max="150"
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          className="w-16 px-2 py-1 border rounded"
        />

        <select
          value={fontWeight}
          onChange={(e) => onFontWeightChange(e.target.value)}
          className="px-2 py-1 border rounded"
        >
          <option value="300">Light</option>
          <option value="400">Normal</option>
          <option value="700">Bold</option>
        </select>

        <input
          type="color"
          value={textColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-12 h-8 border rounded"
        />

        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={textOpacity}
          onChange={(e) => onOpacityChange(Number(e.target.value))}
          className="w-20"
        />

        <select
          value={textAlign}
          onChange={(e) => onTextAlignChange(e.target.value)}
          className="px-2 py-1 border rounded"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>

        <button
          onClick={undo}
          disabled={undoStack.length <= 1}
          className="px-3 py-1 bg-gray-500 text-white rounded font-bold disabled:opacity-50"
        >
          Undo
        </button>

        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          className="px-3 py-1 bg-gray-500 text-white rounded font-bold disabled:opacity-50"
        >
          Redo
        </button>

        <button
          onClick={resetCanvas}
          className="px-3 py-1 bg-red-500 text-white rounded font-bold hover:bg-red-600"
        >
          Reset
        </button>

        <button
          onClick={exportToPNG}
          className="px-3 py-1 bg-green-500 text-white rounded font-bold hover:bg-green-600"
        >
          Export PNG
        </button>

        {autosaveStatus && (
          <span className="text-green-600 text-sm font-medium ml-4">{autosaveStatus}</span>
        )}
      </div>

      {/* Canvas */}
      <div className="border-2 border-gray-300 rounded mb-4 inline-block">
        <canvas ref={canvasRef} />
      </div>

      {/* Text Editor */}
      {selectedObject && selectedObject.type === 'textbox' && (
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-2">Edit Text:</label>
          <div className="flex gap-2">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={4}
              placeholder="Edit text layer... (supports multiple lines)"
              className="px-3 py-2 border rounded flex-1"
            />
            <button
              onClick={updateSelectedText}
              className="px-4 py-2 bg-blue-500 text-white rounded font-bold hover:bg-blue-600"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Layer Panel */}
      <div className="p-4 border border-gray-200 rounded bg-gray-50">
        <h3 className="font-bold mb-2">Layers ({layers.length})</h3>
        {layers.length === 0 ? (
          <p className="text-gray-500 text-sm">No layers yet. Add some text!</p>
        ) : (
          <div className="space-y-2">
            {layers.slice().reverse().map((obj, idx) => {
              const actualIdx = layers.length - 1 - idx;
              const isActive = obj === selectedObject;
              const text = obj.type === 'textbox' 
                ? (obj as fabric.Textbox).text 
                : obj.type === 'image' ? 'Background Image' : 'Layer';

              return (
                <div
                  key={actualIdx}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                    isActive ? 'bg-blue-100 border border-blue-300' : 'bg-white border border-gray-200'
                  }`}
                  onClick={() => {
                    fabricCanvasRef.current?.setActiveObject(obj);
                    fabricCanvasRef.current?.renderAll();
                  }}
                >
                  <span className="text-sm text-gray-600 min-w-6">{actualIdx + 1}</span>
                  <span className="text-sm flex-1 truncate">{text || 'Layer'}</span>

                  {obj.type === 'textbox' && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveLayer(obj, 'up'); }}
                        disabled={actualIdx === layers.length - 1}
                        className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        ▲
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveLayer(obj, 'down'); }}
                        disabled={actualIdx === 0}
                        className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        ▼
                      </button>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (obj === selectedObject) deleteSelectedLayer();
                        }}
                        className="px-2 py-1 text-xs bg-red-200 text-red-700 rounded hover:bg-red-300"
                      >
                        ✖
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History Info */}
      <div className="mt-4 text-sm text-gray-600">
        Undo steps: {undoStack.length}, Redo steps: {redoStack.length}
      </div>
    </div>
  );
};

export default ImageTextComposer;