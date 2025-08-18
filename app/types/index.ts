export interface TextLayerState {
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

export interface FontOption {
  value: string;
  label: string;
}

export interface ComposerState {
  layers: TextLayerState[];
  backgroundImageUrl: string | null;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface CanvasConfig {
  maxWidth: number;
  maxHeight: number;
  backgroundColor: string;
}

export interface TextProperties {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fill: string;
  opacity: number;
  textAlign: 'left' | 'center' | 'right';
}

export interface Layer {
  id: string;
  type: 'textbox' | 'image';
  text?: string;
  isActive: boolean;
  index: number;
}
