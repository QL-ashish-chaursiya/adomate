'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';

// Google Fonts list (top 30)
const FONT_LIST = [
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Poppins', 'Merriweather', 'PT Sans',
  'Noto Sans', 'Josefin Sans', 'Raleway', 'Quicksand', 'Bebas Neue', 'Nunito', 'Playfair Display',
  'Source Sans Pro', 'Pacifico', 'Alfa Slab One', 'Abel', 'Anton', 'Bangers', 'Cabin', 'Dancing Script',
  'Fjalla One', 'Indie Flower', 'Lobster', 'Rubik', 'Slabo 27px', 'Work Sans', 'Varela Round'
];

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
  const [selectedFont, setSelectedFont] = useState('Roboto');
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
    }
  }, []);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff'
    });

    fabricCanvasRef.current = canvas;

    // Canvas event listeners
    canvas.on('selection:created', (e:any) => {
      setSelectedObject(e.selected[0]);
      updateControlsFromObject(e.selected[0]);
    });

    canvas.on('selection:updated', (e) => {
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

    // Load initial state
    restoreFromLocalStorage();

    return () => {
      canvas.dispose();
    };
  }, []);

  // Update control values from selected object
  const updateControlsFromObject = useCallback((obj: fabric.Object) => {
    if (obj.type === 'text' || obj.type === 'FabricText') {
      const textObj = obj as fabric.FabricText;
      setSelectedFont(textObj.fontFamily || 'Roboto');
      setFontSize(textObj.fontSize || 50);
      setFontWeight(textObj.fontWeight?.toString() || '400');
      setTextColor(textObj.fill?.toString() || '#222222');
      setTextOpacity(textObj.opacity || 1);
      setTextAlign(textObj.textAlign || 'left');
      setTextInput(textObj.text || '');
    }
  }, []);

  // Push current state to undo stack
  const pushToUndoStack = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const state = JSON.stringify(fabricCanvasRef.current.toJSON());
    setUndoStack(prev => {
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

  // Restore from localStorage
  const restoreFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem('composer_state');
    if (saved && fabricCanvasRef.current) {
      fabricCanvasRef.current.loadFromJSON(saved, () => {
        fabricCanvasRef.current?.renderAll();
        updateLayersList();
      });
    }
  }, []);

  // Update layers list
  const updateLayersList = useCallback(() => {
    if (fabricCanvasRef.current) {
      setLayers([...fabricCanvasRef.current.getObjects()]);
    }
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.includes('image/')) {
      alert('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target?.result as string;
      fabric.FabricImage.fromURL(imgUrl).then((img:any) => {
        if (!fabricCanvasRef.current) return;

        // Scale image to fit canvas
        const canvas = fabricCanvasRef.current;
        const scaleX = canvas.width! / img.width!;
        const scaleY = canvas.height! / img.height!;
        const scale = Math.min(scaleX, scaleY, 1);

        img.scale(scale);
        img.set({
          left: (canvas.width! - img.getScaledWidth()) / 2,
          top: (canvas.height! - img.getScaledHeight()) / 2,
          selectable: false,
          evented: false
        });

        canvas.backgroundImage = img;
        canvas.renderAll();
        pushToUndoStack();
        triggerAutosave();
      });
    };
    reader.readAsDataURL(file);
  }, [pushToUndoStack, triggerAutosave]);

  // Add new text layer
  const addTextLayer = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    loadFont(selectedFont);

    const textObj = new fabric.Textbox('New text', {
      left: 100,
      top: 100,
      fontFamily: selectedFont,
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
  }, [selectedFont, fontSize, fontWeight, textColor, textOpacity, textAlign, loadFont, pushToUndoStack, triggerAutosave]);

  // Update selected text object
  const updateSelectedText = useCallback(() => {
    if (!selectedObject || (selectedObject.type !== 'text' && selectedObject.type !== 'FabricText')) return;

    const textObj = selectedObject as fabric.FabricText;
    textObj.set({
      text: textInput,
      fontFamily: selectedFont,
      fontSize: fontSize,
      fontWeight: fontWeight,
      fill: textColor,
      opacity: textOpacity,
      textAlign: textAlign as any
    });

    loadFont(selectedFont);
    fabricCanvasRef.current?.renderAll();
    updateLayersList();
    pushToUndoStack();
    triggerAutosave();
  }, [selectedObject, textInput, selectedFont, fontSize, fontWeight, textColor, textOpacity, textAlign, loadFont, pushToUndoStack, triggerAutosave]);

  // Delete selected layer
  const deleteSelectedLayer = useCallback(() => {
    if (!selectedObject || !fabricCanvasRef.current) return;

    fabricCanvasRef.current.remove(selectedObject);
    setSelectedObject(null);
    updateLayersList();
    pushToUndoStack();
    triggerAutosave();
  }, [selectedObject, pushToUndoStack, triggerAutosave]);

  // Move layer up/down
  const moveLayer = useCallback((obj: fabric.Object, direction: 'up' | 'down') => {
    if (!fabricCanvasRef.current) return;

    if (direction === 'up') {
      fabricCanvasRef.current.bringObjectForward(obj);
    } else {
      fabricCanvasRef.current.sendObjectBackwards(obj);
    }
    
    updateLayersList();
    pushToUndoStack();
    triggerAutosave();
  }, [pushToUndoStack, triggerAutosave]);

  // Undo
  const undo = useCallback(() => {
    if (undoStack.length < 2 || !fabricCanvasRef.current) return;

    const current = undoStack[undoStack.length - 1];
    const previous = undoStack[undoStack.length - 2];

    setRedoStack(prev => [...prev, current]);
    setUndoStack(prev => prev.slice(0, -1));

    fabricCanvasRef.current.loadFromJSON(previous, () => {
      fabricCanvasRef.current?.renderAll();
      updateLayersList();
      triggerAutosave();
    });
  }, [undoStack, triggerAutosave]);

  // Redo
  const redo = useCallback(() => {
    if (redoStack.length === 0 || !fabricCanvasRef.current) return;

    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, next]);
    setRedoStack(prev => prev.slice(0, -1));

    fabricCanvasRef.current.loadFromJSON(next, () => {
      fabricCanvasRef.current?.renderAll();
      updateLayersList();
      triggerAutosave();
    });
  }, [redoStack, triggerAutosave]);

  // Reset canvas
  const resetCanvas = useCallback(() => {
    if (!confirm('Reset and clear all content?')) return;

    fabricCanvasRef.current?.clear();
    fabricCanvasRef.current?.set('backgroundImage', null);
    fabricCanvasRef.current?.renderAll();

    localStorage.removeItem('composer_state');
    setLayers([]);
    setSelectedObject(null);
    setUndoStack([]);
    setRedoStack([]);
    updateLayersList();
  }, []);

  // Export as PNG
  const exportToPNG = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 1.0,
      multiplier: 1
    });

    const link = document.createElement('a');
    link.download = 'composition.png';
    link.href = dataURL;
    link.click();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-6">Image Text Composer</h1>
      
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-4 p-4 bg-gray-50 rounded">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="text-sm"
        />
        
        <button
          onClick={addTextLayer}
          className="px-4 py-2 bg-blue-500 text-white rounded font-bold hover:bg-blue-600"
        >
          Add Text
        </button>

        <select
          value={selectedFont}
          onChange={(e) => setSelectedFont(e.target.value)}
          className="px-2 py-1 border rounded max-w-48"
        >
          {FONT_LIST.map(font => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>

        <input
          type="number"
          min="10"
          max="150"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-16 px-2 py-1 border rounded"
        />

        <select
          value={fontWeight}
          onChange={(e) => setFontWeight(e.target.value)}
          className="px-2 py-1 border rounded"
        >
          <option value="300">Light</option>
          <option value="400">Normal</option>
          <option value="700">Bold</option>
        </select>

        <input
          type="color"
          value={textColor}
          onChange={(e) => setTextColor(e.target.value)}
          className="w-12 h-8 border rounded"
        />

        <div className="flex items-center gap-2">
          <label className="text-sm">Opacity</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={textOpacity}
            onChange={(e) => setTextOpacity(Number(e.target.value))}
            className="w-20"
          />
        </div>

        <select
          value={textAlign}
          onChange={(e) => setTextAlign(e.target.value)}
          className="px-2 py-1 border rounded"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>

        <button
          onClick={undo}
          disabled={undoStack.length < 2}
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
      {selectedObject && (selectedObject.type === 'text' || selectedObject.type === 'FabricText') && (
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-2">Edit Text:</label>
          <div className="flex gap-2">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={2}
              cols={50}
              placeholder="Edit text layer..."
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
              const text = (obj.type === 'text' || obj.type === 'FabricText') ? 
                (obj as fabric.FabricText).text : 
                obj.type === 'image' ? 'Background Image' : 'Layer';
              
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
                  
                  {(obj.type === 'text' || obj.type === 'FabricText') && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveLayer(obj, 'up'); }}
                        className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                      >
                        ▲
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveLayer(obj, 'down'); }}
                        className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
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