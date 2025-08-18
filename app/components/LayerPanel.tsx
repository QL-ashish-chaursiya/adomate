import React from 'react';
import * as fabric from 'fabric';

interface LayerPanelProps {
  layers: fabric.Object[];
  selectedObject: fabric.Object | null;
  onLayerSelect: (layer: fabric.Object) => void;
  onLayerMove: (layer: fabric.Object, direction: 'up' | 'down') => void;
  onLayerDelete: (layer: fabric.Object) => void;
}

const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  selectedObject,
  onLayerSelect,
  onLayerMove,
  onLayerDelete
}) => {
  const getLayerText = (obj: fabric.Object): string => {
    if (obj.type === 'textbox') {
      return (obj as fabric.Textbox).text || 'Empty Text';
    }
    if (obj.type === 'image') {
      return 'Background Image';
    }
    return 'Layer';
  };

  return (
    <div className="p-4 border border-gray-200 rounded bg-gray-50">
      <h3 className="font-bold mb-2">Layers ({layers.length})</h3>
      
      {layers.length === 0 ? (
        <p className="text-gray-500 text-sm">No layers yet. Add some text!</p>
      ) : (
        <div className="space-y-2">
          {layers.slice().reverse().map((obj, idx) => {
            const actualIdx = layers.length - 1 - idx;
            const isActive = obj === selectedObject;
            const text = getLayerText(obj);

            return (
              <div
                key={actualIdx}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                  isActive 
                    ? 'bg-blue-100 border border-blue-300' 
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => onLayerSelect(obj)}
              >
                <span className="text-sm text-gray-600 min-w-6">{actualIdx + 1}</span>
                <span className="text-sm flex-1 truncate">{text}</span>

                {obj.type === 'textbox' && (
                  <>
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onLayerMove(obj, 'up'); 
                      }}
                      disabled={actualIdx === layers.length - 1}
                      className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onLayerMove(obj, 'down'); 
                      }}
                      disabled={actualIdx === 0}
                      className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
                      title="Move Down"
                    >
                      ▼
                    </button>
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onLayerDelete(obj);
                      }}
                      className="px-2 py-1 text-xs bg-red-200 text-red-700 rounded hover:bg-red-300 transition-colors"
                      title="Delete Layer"
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
  );
};

export default LayerPanel; 