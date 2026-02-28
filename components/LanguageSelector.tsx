'use client';

import { LANGUAGES } from '@/types/translate';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Languages } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function LanguageSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm">
      <Languages className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-sm text-muted-foreground whitespace-nowrap">翻译目标语言</span>
      <span className="text-sm text-muted-foreground">中文 →</span>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.name}（{lang.nativeName}）
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
