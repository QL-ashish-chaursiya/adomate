import React from 'react';
import Select from 'react-select';
import { FontOption, TextProperties } from '../types';
import { FONT_WEIGHTS, TEXT_ALIGN_OPTIONS, FONT_SIZE_LIMITS, OPACITY_LIMITS } from '../utils/constant';

interface ToolbarProps {
  fontList: FontOption[];
  selectedFont: FontOption | null;
  onFontChange: (option: FontOption | null) => void;
  loadingFonts: boolean;
  textProperties: TextProperties;
  onTextPropertyChange: (property: keyof TextProperties, value: string | number) => void;
  textInput: string;
  onTextInputChange: (text: string) => void;
  onAddText: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onExport: () => void;
  undoStackLength: number;
  redoStackLength: number;
  autosaveStatus: string;
}

const Toolbar: React.FC<ToolbarProps> = ({
  fontList,
  selectedFont,
  onFontChange,
  loadingFonts,
  textProperties,
  onTextPropertyChange,
  textInput,
  onTextInputChange,
  onAddText,
  onUndo,
  onRedo,
  onReset,
  onExport,
  undoStackLength,
  redoStackLength,
  autosaveStatus
}) => {
  return (
    <div className="flex flex-col gap-4 mb-4 p-4 bg-gray-50 rounded">
      <button
        onClick={onAddText}
        className="px-4 py-2 bg-blue-500 text-white rounded font-bold hover:bg-blue-600 transition-colors"
      >
        Add Text
      </button>

      <input
        type="text"
        value={textInput}
        onChange={(e) => onTextInputChange(e.target.value)}
        placeholder="Edit text content..."
        className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48"
      />

      <Select
        options={fontList}
        value={selectedFont}
        onChange={onFontChange}
        placeholder={loadingFonts ? "Loading fonts..." : "Select a font"}
        isSearchable
        isDisabled={loadingFonts}
        className="w-full"
        classNamePrefix="select"
      />

      <input
        type="number"
        min={FONT_SIZE_LIMITS.min}
        max={FONT_SIZE_LIMITS.max}
        value={textProperties.fontSize}
        onChange={(e) => onTextPropertyChange('fontSize', Number(e.target.value))}
        className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <select
        value={textProperties.fontWeight}
        onChange={(e) => onTextPropertyChange('fontWeight', e.target.value)}
        className="px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {FONT_WEIGHTS.map(weight => (
          <option key={weight.value} value={weight.value}>
            {weight.label}
          </option>
        ))}
      </select>

     <div className='flex gap-2'>
     <input
        type="color"
        value={textProperties.fill}
        onChange={(e) => onTextPropertyChange('fill', e.target.value)}
        className="w-full h-8 border rounded cursor-pointer"
      />

      <input
        type="range"
        min={OPACITY_LIMITS.min}
        max={OPACITY_LIMITS.max}
        step={OPACITY_LIMITS.step}
        value={textProperties.opacity}
        onChange={(e) => onTextPropertyChange('opacity', Number(e.target.value))}
        className="w-full"
      />
     </div>

      <select
        value={textProperties.textAlign}
        onChange={(e) => onTextPropertyChange('textAlign', e.target.value)}
        className="px-2 py-1 w-full border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {TEXT_ALIGN_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="flex gap-1">
        <button
          onClick={onUndo}
          disabled={undoStackLength <= 1}
          className="px-3 py-1 w-full bg-gray-500 text-white rounded font-bold disabled:opacity-50 hover:bg-gray-600 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>

        <button
          onClick={onRedo}
          disabled={redoStackLength === 0}
          className="px-3 py-1 w-full bg-gray-500 text-white rounded font-bold disabled:opacity-50 hover:bg-gray-600 transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          Redo
        </button>
      </div>

      <button
        onClick={onReset}
        className="px-3 py-1 bg-red-500 text-white rounded font-bold hover:bg-red-600 transition-colors"
      >
        Reset
      </button>

      <button
        onClick={onExport}
        className="px-3 py-1 bg-green-500 text-white rounded font-bold hover:bg-green-600 transition-colors"
      >
        Export PNG
      </button>

      {autosaveStatus && (
        <span className="text-green-600 text-sm font-medium ml-4 flex items-center">
          {autosaveStatus}
        </span>
      )}
    </div>
  );
};

export default Toolbar; 