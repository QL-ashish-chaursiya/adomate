import { CanvasConfig } from '../types';

export const CANVAS_CONFIG: CanvasConfig = {
  maxWidth: 1100,
  maxHeight: 600,
  backgroundColor: '#ffffff'
};

export const MAX_IMAGE_SIZE_MB = 4;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export const FONT_SIZE_LIMITS = {
  min: 15,
  max: 200
};

export const OPACITY_LIMITS = {
  min: 0.1,
  max: 1,
  step: 0.05
};

export const UNDO_STACK_LIMIT = 20;
export const AUTOSAVE_DELAY = 1500;

export const GOOGLE_FONTS_API_KEY = 'AIzaSyDFZUu9EnOeiUHiheJANCOTcbH_lYnnit8';
export const GOOGLE_FONTS_API_URL = 'https://www.googleapis.com/webfonts/v1/webfonts';

export const LOCAL_STORAGE_KEYS = {
  COMPOSER_STATE: 'composer_state'
} as const;

export const FONT_WEIGHTS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Normal' },
  { value: '700', label: 'Bold' }
] as const;

export const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' }
] as const;
