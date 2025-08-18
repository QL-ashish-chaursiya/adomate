import * as fabric from 'fabric';
import { FontOption, ImageDimensions } from '../types';
import { GOOGLE_FONTS_API_KEY, GOOGLE_FONTS_API_URL, CANVAS_CONFIG } from './constant';

// Font utilities
export const loadGoogleFont = (fontFamily: string): Promise<void> => {
  return new Promise((resolve) => {
    const linkId = `fontLink_${fontFamily.replace(/\s/g, '')}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.id = linkId;
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s/g, '+')}&display=swap`;
      document.head.appendChild(link);
      setTimeout(resolve, 200);
    } else {
      resolve();
    }
  });
};

export const fetchGoogleFonts = async (): Promise<FontOption[]> => {
  try {
    const response = await fetch(`${GOOGLE_FONTS_API_URL}?key=${GOOGLE_FONTS_API_KEY}&sort=alpha`);
    const data = await response.json();
    return data.items.map((font: { family: string }) => ({ 
      value: font.family, 
      label: font.family 
    }));
  } catch (error) {
    console.error('Failed to fetch Google Fonts:', error);
    return [];
  }
};

// Image utilities
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  if (file.type !== 'image/png') {
    return { isValid: false, error: 'Please select a valid PNG image file.' };
  }
  
  if (file.size > 4 * 1024 * 1024) {
    return { isValid: false, error: 'Image exceeds 4MB. Please choose a smaller PNG.' };
  }
  
  return { isValid: true };
};

export const calculateImageScale = (width: number, height: number): number => {
  return Math.min(
    CANVAS_CONFIG.maxWidth / width, 
    CANVAS_CONFIG.maxHeight / height, 
    1
  );
};

// Canvas utilities
export const createFabricCanvas = (canvasElement: HTMLCanvasElement): fabric.Canvas => {
  return new fabric.Canvas(canvasElement, {
    width: CANVAS_CONFIG.maxWidth,
    height: CANVAS_CONFIG.maxHeight,
    backgroundColor: CANVAS_CONFIG.backgroundColor
  });
};

export const setupCanvasSnapping = (canvas: fabric.Canvas): void => {
  canvas.on('object:moving', (options) => {
    const obj = options.target as fabric.Object | undefined;
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
};

// Local storage utilities
export const saveToLocalStorage = (key: string, data: unknown): void => {
  try {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const loadFromLocalStorage = <T = unknown>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

// Export utilities
export const downloadCanvasAsPNG = (canvas: fabric.Canvas, filename: string = 'composition.png'): void => {
  const dataURL = canvas.toDataURL({
    format: 'png',
    quality: 1.0,
    multiplier: 1
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  link.click();
};

// Text object utilities
export const createTextObject = (
  text: string,
  properties: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fill: string;
    opacity: number;
    textAlign: string;
    left?: number;
    top?: number;
  }
): fabric.Textbox => {
  return new fabric.Textbox(text, {
    left: properties.left || 100,
    top: properties.top || 100,
    fontFamily: properties.fontFamily,
    fontSize: properties.fontSize,
    fontWeight: properties.fontWeight,
    fill: properties.fill,
    opacity: properties.opacity,
    textAlign: properties.textAlign as 'left' | 'center' | 'right',
    editable: true,
    selectable: true,
    evented: true,
    hasControls: true,
    lockScalingFlip: true,
    objectCaching: false,
  });
};
