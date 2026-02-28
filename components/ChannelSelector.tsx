'use client';

import { CHANNELS } from '@/types/translate';
import type { ChannelKey } from '@/types/translate';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Zap } from 'lucide-react';

interface Props {
  value: ChannelKey;
  onChange: (value: ChannelKey) => void;
  disabled?: boolean;
}

export default function ChannelSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm">
      <Zap className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-sm text-muted-foreground whitespace-nowrap">处理渠道</span>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as ChannelKey)}
        disabled={disabled}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CHANNELS.map((ch) => (
            <SelectItem key={ch.key} value={ch.key}>
              {ch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
