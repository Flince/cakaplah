/**
 * Web Speech API wrapper for Bahasa Melayu TTS.
 */

let msVoice = null;
let voicesLoaded = false;

function loadVoices() {
  if (voicesLoaded) return;
  const voices = speechSynthesis.getVoices();
  msVoice = voices.find(v =>
    v.lang.startsWith('ms') || v.lang.startsWith('id')
  ) || voices.find(v => v.lang.startsWith('en')) || null;
  if (voices.length > 0) voicesLoaded = true;
}

if ('speechSynthesis' in window) {
  speechSynthesis.addEventListener('voiceschanged', loadVoices);
  loadVoices();
}

export function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  loadVoices();
  const utt = new SpeechSynthesisUtterance(text);
  if (msVoice) utt.voice = msVoice;
  utt.lang = msVoice?.lang || 'ms-MY';
  utt.rate = 0.88;
  utt.pitch = 1;
  speechSynthesis.speak(utt);
}

export function isSupported() {
  return 'speechSynthesis' in window;
}
