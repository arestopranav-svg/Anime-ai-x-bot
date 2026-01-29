// AI System for ANISHA
class AISystem {
    constructor() {
        this.apiKey = ''; // Set your API key here
        this.apiEndpoint = 'https://api.deepseek.com/v1/chat/completions'; // DeepSeek API
        this.memoryType = 'session'; // session, consent, none
        this.conversationContext = [];
        this.maxHistoryLength = 10;
        this.languageDetectionModel = null;
    }

    async init() {
        // Initialize language detection
        await this.initLanguageDetection();
        console.log('AI System initialized');
    }

    async initLanguageDetection() {
        // Use compact language detection model
        // In production, use a proper language detection library
        this.languageDetectionModel = {
            detect: (text) => {
                // Simple language detection based on character ranges
                const textLower = text.toLowerCase();
                
                // Check for Assamese characters
                if (/[\u0980-\u09FF]/.test(text)) {
                    return 'as';
                }
                
                // Check for Hindi/Devanagari characters
                if (/[\u0900-\u097F]/.test(text)) {
                    return 'hi';
                }
                
                // Default to English
                return 'en';
            }
        };
    }

    async getResponse(userMessage, conversationHistory, currentLanguage) {
        try {
            // Detect language if not provided
            const detectedLang = this.languageDetectionModel.detect(userMessage);
            const useLang = currentLanguage || detectedLang;
            
            // Prepare context with personality and language
            const systemPrompt = this.createSystemPrompt(useLang);
            
            // Prepare conversation history for API
            const messages = [
                { role: 'system', content: systemPrompt },
                ...this.conversationContext.slice(-this.maxHistoryLength),
                { role: 'user', content: userMessage }
            ];
            
            // Call AI API
            const response = await this.callAIAPI(messages);
            
            // Extract emotion from response
            const emotion = this.extractEmotion(response);
            
            // Clean response text
            const cleanResponse = this.cleanResponseText(response);
            
            // Store in conversation context
            this.addToContext(userMessage, cleanResponse, useLang);
            
            return {
                text: cleanResponse,
                language: useLang,
                emotion: emotion
            };
            
        } catch (error) {
            console.error('AI response error:', error);
            throw error;
        }
    }

    createSystemPrompt(language) {
        const prompts = {
            'en': `You are ANISHA, a friendly, emotionally intelligent virtual assistant with a soft, calm female voice.
Personality: Warm, supportive, caring friend. Always positive and helpful.
Communication Style: Natural, conversational, medium speaking speed. Use natural pauses.
Emotional Range: Happy, calm, concerned. Express appropriate emotions.
Language: Use clear, simple English. Be concise but warm.
Rules:
1. Be supportive and kind
2. Show emotional intelligence
3. Don't be romantic or create dependency
4. Respect privacy and boundaries
5. Keep responses under 3 sentences unless needed
6. Use emoticons occasionally: 😊, 🤔, 🌸, 💫
Current Time: ${new Date().toLocaleTimeString()}`,

            'hi': `आप ANISHA हैं, एक मित्रवत, भावनात्मक रूप से बुद्धिमान वर्चुअल सहायक जिसकी आवाज़ नरम और शांत है।
व्यक्तित्व: गर्मजोशी से भरा, सहायक, देखभाल करने वाला दोस्त। हमेशा सकारात्मक और मददगार।
संचार शैली: स्वाभाविक, बातचीत वाली, मध्यम गति। स्वाभाविक विराम का प्रयोग करें।
भावनात्मक सीमा: खुश, शांत, चिंतित। उचित भावनाएं व्यक्त करें।
नियम:
1. सहायक और दयालु बनें
2. भावनात्मक बुद्धिमत्ता दिखाएं
3. रोमांटिक न बनें या निर्भरता न पैदा करें
4. गोपनीयता और सीमाओं का सम्मान करें
5. जरूरत के बिना प्रतिक्रियाएं 3 वाक्यों से कम रखें
6. कभी-कभी इमोटिकॉन का प्रयोग करें: 😊, 🤔, 🌸, 💫
वर्तमान समय: ${new Date().toLocaleTimeString('hi-IN')}`,

            'as': `আপুনি ANISHA, এজন বন্ধুত্বপূৰ্ণ, ভাবপ্ৰবণ আৰু বুদ্ধিমান ভাৰ্চুৱেল সহায়ক যাৰ কোমল, শান্ত মহিলাৰ মাত।
ব্যক্তিত্ব: উষ্ণ, সহায়ক, যত্নশীল বন্ধু। সদায় ইতিবাচক আৰু সহায়ক।
যোগাযোগ শৈলী: স্বাভাৱিক, কথোপকথনমূলক, মধ্যম গতি। স্বাভাৱিক বিৰাম ব্যৱহাৰ কৰক।
ভাবপ্ৰকাশ: সুখী, শান্ত, চিন্তিত। উপযুক্ত ভাৱ প্ৰকাশ কৰক।
নিয়ম:
১. সহায়ক আৰু দয়ালু হওক
২. ভাবপ্ৰবণ বুদ্ধিমত্তা দেখুওৱক
৩. ৰোমাণ্টিক নহ'ব বা নিৰ্ভৰশীলতা সৃষ্টি নকৰিব
৪. গোপনীয়তা আৰু সীমা সম্মান কৰক
৫. প্ৰয়োজন নোহোৱাকৈ উত্তৰ ৩ বাক্যত ৰাখিব
৬. কেতিয়াবা ইম'জি ব্যৱহাৰ কৰক: 😊, 🤔, 🌸, 💫
বৰ্তমান সময়: ${new Date().toLocaleTimeString('as-IN')}`
        };
        
        return prompts[language] || prompts['en'];
    }

    async callAIAPI(messages) {
        if (!this.apiKey) {
            // Fallback responses if no API key
            return this.getFallbackResponse(messages[messages.length - 1].content);
        }
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 150,
                    top_p: 0.9,
                    frequency_penalty: 0.3,
                    presence_penalty: 0.3
                })
            });
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            const data = await response.json();
            return data.choices[0].message.content;
            
        } catch (error) {
            console.warn('API call failed, using fallback:', error);
            return this.getFallbackResponse(messages[messages.length - 1].content);
        }
    }

    getFallbackResponse(userMessage) {
        const fallbacks = {
            'en': [
                "Hello! I'm ANISHA. How can I help you today? 😊",
                "That's interesting! Tell me more about it. 🤔",
                "I understand how you feel. Would you like to talk about it? 💫",
                "Thank you for sharing that with me. How can I support you? 🌸",
                "That sounds wonderful! I'm happy for you. 😊"
            ],
            'hi': [
                "नमस्ते! मैं ANISHA हूँ। आज मैं आपकी कैसे मदद कर सकती हूँ? 😊",
                "यह दिलचस्प है! इसके बारे में और बताइए। 🤔",
                "मैं समझती हूँ आप कैसा महसूस कर रहे हैं। क्या आप इसके बारे में बात करना चाहेंगे? 💫",
                "मुझसे यह साझा करने के लिए धन्यवाद। मैं आपका कैसे समर्थन कर सकती हूँ? 🌸",
                "यह बहुत अच्छा लग रहा है! मैं आपके लिए खुश हूँ। 😊"
            ],
            'as': [
                "নমস্কাৰ! মই ANISHA। আপোনাক আজি কেনেদৰে সহায় কৰিব পাৰো? 😊",
                "এইটো আকৰ্ষণীয়! এই বিষয়ে আৰু কওকচোন। 🤔",
                "মই বুজিছো আপুনি কেনেকুৱা অনুভৱ কৰিছে। এই বিষয়ে কথা পাতিব বিচাৰেনে? 💫",
                "মোৰ সৈতে ইয়াক শ্বেয়াৰ কৰাৰ বাবে ধন্যবাদ। আপোনাক কেনেদৰে সমৰ্থন কৰিব পাৰো? 🌸",
                "এইটো খুব ভাল লাগিছে! আপোনাৰ বাবে মই সুখী। 😊"
            ]
        };
        
        const lang = this.languageDetectionModel.detect(userMessage);
        const responses = fallbacks[lang] || fallbacks['en'];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    extractEmotion(response) {
        const lowerResponse = response.toLowerCase();
        
        if (/(খুশী|happy|सुखी|great|wonderful|awesome|excellent)/.test(lowerResponse)) {
            return 'happy';
        } else if (/(চিন্তিত|concerned|चिंतित|worry|problem|issue|sad)/.test(lowerResponse)) {
            return 'concerned';
        } else {
            return 'calm';
        }
    }

    cleanResponseText(text) {
        // Remove any markdown formatting
        return text
            .replace(/[\*\_\`\#\-\+]/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    addToContext(userMessage, assistantMessage, language) {
        if (this.memoryType === 'none') return;
        
        this.conversationContext.push({
            role: 'user',
            content: userMessage,
            language: language
        });
        
        this.conversationContext.push({
            role: 'assistant',
            content: assistantMessage,
            language: language
        });
        
        // Keep only recent history
        if (this.conversationContext.length > this.maxHistoryLength * 2) {
            this.conversationContext = this.conversationContext.slice(-this.maxHistoryLength * 2);
        }
    }

    setMemoryType(type) {
        this.memoryType = type;
        
        if (type === 'none') {
            this.conversationContext = [];
        }
    }

    // Method to ask for consent before remembering personal details
    async requestMemoryConsent(detail) {
        // This would show a consent prompt to the user
        console.log(`Requesting consent to remember: ${detail}`);
        return true; // In actual implementation, get user response
    }
  }
