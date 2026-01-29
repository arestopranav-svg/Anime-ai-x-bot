// Main Application Controller
class ANISHASystem {
    constructor() {
        this.isInitialized = false;
        this.cameraEnabled = false;
        this.micEnabled = false;
        this.memoryEnabled = true;
        this.currentLanguage = 'en';
        this.isSpeaking = false;
        this.isListening = false;
        this.conversationHistory = [];
        
        this.init();
    }

    async init() {
        try {
            // Initialize subsystems
            await this.init3DAvatar();
            await this.initVoiceSystem();
            await this.initVisionSystem();
            await this.initAISystem();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Show privacy modal
            this.showPrivacyModal();
            
            this.isInitialized = true;
            console.log('ANISHA System initialized successfully');
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError('Initialization failed. Please refresh the page.');
        }
    }

    async init3DAvatar() {
        // This will be implemented in the 3D avatar system
        this.avatar = new ANISHAAvatar();
        await this.avatar.init();
    }

    async initVoiceSystem() {
        this.voiceSystem = new VoiceSystem();
        await this.voiceSystem.init();
        
        // Voice event listeners
        this.voiceSystem.onSpeechStart = () => this.onSpeechStart();
        this.voiceSystem.onSpeechEnd = () => this.onSpeechEnd();
        this.voiceSystem.onTranscript = (text, lang) => this.onTranscript(text, lang);
    }

    async initVisionSystem() {
        this.visionSystem = new VisionSystem();
        await this.visionSystem.init();
        
        // Vision event listeners
        this.visionSystem.onFaceDetected = (faceData) => this.onFaceDetected(faceData);
        this.visionSystem.onNoFace = () => this.onNoFace();
    }

    async initAISystem() {
        this.aiSystem = new AISystem();
        await this.aiSystem.init();
    }

    setupEventListeners() {
        // UI Controls
        document.getElementById('mic-toggle').addEventListener('click', () => this.toggleMicrophone());
        document.getElementById('camera-toggle').addEventListener('click', () => this.toggleCamera());
        document.getElementById('memory-toggle').addEventListener('click', () => this.showMemoryModal());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetConversation());
        
        // Chat Input
        const textInput = document.getElementById('text-input');
        const sendBtn = document.getElementById('send-btn');
        
        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(textInput.value);
                textInput.value = '';
            }
        });
        
        sendBtn.addEventListener('click', () => {
            this.sendMessage(textInput.value);
            textInput.value = '';
        });
        
        // Privacy Modal
        document.getElementById('accept-privacy').addEventListener('click', () => this.enableAllFeatures());
        document.getElementById('decline-privacy').addEventListener('click', () => this.enableBasicFeatures());
        
        // Memory Modal
        document.getElementById('save-memory-pref').addEventListener('click', () => this.saveMemoryPreference());
        
        // Voice indicator click to toggle listening
        document.getElementById('voice-indicator').addEventListener('click', () => this.toggleListening());
    }

    showPrivacyModal() {
        const modal = document.getElementById('privacy-modal');
        modal.classList.remove('hidden');
    }

    async enableAllFeatures() {
        document.getElementById('privacy-modal').classList.add('hidden');
        
        try {
            await this.visionSystem.enableCamera();
            this.cameraEnabled = true;
            document.getElementById('camera-toggle').classList.add('active');
            this.updateStatus('Camera enabled');
        } catch (error) {
            console.warn('Camera access denied:', error);
            this.updateStatus('Camera access denied');
        }
        
        await this.enableBasicFeatures();
    }

    async enableBasicFeatures() {
        document.getElementById('privacy-modal').classList.add('hidden');
        
        try {
            await this.voiceSystem.enableMicrophone();
            this.micEnabled = true;
            document.getElementById('mic-toggle').classList.add('active');
            this.updateStatus('Ready to listen');
        } catch (error) {
            console.warn('Microphone access denied:', error);
            this.updateStatus('Microphone access denied');
        }
        
        this.hideLoadingScreen();
    }

    hideLoadingScreen() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('main-container').classList.remove('hidden');
    }

    toggleMicrophone() {
        const micBtn = document.getElementById('mic-toggle');
        this.micEnabled = !this.micEnabled;
        
        if (this.micEnabled) {
            this.voiceSystem.startListening();
            micBtn.classList.add('active');
            this.updateStatus('Listening...');
        } else {
            this.voiceSystem.stopListening();
            micBtn.classList.remove('active');
            this.updateStatus('Microphone off');
        }
    }

    toggleCamera() {
        const cameraBtn = document.getElementById('camera-toggle');
        this.cameraEnabled = !this.cameraEnabled;
        
        if (this.cameraEnabled) {
            this.visionSystem.enableCamera();
            cameraBtn.classList.add('active');
        } else {
            this.visionSystem.disableCamera();
            cameraBtn.classList.remove('active');
        }
    }

    toggleListening() {
        if (!this.micEnabled) return;
        
        if (this.isListening) {
            this.voiceSystem.stopListening();
            this.isListening = false;
        } else {
            this.voiceSystem.startListening();
            this.isListening = true;
        }
    }

    async sendMessage(text) {
        if (!text.trim()) return;
        
        // Add user message to UI
        this.addMessage(text, 'user');
        
        // Update avatar to look attentive
        this.avatar.lookAtCamera();
        
        try {
            // Get AI response
            const response = await this.aiSystem.getResponse(text, this.conversationHistory, this.currentLanguage);
            
            // Add to conversation history
            this.conversationHistory.push({
                role: 'user',
                content: text,
                language: this.currentLanguage
            });
            
            this.conversationHistory.push({
                role: 'assistant',
                content: response.text,
                language: response.language,
                emotion: response.emotion
            });
            
            // Add assistant message to UI
            this.addMessage(response.text, 'assistant', response.language);
            
            // Speak the response
            await this.voiceSystem.speak(response.text, response.language, response.emotion);
            
            // Update avatar expression
            this.avatar.setExpression(response.emotion);
            
            // Update language display
            this.updateLanguageDisplay(response.language);
            
        } catch (error) {
            console.error('Error getting response:', error);
            const errorMsg = "I'm having trouble responding right now. Please try again.";
            this.addMessage(errorMsg, 'assistant', 'en');
            await this.voiceSystem.speak(errorMsg, 'en', 'calm');
        }
    }

    async onTranscript(text, language) {
        this.currentLanguage = language;
        this.updateLanguageDisplay(language);
        await this.sendMessage(text);
    }

    onSpeechStart() {
        this.isListening = true;
        document.getElementById('voice-indicator').classList.add('listening');
        this.avatar.startSpeaking();
    }

    onSpeechEnd() {
        this.isListening = false;
        document.getElementById('voice-indicator').classList.remove('listening');
        this.avatar.stopSpeaking();
    }

    onFaceDetected(faceData) {
        // Update avatar to look at face position
        if (this.avatar) {
            this.avatar.reactToFace(faceData);
        }
    }

    onNoFace() {
        // Return avatar to idle state
        if (this.avatar) {
            this.avatar.returnToIdle();
        }
    }

    addMessage(text, sender, language = 'en') {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        
        messageDiv.className = `message ${sender}-message`;
        
        const langFlag = {
            'en': '🇺🇸',
            'hi': '🇮🇳',
            'as': '🇮🇳'
        }[language] || '🌐';
        
        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(text)}</div>
            <div class="message-meta">
                <span>${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <span>${langFlag} ${language.toUpperCase()}</span>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    updateStatus(text) {
        document.getElementById('status-text').textContent = text;
    }

    updateLanguageDisplay(lang) {
        const langNames = {
            'en': 'English',
            'hi': 'Hindi',
            'as': 'Assamese'
        };
        document.getElementById('language-text').textContent = langNames[lang] || 'Unknown';
    }

    showMemoryModal() {
        document.getElementById('memory-modal').classList.remove('hidden');
    }

    saveMemoryPreference() {
        const selectedOption = document.querySelector('input[name="memory-option"]:checked').value;
        
        switch(selectedOption) {
            case 'session':
                this.memoryEnabled = true;
                this.aiSystem.setMemoryType('session');
                break;
            case 'consent':
                this.memoryEnabled = true;
                this.aiSystem.setMemoryType('consent');
                break;
            case 'none':
                this.memoryEnabled = false;
                this.aiSystem.setMemoryType('none');
                break;
        }
        
        document.getElementById('memory-modal').classList.add('hidden');
        document.getElementById('memory-status').textContent = 
            selectedOption === 'none' ? 'Inactive' : 'Active';
    }

    resetConversation() {
        this.conversationHistory = [];
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = '';
        this.addMessage("Hello! I'm ANISHA. How can I help you today?", 'assistant', 'en');
        this.avatar.setExpression('happy');
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 3D Avatar System
class ANISHAAvatar {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.avatar = null;
        this.mixer = null;
        this.clock = new THREE.Clock();
        
        this.currentExpression = 'neutral';
        this.isSpeaking = false;
        this.eyeTarget = new THREE.Vector3();
    }

    async init() {
        // Setup Three.js scene
        this.setupScene();
        
        // Load avatar model
        await this.loadAvatar();
        
        // Setup lighting
        this.setupLighting();
        
        // Setup animations
        this.setupAnimations();
        
        // Start render loop
        this.animate();
    }

    setupScene() {
        const canvas = document.getElementById('anisha-canvas');
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            45,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.6, 3);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Bloom effect
        this.setupBloom();
        
        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }

    setupBloom() {
        const renderScene = new THREE.RenderPass(this.scene, this.camera);
        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, 0.4, 0.85
        );
        bloomPass.threshold = 0;
        bloomPass.strength = 0.5;
        bloomPass.radius = 0.5;
        
        this.composer = new THREE.EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(bloomPass);
    }

    async loadAvatar() {
        // Placeholder for avatar loading
        // In production, load GLTF model with animations
        
        // Create a simple placeholder avatar for demo
        this.createPlaceholderAvatar();
    }

    createPlaceholderAvatar() {
        const group = new THREE.Group();
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.3, 32, 32);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xffccaa,
            roughness: 0.3,
            metalness: 0.1
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.6;
        group.add(head);
        
        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1, 1.65, 0.25);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.1, 1.65, 0.25);
        group.add(rightEye);
        
        // Hair (simplified)
        const hairGeometry = new THREE.SphereGeometry(0.35, 32, 32);
        const hairMaterial = new THREE.MeshStandardMaterial({
            color: 0x8a2be2,
            transparent: true,
            opacity: 0.8
        });
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.y = 1.8;
        hair.scale.y = 1.5;
        group.add(hair);
        
        this.avatar = group;
        this.scene.add(this.avatar);
        
        // Create skeleton for animations
        this.createSkeleton();
    }

    createSkeleton() {
        // Create bones for animation
        this.bones = {
            head: new THREE.Bone(),
            neck: new THREE.Bone(),
            torso: new THREE.Bone()
        };
        
        // Setup hierarchy
        this.bones.torso.add(this.bones.neck);
        this.bones.neck.add(this.bones.head);
        
        this.skeleton = new THREE.Skeleton([this.bones.torso, this.bones.neck, this.bones.head]);
        this.skeletonHelper = new THREE.SkeletonHelper(this.skeleton.bones[0]);
        this.scene.add(this.skeletonHelper);
        
        // Create mixer for animations
        this.mixer = new THREE.AnimationMixer(this.avatar);
    }

    setupLighting() {
        // Rim light
        const rimLight = new THREE.DirectionalLight(0x8a2be2, 2);
        rimLight.position.set(-5, 5, 5);
        this.scene.add(rimLight);
        
        // Key light
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
        keyLight.position.set(5, 5, 5);
        this.scene.add(keyLight);
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(0x00bfff, 0.5);
        fillLight.position.set(0, 5, -5);
        this.scene.add(fillLight);
        
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambientLight);
    }

    setupAnimations() {
        // Idle animation
        this.idleAnimation = {
            update: (delta) => {
                if (this.avatar) {
                    // Subtle breathing motion
                    const breath = Math.sin(Date.now() * 0.002) * 0.01;
                    this.avatar.position.y += breath;
                    
                    // Head idle sway
                    const sway = Math.sin(Date.now() * 0.001) * 0.01;
                    this.avatar.rotation.y = sway;
                }
            }
        };
        
        // Speaking animation
        this.speakingAnimation = {
            update: (delta) => {
                if (this.isSpeaking && this.avatar) {
                    // Mouth movement
                    const mouthScale = 1 + Math.sin(Date.now() * 0.02) * 0.1;
                    // This would control mouth morph targets in actual implementation
                }
            }
        };
    }

    setExpression(emotion) {
        this.currentExpression = emotion;
        
        // Update facial expression based on emotion
        switch(emotion) {
            case 'happy':
                this.animateToExpression({ eyeScale: 1.1, mouthCurve: 0.3 });
                break;
            case 'calm':
                this.animateToExpression({ eyeScale: 1, mouthCurve: 0.1 });
                break;
            case 'concerned':
                this.animateToExpression({ eyeScale: 0.9, eyebrowAngle: -0.2 });
                break;
            default:
                this.animateToExpression({ eyeScale: 1, mouthCurve: 0 });
        }
    }

    animateToExpression(targets) {
        // Animate facial features to target values
        // This would control morph targets in actual implementation
    }

    lookAtCamera() {
        // Make avatar look at camera
        this.eyeTarget.copy(this.camera.position);
    }

    reactToFace(faceData) {
        // React to face position
        if (faceData.x && faceData.y) {
            const x = (faceData.x - 0.5) * 0.5;
            const y = (faceData.y - 0.5) * 0.3;
            this.eyeTarget.set(x, y + 1.6, 0.3);
        }
    }

    returnToIdle() {
        // Return to default look
        this.eyeTarget.set(0, 1.6, 0.3);
    }

    startSpeaking() {
        this.isSpeaking = true;
        this.setExpression('happy');
    }

    stopSpeaking() {
        this.isSpeaking = false;
        this.setExpression('calm');
    }

    onResize() {
        const canvas = document.getElementById('anisha-canvas');
        this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.composer.setSize(canvas.clientWidth, canvas.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        
        // Update animations
        if (this.mixer) {
            this.mixer.update(delta);
        }
        
        // Update idle animation
        if (this.idleAnimation) {
            this.idleAnimation.update(delta);
        }
        
        // Update speaking animation
        if (this.speakingAnimation && this.isSpeaking) {
            this.speakingAnimation.update(delta);
        }
        
        // Smoothly look at target
        if (this.avatar) {
            this.avatar.lookAt(this.eyeTarget.lerp(this.eyeTarget, 0.1));
        }
        
        // Render with bloom
        this.composer.render();
    }
}

// Initialize the system when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.anisha = new ANISHASystem();
});
