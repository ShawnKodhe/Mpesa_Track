import { ChevronDown, Mic } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { LILY_VOICE } from '@/hooks/useJarvisVoice';

const LANGUAGES = [
  { value: 'auto', label: 'Auto (your mix)', short: 'Auto' },
  { value: 'en', label: 'English (Kenya)', short: 'EN' },
  { value: 'sw', label: 'Kiswahili (Kenya)', short: 'SW' },
];

export default function JarvisVoiceControls({ voice }) {
  const current = LANGUAGES.find((language) => language.value === voice.lang) || LANGUAGES[0];
  const voices = voice.voices || [];
  const isLily = voice.voiceId === LILY_VOICE;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-1 rounded-full border border-border px-3 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Mic className="h-3.5 w-3.5" aria-hidden="true" />
          {current.short}
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Dictation language</Label>
          <Select value={voice.lang} onValueChange={voice.setLang}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((language) => (
                <SelectItem key={language.value} value={language.value}>{language.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="jarvis-speak" className="text-xs">Speak replies aloud</Label>
          <Switch
            id="jarvis-speak"
            checked={voice.speakOn}
            onCheckedChange={voice.setSpeakOn}
            disabled={!voice.speechSupported}
          />
        </div>

        {voice.speechSupported && (
          <div className="space-y-2">
            <Label className="text-xs">Voice</Label>
            <Select value={voice.voiceId || 'auto'} onValueChange={voice.setVoiceId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Auto" />
              </SelectTrigger>
              <SelectContent>
                {voices.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {isLily
                ? 'Spoken by ElevenLabs — Lily is delightfully unimpressed: scoffs, long pauses and bored asides.'
                : 'Spoken by ElevenLabs — Charlie speaks like someone across the desk: throat clears, hmm sounds, pauses and dry asides.'}
            </p>
          </div>
        )}

        {voice.note && <p className="text-[11px] leading-snug text-muted-foreground">{voice.note}</p>}
        {!voice.supported && (
          <p className="text-[11px] leading-snug text-muted-foreground">
            This browser cannot dictate. Typing still works.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}