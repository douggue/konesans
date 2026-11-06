import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useStore } from './store';

const VOICE_LANG: Record<string, string> = { en: 'en-US', es: 'es-MX', fr: 'fr-FR', ht: 'fr-HT' };

/** Speak an audio ref (`tts:<lang>:<text>`) or plain text in the given language. */
export function speak(refOrText: string, lang = 'ht') {
  if (!useStore.getState().settings.voice) return;
  let text = refOrText, l = lang;
  const m = /^tts:([a-z]{2}):([\s\S]+)$/.exec(refOrText);
  if (m) { l = m[1]; text = m[2]; }
  try { Speech.stop(); Speech.speak(text, { language: VOICE_LANG[l] ?? l, rate: 0.9 }); } catch { /* no TTS on this device */ }
}

export function tap(kind: 'light' | 'success' | 'error' = 'light') {
  if (!useStore.getState().settings.haptic || Platform.OS === 'web') return;
  try {
    if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
  } catch { /* ignore */ }
}
