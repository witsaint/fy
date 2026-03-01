export type ImageStatus = 'idle' | 'processing' | 'polling' | 'done' | 'error';

export type TaskPollStatus = 'in_queue' | 'generating' | 'done' | 'not_found' | 'expired';

export type ChannelKey = 'volcengine';

export interface Channel {
  key: ChannelKey;
  name: string;
}

export const CHANNELS: Channel[] = [
  { key: 'volcengine', name: '火山引擎' },
];

export interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  status: ImageStatus;
  /** 异步任务 ID，提交后由后端返回 */
  taskId?: string;
  /** 任务所用渠道，轮询时需要 */
  channel?: ChannelKey;
  translatedBase64?: string;
  texts?: { original: string; translated: string }[];
  errorMessage?: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: '英语', nativeName: 'English' },
  { code: 'ja', name: '日语', nativeName: '日本語' },
  { code: 'ko', name: '韩语', nativeName: '한국어' },
  { code: 'es', name: '西班牙语', nativeName: 'Español' },
  { code: 'fr', name: '法语', nativeName: 'Français' },
  { code: 'de', name: '德语', nativeName: 'Deutsch' },
  { code: 'ru', name: '俄语', nativeName: 'Русский' },
  { code: 'th', name: '泰语', nativeName: 'ภาษาไทย' },
  { code: 'vi', name: '越南语', nativeName: 'Tiếng Việt' },
  { code: 'id', name: '印度尼西亚语', nativeName: 'Bahasa Indonesia' },
];
