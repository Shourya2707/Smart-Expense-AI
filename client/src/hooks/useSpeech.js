import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Voice input (speech-to-text) and output (text-to-speech) using the browser's
 * built-in Web Speech API — zero API cost. Recognition works in Chrome/Edge;
 * everywhere else we degrade gracefully to text-only.
 */
export const useSpeech = ({ onTranscript } = {}) => {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SR));
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalText = "";
    recognition.onresult = (event) => {
      let interim = "";
      finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const { transcript } = event.results[i][0];
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      onTranscript?.(finalText || interim);
    };
    recognition.onend = () => {
      setListening(false);
      if (finalText.trim()) onTranscript?.(finalText, true);
    };
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    return () => {
      recognition.abort?.();
      recognitionRef.current = null;
    };
  }, [onTranscript]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch { /* already started */ }
  }, [listening]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const speak = useCallback((text) => {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 400));
    utterance.rate = 1.05;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { listening, speaking, voiceSupported, startListening, stopListening, speak, stopSpeaking };
};
