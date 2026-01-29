// Voice System for ANISHA
class VoiceSystem {
    constructor() {
        this.recognition = null;
        this.synthesis = null;
        this.isListening = false;
        this.isSpeaking = false;
        this.currentLanguage = 'en';
        this.onSpeechStart = null;
        this.onSpeechEnd = null;
        this.onTranscript = null;
        this.speechQueue = [];
    }

    async init() {
        await this.initSpeechRecognition();
        await this.initSpeechSynthesis();
        console.log('Voice System initialized');
    }

    async initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure recognition
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = 'en-US';
        
        // Event handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            if (this.onSpeechStart) this.onSpeechStart();
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            if (this.onSpeechEnd) this.onSpeechEnd();
        };
        
        this.recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            
            const isFinal = event.results[event.results.length - 1].isFinal;
            
            if (isFinal && transcript.trim()) {
                const language = this.detectLanguage(transcript);
                this.currentLanguage = language;
                
                if (this.onTranscript) {
                    this.onTranscript(transcript, language);
                }
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            if (this.onSpeechEnd) this.onSpeechEnd();
        };
    }

    async initSpeechSynthesis() {
        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported');
            return;
        }
        
        this.synthesis = window.speechSynthesis;
        
        // Get available voices
        await this.loadVoices();
        
        // Voice change event
        this.synthesis.onvoiceschanged = () => this.loadVoices();
    }

    async loadVoices() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 10;
            
            const checkVoices = () => {
                const voices = this.synthesis.getVoices();
                if (voices.length > 0) {
                    this.voices = voices;
                    resolve(voices);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkVoices, 100);
                } else {
                    console.warn('No voices available');
                    resolve([]);
                }
            };
            
            checkVoices();
        });
    }

    async enableMicrophone() {
        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // Stop all tracks (we just needed permission)
            stream.getTracks().forEach(track => track.stop());
            
            return true;
        } catch (error) {
            console.error('Microphone permission denied:', error);
            throw error;
        }
    }

    startListening() {
        if (!this.recognition) {
            console.warn('Speech recognition not available');
            return;
        }
        
        try {
            // Set language based on last detected
            const langCode = this.getLanguageCode(this.currentLanguage);
            this.recognition.lang = langCode;
            
            this.recognition.start();
        } catch (error) {
            console.error('Failed to start listening:', error);
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    async speak(text, language = 'en', emotion = 'calm') {
        if (!this.synthesis || !text.trim()) return;
        
        return new Promise((resolve) => {
            // Cancel any ongoing speech
            if (this.isSpeaking) {
                this.synthesis.cancel();
            }
            
            // Create utterance
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Configure based on language and emotion
            this.configureUtterance(utterance, language, emotion);
            
            // Select appropriate voice
            this.selectVoice(utterance, language);
            
            // Event handlers
            utterance.onstart = () => {
                this.isSpeaking = true;
            };
            
            utterance.onend = () => {
                this.isSpeaking = false;
                resolve();
            };
            
            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event.error);
                this.isSpeaking = false;
                resolve();
            };
            
            // Speak
            this.synthesis.speak(utterance);
        });
    }

    configureUtterance(utterance, language, emotion) {
        // Base configuration
        utterance.rate = 1.0; // Medium speed
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Adjust for emotion
        switch(emotion) {
            case 'happy':
                utterance.rate = 1.1;
                utterance.pitch = 1.1;
                break;
            case 'concerned':
                utterance.rate = 0.9;
                utterance.pitch = 0.9;
                break;
            case 'calm':
            default:
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
        }
        
        // Add natural pauses for longer sentences
        if (language === 'en') {
            // Add pauses after commas and periods
            utterance.text = this.addSpeechPauses(utterance.text);
        }
    }

    selectVoice(utterance, language) {
        if (!this.voices || this.voices.length === 0) return;
        
        // Filter voices by language
        const langCode = this.getLanguageCode(language);
        const langVoices = this.voices.filter(voice => 
            voice.lang.startsWith(langCode)
        );
        
        if (langVoices.length > 0) {
            // Prefer female voices for ANISHA
            const femaleVoices = langVoices.filter(voice => 
                voice.name.toLowerCase().includes('female') ||
                voice.name.toLowerCase().includes('woman') ||
                voice.name.toLowerCase().includes('female')
            );
            
            if (femaleVoices.length > 0) {
                utterance.voice = femaleVoices[0];
            } else {
                utterance.voice = langVoices[0];
            }
        }
    }

    addSpeechPauses(text) {
        // Add SSML-like pauses for more natural speech
        return text
            .replace(/, /g, ',<break time="200ms"/> ')
            .replace(/\. /g, '.<break time="300ms"/> ')
            .replace(/\? /g, '?<break time="300ms"/> ')
            .replace(/! /g, '!<break time="300ms"/> ');
    }

    detectLanguage(text) {
        // Simple language detection
        const textLower = text.toLowerCase();
        
        // Check for Assamese characters
        if (/[\u0980-\u09FF]/.test(text)) {
            return 'as';
        }
        
        // Check for Hindi characters
        if (/[\u0900-\u097F]/.test(text)) {
            return 'hi';
        }
        
        // Default to English
        return 'en';
    }

    getLanguageCode(language) {
        const codes = {
            'en': 'en-US',
            'hi': 'hi-IN',
            'as': 'as-IN'
        };
        return codes[language] || 'en-US';
    }

    // Queue system for sequential speech
    addToQueue(text, language, emotion) {
        this.speechQueue.push({ text, language, emotion });
        
        if (!this.isSpeaking) {
            this.processQueue();
        }
    }

    async processQueue() {
        if (this.speechQueue.length === 0 || this.isSpeaking) return;
        
        const { text, language, emotion } = this.speechQueue.shift();
        await this.speak(text, language, emotion);
        
        // Process next in queue
        if (this.speechQueue.length > 0) {
            setTimeout(() => this.processQueue(), 100);
        }
    }
              }
