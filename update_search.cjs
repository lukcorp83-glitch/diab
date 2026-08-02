const fs = require('fs');
const path = 'C:/Users/luk/Downloads/diab/src/components/MealPlate/ProductSearch.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add imports
if (!content.includes('@capacitor-community/speech-recognition')) {
  content = content.replace(
    'import { cn } from "../../lib/utils";',
    'import { cn } from "../../lib/utils";\nimport { Capacitor } from "@capacitor/core";\nimport { SpeechRecognition as CapSpeechRecognition } from "@capacitor-community/speech-recognition";'
  );
}

// Replace startVoiceSearch
const oldFunction = `  const startVoiceSearch = () => {
  if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
  toast.error("Brak obsługi rozpoznawania głosu.");
  return;
  }
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "pl-PL";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onstart = () => { setIsListening(true); Haptics.light(); };
  recognition.onresult = (event: any) => {
  const transcript = event.results[0][0].transcript;
  setSearchTerm(transcript);
  setLocalSearchTerm(transcript);
  performOnlineSearch(transcript);
  };
  recognition.onerror = () => { setIsListening(false); toast.error("Błąd rozpoznawania głosu."); };
  recognition.onend = () => setIsListening(false);
  recognition.start();
  };`;

const newFunction = `  const startVoiceSearch = async () => {
    if (isListening) return;
    
    if (Capacitor.isNativePlatform()) {
      try {
        const permStatus = await CapSpeechRecognition.checkPermissions();
        if (permStatus.speechRecognition !== 'granted') {
          const reqStatus = await CapSpeechRecognition.requestPermissions();
          if (reqStatus.speechRecognition !== 'granted') {
            toast.error("Brak uprawnień do mikrofonu! Zezwól na nagrywanie w ustawieniach Androida.");
            return;
          }
        }
        setIsListening(true);
        Haptics.light();
        const { matches } = await CapSpeechRecognition.start({
          language: 'pl-PL',
          maxResults: 1,
          prompt: i18n.t('auto.mow_teraz', { defaultValue: 'Mów teraz...' }),
          partialResults: false,
          popup: true
        });
        if (matches && matches.length > 0) {
          const transcript = matches[0];
          setSearchTerm(transcript);
          setLocalSearchTerm(transcript);
          performOnlineSearch(transcript);
        }
        setIsListening(false);
        return;
      } catch (e) {
        console.error('Native speech recognition error:', e);
        setIsListening(false);
        toast.error("Nie udało się uruchomić mikrofonu natywnego.");
        return;
      }
    }

    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast.error("Brak obsługi rozpoznawania głosu.");
      return;
    }
    const SpeechRecAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecAPI();
    recognition.lang = "pl-PL";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => { setIsListening(true); Haptics.light(); };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      setLocalSearchTerm(transcript);
      performOnlineSearch(transcript);
    };
    recognition.onerror = () => { setIsListening(false); toast.error("Błąd rozpoznawania głosu."); };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };`;

// Use simple replacement, removing whitespace differences
let normalizedContent = content.replace(/\r\n/g, '\n');
let normalizedTarget = oldFunction.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
    content = normalizedContent.replace(normalizedTarget, newFunction);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully updated ProductSearch.tsx');
} else {
    console.log('Failed to match target string.');
}
