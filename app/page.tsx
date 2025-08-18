'use client';

import React, { useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import Toolbar from './components/Toolbar';
import ImageUpload from './components/ImageUpload';
import Canvas from './components/Canvas';
import LayerPanel from './components/LayerPanel';
import { TextProperties, FontOption } from './types';
import {
  useGoogleFonts,
  useUndoRedo,
  useAutosave,
  useCanvasState,
  useKeyboardShortcuts,
  useLocalStorage,
  useHandleCanvasReady
} from './utils/hook';
import {
  calculateImageScale,
  createTextObject,
  downloadCanvasAsPNG
} from './utils';
import { CANVAS_CONFIG } from './utils/constant';

const ImageTextComposer: React.FC = () => {
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // Custom hooks
  const { fontList, selectedFont, setSelectedFont, loadingFonts, loadFont } = useGoogleFonts();
  const { undoStack, redoStack, pushToUndoStack, undo, redo } = useUndoRedo(fabricCanvasRef.current);
  const { autosaveStatus, triggerAutosave } = useAutosave(fabricCanvasRef.current);
  const {
    selectedObject,
    setSelectedObject,
    layers,
    displayScale,
    setDisplayScale,
    originalImageDimensions,
    setOriginalImageDimensions,
    updateLayersList,
    updateControlsFromObject
  } = useCanvasState();
  const { restoreFromLocalStorage, clearLocalStorage } = useLocalStorage(fabricCanvasRef);

  // Text properties state
  const [textProperties, setTextProperties] = useState<TextProperties>({
    fontFamily: 'Roboto',
    fontSize: 50,
    fontWeight: '400',
    fill: '#222222',
    opacity: 1,
    textAlign: 'left'
  });

  const [textInput, setTextInput] = useState('');



  const handleCanvasReady = useHandleCanvasReady({
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
  });

  // Delete selected layer
  const deleteSelectedLayer = useCallback(() => {
    if (!selectedObject || !fabricCanvasRef.current) return;

    fabricCanvasRef.current.remove(selectedObject);
    setSelectedObject(null);
    updateLayersList(fabricCanvasRef.current);
    pushToUndoStack();
    triggerAutosave();
  }, [selectedObject, setSelectedObject, updateLayersList, pushToUndoStack, triggerAutosave]);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    selectedObject,
    fabricCanvasRef.current,
    deleteSelectedLayer,
    undo,
    redo
  );

  // Text property change handler
  const handleTextPropertyChange = useCallback((property: keyof TextProperties, value: string | number) => {
    setTextProperties(prev => ({ ...prev, [property]: value }));

    if (selectedObject && selectedObject.type === 'textbox') {
      const textObj = selectedObject as fabric.Textbox;
      textObj.set(property, value);

      if (property === 'fontFamily' && selectedFont) {
        loadFont(selectedFont.value);
      }

      fabricCanvasRef.current?.requestRenderAll();
      pushToUndoStack();
      triggerAutosave();
    }
  }, [selectedObject, selectedFont, loadFont, pushToUndoStack, triggerAutosave]);

  // Font change handler
  const handleFontChange = useCallback((option: FontOption | null) => {
    if (!option) return;
    setSelectedFont(option);
    handleTextPropertyChange('fontFamily', option.value);
  }, [setSelectedFont, handleTextPropertyChange]);

  // Text input change handler
  const handleTextInputChange = useCallback((text: string) => {
    setTextInput(text);

    if (selectedObject && selectedObject.type === 'textbox') {
      const textObj = selectedObject as fabric.Textbox;
      textObj.set('text', text);
      fabricCanvasRef.current?.requestRenderAll();
      pushToUndoStack();
      triggerAutosave();
    }
  }, [selectedObject, pushToUndoStack, triggerAutosave]);

  // Image upload handler
  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target?.result as string;
      const ImageClass = (fabric as any).FabricImage ?? (fabric as any).Image;
      ImageClass.fromURL(imgUrl).then((img: fabric.Image) => {
        if (!fabricCanvasRef.current) return;

        const canvas = fabricCanvasRef.current;
        const origWidth = img.width!;
        const origHeight = img.height!;

        const scale = calculateImageScale(origWidth, origHeight);

        setOriginalImageDimensions({ width: origWidth, height: origHeight });
        canvas.setDimensions({ width: origWidth * scale, height: origHeight * scale });

        img.set({
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          scaleX: scale,
          scaleY: scale,
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
  }, [pushToUndoStack, triggerAutosave, setDisplayScale, setOriginalImageDimensions]);

  // Add text layer
  const addTextLayer = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    if (selectedFont) {
      loadFont(selectedFont.value);
    }

    const textObj = createTextObject('New text', {
      ...textProperties,
      fontFamily: selectedFont?.value || 'Roboto'
    });

    fabricCanvasRef.current.add(textObj);
    fabricCanvasRef.current.setActiveObject(textObj);
    fabricCanvasRef.current.requestRenderAll();

    updateLayersList(fabricCanvasRef.current);
    pushToUndoStack();
    triggerAutosave();
  }, [selectedFont, textProperties, loadFont, updateLayersList, pushToUndoStack, triggerAutosave]);

  // Move layer
  const moveLayer = useCallback((obj: fabric.Object, direction: 'up' | 'down') => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const allObjs = canvas.getObjects();
    const oldIndex = allObjs.indexOf(obj);
    let newIndex = oldIndex;

    if (direction === 'up' && oldIndex < allObjs.length - 1) {
      newIndex = oldIndex + 1;
    } else if (direction === 'down' && oldIndex > 0) {
      newIndex = oldIndex - 1;
    }

    if (newIndex !== oldIndex) {
      canvas.remove(obj);
      canvas.insertAt(newIndex, obj);
      canvas.setActiveObject(obj);
      canvas.renderAll();
      updateLayersList(canvas);
      pushToUndoStack();
      triggerAutosave();
    }
  }, [pushToUndoStack, triggerAutosave, updateLayersList]);

  // Reset canvas
  const resetCanvas = useCallback(() => {
    if (!confirm('Reset and clear all content?')) return;

    if (fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current;
      canvas.clear();
      canvas.backgroundImage = null as unknown as fabric.Image;
      canvas.setDimensions({ width: CANVAS_CONFIG.maxWidth, height: CANVAS_CONFIG.maxHeight });
      canvas.renderAll();
    }

    clearLocalStorage();
    updateLayersList(fabricCanvasRef.current);
    setSelectedObject(null);
    setDisplayScale(1);
    setOriginalImageDimensions(null);
  }, [clearLocalStorage, updateLayersList, setSelectedObject, setDisplayScale, setOriginalImageDimensions]);

  // Export to PNG
  const exportToPNG = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    if (!originalImageDimensions) {
      downloadCanvasAsPNG(fabricCanvasRef.current);
      return;
    }

    // Temporarily set canvas to original dimensions for export
    const canvas = fabricCanvasRef.current;
    const currentWidth = canvas.getWidth();
    const currentHeight = canvas.getHeight();
    const currentBackground = canvas.backgroundImage as fabric.Image | undefined;

    canvas.setDimensions({ width: originalImageDimensions.width, height: originalImageDimensions.height });

    if (currentBackground) {
      currentBackground.set({ scaleX: 1, scaleY: 1 });
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
    downloadCanvasAsPNG(canvas);

    // Restore canvas to display dimensions
    canvas.setDimensions({ width: currentWidth, height: currentHeight });
    if (currentBackground) {
      currentBackground.set({ scaleX: displayScale, scaleY: displayScale });
    }

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

  // Layer selection handler
  const handleLayerSelect = useCallback((layer: fabric.Object) => {
    fabricCanvasRef.current?.setActiveObject(layer);
    fabricCanvasRef.current?.renderAll();
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-6">Image Text Composer</h1>

      {/* Image Upload */}
      <div className='flex gap-2'>
        <div>
          <div className="mb-4">
            <ImageUpload onImageUpload={handleImageUpload} />
          </div>

          {/* Toolbar */}
          <Toolbar
            fontList={fontList}
            selectedFont={selectedFont}
            onFontChange={handleFontChange}
            loadingFonts={loadingFonts}
            textProperties={textProperties}
            onTextPropertyChange={handleTextPropertyChange}
            textInput={textInput}
            onTextInputChange={handleTextInputChange}
            onAddText={addTextLayer}
            onUndo={undo}
            onRedo={redo}
            onReset={resetCanvas}
            onExport={exportToPNG}
            undoStackLength={undoStack.length}
            redoStackLength={redoStack.length}
            autosaveStatus={autosaveStatus}
          />
        </div>

        {/* Canvas */}
        <Canvas onCanvasReady={handleCanvasReady} />

        <div className='w-xs'>
          <div className='mb-4'>

            <span className="text-green-600 text-sm font-medium ml-4 flex items-center">
              {autosaveStatus ? 'Autosaved' : 'Autosaving...'}
            </span>

          </div>
          <LayerPanel
            layers={layers}
            selectedObject={selectedObject}
            onLayerSelect={handleLayerSelect}
            onLayerMove={moveLayer}
            onLayerDelete={deleteSelectedLayer}
          />

          <div className="mt-4 text-sm text-gray-600">
            Undo steps: {undoStack.length}, Redo steps: {redoStack.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageTextComposer;