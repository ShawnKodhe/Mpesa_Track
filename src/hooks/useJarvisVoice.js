import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

const Recognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

/** Mobile dictation ends on its own after a phrase, so it is treated differently. */
const IS_MOBILE = typeof navigator !== 'undefined'
  && /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent || '');

const DICTATION_ERRORS = {
  'not-allowed': 'The microphone is blocked. Allow it for this site in your browser settings, then tap the mic again.',
  'service-not-allowed': 'This browser refused the microphone. Allow it for this site, then tap the mic again.',
  'audio-capture': 'No microphone was found on this device.',
  network: 'Dictation needs a connection. Check your network and try again.',
};

/** Device-voice hints used only by the offline fallback (never by ElevenLabs). */
const MALE_VOICE_HINT = /\b(male|man|david|daniel|george|oliver|james|william|arthur|felix|dan|alex|ryan|thomas|honor|gabriel|rishi|theo)\b/i;
const FEMALE_VOICE_HINT = /\b(female|woman|zira|samantha|victoria|karen|moira|tessa|fiona|susan|kate|serena|allison|ava|shelley|female)\b/i;

const SWAHILI_WORDS = [
  'nime', 'nimetumia', 'nimekula', 'nimenunua', 'kwa', 'na', 'ya', 'pesa', 'leo', 'sana',
  'nini', 'vipi', 'gani', 'shilingi', 'nitalipa', 'amenipa', 'ninadai', 'bei', 'matatu',
  'duka', 'mkopo', 'deni', 'hela', 'tafadhali', 'asante', 'sasa', 'kweli', 'kulipa',
  'nilipwa', 'nina', 'una', 'wangu', 'yangu', 'kitu', 'gharama', 'jumla', 'wiki', 'mwezi',
  'nipe', 'leta', 'ongeza', 'futa', 'badilisha', 'nataka', 'sina', 'iko', 'aje',
];

/** Rough language sniff: enough to pick a voice and an Auto dictation language. */
export function looksSwahili(text = '') {
  const words = String(text).toLowerCase().match(/[a-z']+/g) || [];
  if (words.length === 0) return false;
  return words.some((word) => SWAHILI_WORDS.includes(word));
}

/** ElevenLabs "Charlie" — a plain-spoken male voice. */
export const JARVIS_VOICE = 'IKne3meq5aSn9XLyUdCD';
/** ElevenLabs "Lily" — a plain-spoken female voice. */
export const LILY_VOICE = 'pFZP5JQG7iQjIQuC4Bku';
export const VOICE_EN = JARVIS_VOICE;
export const VOICE_SW = JARVIS_VOICE;

export const JARVIS_VOICES = [
  { id: 'auto', label: 'Auto' },
  { id: JARVIS_VOICE, label: 'Charlie (male)' },
  { id: LILY_VOICE, label: 'Lily (female)' },
];

export default function useJarvisVoice() {
  const [lang, setLang] = useState('auto');
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speakOn, setSpeakOn] = useState(false);
  const [deviceVoices, setDeviceVoices] = useState([]);
  const [voiceId, setVoiceId] = useState('auto');
  const [note, setNote] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  // Live copy of the opt-in flag. State updates are asynchronous, so this ref —
  // not the state value — gates the paid ElevenLabs call. Turning the switch off
  // while a reply is being written still prevents any speech request.
  const speakOnRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;
    const load = () => setDeviceVoices(window.speechSynthesis.getVoices() || []);
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        // already stopped
      }
    }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!Recognition) {
      setNote('This browser has no speech recognition, so dictation is off. Typing still works.');
      return;
    }
    if (recognitionRef.current) {
      stopListening();
      return;
    }

    setNote('');
    let finalText = '';
    let replaced = false;
    let fellBack = false;

    const spawn = (language) => {
      const recognition = new Recognition();
      recognition.lang = language;
      recognition.continuous = !IS_MOBILE;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += `${chunk} `;
          else interim += chunk;
        }
        setTranscript(`${finalText}${interim}`.trim());
        // Auto: the first words decide, English until they sound Swahili
        if (lang === 'auto' && !replaced && !finalText.trim() && looksSwahili(interim)) {
          replaced = true;
          try {
            recognition.abort();
          } catch (error) {
            // moving to the other language
          }
          spawn('sw-KE');
        }
      };

      recognition.onerror = (event) => {
        const code = event?.error || '';
        // Some phones have no Kiswahili dictation: fall back once to English
        if (code === 'language-not-supported' && !fellBack) {
          fellBack = true;
          setNote('Kiswahili dictation is not on this phone, so it is listening in English.');
          try {
            recognition.abort();
          } catch (error) {
            // replacing the language
          }
          spawn('en-GB');
          return;
        }
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
          setListening(false);
        }
        if (DICTATION_ERRORS[code]) setNote(DICTATION_ERRORS[code]);
      };

      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
          setListening(false);
        }
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
        setListening(true);
      } catch (error) {
        setNote('The microphone did not start. Tap the mic again.');
      }
    };

    spawn(lang === 'sw' ? 'sw-KE' : 'en-GB');
  }, [lang, stopListening]);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) {
      try {
        audio.pause();
      } catch (error) {
        // already stopped
      }
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  /** The only way to flip the opt-in flag; keeps the live ref in sync at once. */
  const updateSpeakOn = useCallback((enabled) => {
    const next = Boolean(enabled);
    speakOnRef.current = next;
    setSpeakOn(next);
    if (!next) stopAudio();
  }, [stopAudio]);

  /** Only used if the speech service is unavailable, so replies are never silent. */
  const speakOnDevice = useCallback((phrase, wantsSwahili) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const available = window.speechSynthesis.getVoices() || deviceVoices;
    const wantedPrefix = wantsSwahili ? 'sw' : 'en';
    const pool = available.filter((item) => (item.lang || '').toLowerCase().startsWith(wantedPrefix));
    if (!pool.length) return;
    // Prefer a male system voice so the fallback stays close to Jarvis' Charlie voice.
    const male = pool.find((item) => item.gender === 'male')
      || pool.find((item) => MALE_VOICE_HINT.test(item.name || ''));
    const voice = male
      || pool.find((item) => !FEMALE_VOICE_HINT.test(item.name || ''))
      || (wantsSwahili ? pool[0] : (pool.find((item) => /en-gb/i.test(item.lang || '')) || pool[0]));
    if (!voice) return;

    const utterance = new SpeechSynthesisUtterance(phrase.replace(/[—–]/g, ','));
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.98;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    // Chrome can stall when speak() follows the cancel() in stopAudio() too
    // quickly. A short beat lets the engine settle; re-check the opt-in so a
    // switch-off during that beat still cancels the fallback.
    window.setTimeout(() => {
      if (!speakOnRef.current) return;
      window.speechSynthesis.speak(utterance);
    }, 150);
  }, [deviceVoices]);

  const speak = useCallback(async (text) => {
    // ElevenLabs is strictly opt-in. Nothing below this line runs — no network
    // call, no characters billed — until "Speak replies aloud" is switched on.
    if (!speakOnRef.current) return;
    const phrase = String(text || '').trim();
    if (!phrase) return;

    const wantsSwahili = looksSwahili(phrase);
    const chosen = voiceId === 'auto'
      ? (wantsSwahili ? VOICE_SW : VOICE_EN)
      : voiceId;

    stopAudio();
    setNote('');
    setSpeaking(true);
    try {
      const response = await api.functions.invoke('jarvisSpeak', {
        text: phrase,
        voiceId: chosen,
        // The function refuses to synthesise without this explicit opt-in.
        speakEnabled: true,
      });
      if (response?.error) {
        // supabase-js puts a generic message on FunctionsHttpError; the useful
        // detail is in the non-2xx response body.
        let detail = '';
        let status = response?.response?.status || 0;
        try {
          const body = await response?.response?.json?.();
          detail = body?.detail || body?.error || '';
          if (!status && body?.status) status = body.status;
        } catch (error) {
          // No readable body; fall back to the error message.
        }
        const failure = new Error(detail || response.error.message || 'Voice request failed');
        failure.status = status;
        throw failure;
      }
      const audio = response?.data?.audio;
      if (!audio) throw new Error(response?.data?.error || 'No audio came back');
      if (response?.data?.usedFallback) {
        const reason = String(response.data.voiceError || 'not available').slice(0, 100);
        setNote(`That voice was unavailable (${reason}) — using the fallback voice.`);
      }
      const element = new Audio(`data:audio/mpeg;base64,${audio}`);
      audioRef.current = element;
      element.onended = () => setSpeaking(false);
      element.onerror = () => setSpeaking(false);
      await element.play();
    } catch (error) {
      setSpeaking(false);
      const detail = String(error?.message || '').toLowerCase();
      const status = Number(error?.status || 0);
      if (detail.includes('not configured')) {
        setNote('Voice replies are not set up for this project, so the device voice took over.');
      } else if (detail.includes('api key') || detail.includes('invalid_api_key') || status === 401) {
        setNote('The ElevenLabs key is invalid. Replace the Supabase secret with the full key starting with sk_.');
      } else if (status === 429 || detail.includes('quota') || detail.includes('rate limit')) {
        setNote('ElevenLabs has no quota left right now, so the device voice took over.');
      } else if (status === 404 || detail.includes('voice')) {
        setNote(`ElevenLabs rejected that voice${detail ? ` (${detail.slice(0, 120)})` : ''}. Check the voice ID in Supabase, then redeploy jarvis-speak.`);
      } else if (detail.includes('failed to fetch') || detail.includes('network')) {
        setNote('The voice service was unreachable, so the device voice took over.');
      } else if (detail.includes('could not read')) {
        setNote('The voice service could not read that reply, so the device voice took over.');
      } else {
        setNote('The voice service did not answer, so the device voice took over.');
      }
      speakOnDevice(phrase, wantsSwahili);
    }
  }, [voiceId, speakOnDevice, stopAudio]);

  return {
    supported: !!Recognition,
    speechSupported: true,
    listening,
    speaking,
    transcript,
    startListening,
    stopListening,
    lang,
    setLang,
    speakOn,
    setSpeakOn: updateSpeakOn,
    voices: JARVIS_VOICES,
    voiceId,
    setVoiceId,
    note,
    speak,
    stopSpeaking: stopAudio,
  };
}