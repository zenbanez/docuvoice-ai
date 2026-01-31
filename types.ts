
export interface PDFFile {
  name: string;
  base64: string;
  size: number;
  type: string;
  summary?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum InteractionMode {
  TEXT = 'TEXT',
  VOICE = 'VOICE'
}
