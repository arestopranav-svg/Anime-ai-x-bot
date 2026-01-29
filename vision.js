// Vision System for ANISHA
class VisionSystem {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.stream = null;
        this.isCameraActive = false;
        this.faceDetectionActive = false;
        this.faceDetector = null;
        this.onFaceDetected = null;
        this.onNoFace = null;
        this.lastFaceTime = 0;
        this.faceCheckInterval = null;
    }

    async init() {
        await this.initFaceDetection();
        this.createVideoElement();
        console.log('Vision System initialized');
    }

    async initFaceDetection() {
        // Check for Face Detection API
        if ('FaceDetector' in window) {
            this.faceDetector = new FaceDetector({
                maxDetectedFaces: 1,
                fastMode: true
            });
        } else {
            console.warn('Face Detection API not available');
            // Fallback to simple presence detection
        }
    }

    createVideoElement() {
        // Create hidden video element for face detection
        this.video = document.createElement('video');
        this.video.autoplay = true;
        this.video.playsInline = true;
        this.video.style.display = 'none';
        
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        document.body.appendChild(this.video);
        document.body.appendChild(this.canvas);
    }

    async enableCamera() {
        if (this.isCameraActive) return;
        
        try {
            // Request camera permission
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user',
                    frameRate: { ideal: 30 }
                },
                audio: false
            });
            
            this.video.srcObject = this.stream;
            this.isCameraActive = true;
            
            // Start face detection
            this.startFaceDetection();
            
            console.log('Camera enabled');
            return true;
            
        } catch (error) {
            console.error('Camera access denied:', error);
            throw error;
        }
    }

    disableCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.isCameraActive = false;
        this.stopFaceDetection();
        
        if (this.video) {
            this.video.srcObject = null;
        }
        
        console.log('Camera disabled');
    }

    startFaceDetection() {
        if (!this.isCameraActive || this.faceCheckInterval) return;
        
        this.faceCheckInterval = setInterval(() => {
            this.detectFacePresence();
        }, 100); // Check every 100ms
        
        console.log('Face detection started');
    }

    stopFaceDetection() {
        if (this.faceCheckInterval) {
            clearInterval(this.faceCheckInterval);
            this.faceCheckInterval = null;
        }
        
        console.log('Face detection stopped');
    }

    async detectFacePresence() {
        if (!this.video || this.video.readyState !== 4) return;
        
        try {
            let faceDetected = false;
            let faceData = null;
            
            if (this.faceDetector) {
                // Use Face Detection API
                const faces = await this.faceDetector.detect(this.video);
                
                if (faces.length > 0) {
                    faceDetected = true;
                    const face = faces[0];
                    
                    // Calculate normalized position (0-1)
                    const videoWidth = this.video.videoWidth;
                    const videoHeight = this.video.videoHeight;
                    
                    faceData = {
                        x: face.boundingBox.x / videoWidth,
                        y: face.boundingBox.y / videoHeight,
                        width: face.boundingBox.width / videoWidth,
                        height: face.boundingBox.height / videoHeight,
                        confidence: 1.0
                    };
                }
            } else {
                // Fallback: Simple motion detection
                faceDetected = await this.detectMotion();
                if (faceDetected) {
                    faceData = { x: 0.5, y: 0.5, width: 0.3, height: 0.4, confidence: 0.5 };
                }
            }
            
            if (faceDetected && faceData) {
                this.lastFaceTime = Date.now();
                
                if (this.onFaceDetected) {
                    this.onFaceDetected(faceData);
                }
            } else {
                // No face detected for 2 seconds
                if (Date.now() - this.lastFaceTime > 2000) {
                    if (this.onNoFace) {
                        this.onNoFace();
                    }
                }
            }
            
        } catch (error) {
            console.warn('Face detection error:', error);
        }
    }

    async detectMotion() {
        // Simple motion detection as fallback
        if (!this.ctx || !this.video.videoWidth) return false;
        
        // Set canvas dimensions to video dimensions
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        // Draw current video frame
        this.ctx.drawImage(this.video, 0, 0);
        
        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        // Simple motion detection by checking pixel changes
        // This is a very basic implementation
        let motionPixels = 0;
        const threshold = 30;
        
        // Sample every 10th pixel for performance
        for (let i = 0; i < data.length; i += 40) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Check if pixel is significantly different from background (black)
            if (r > threshold || g > threshold || b > threshold) {
                motionPixels++;
            }
        }
        
        // If enough bright pixels, assume face presence
        const motionRatio = motionPixels / (data.length / 40);
        return motionRatio > 0.1; // 10% of pixels show motion
    }

    // Eye contact simulation
    simulateEyeContact(faceData) {
        if (!faceData) return { x: 0, y: 0 };
        
        // Calculate where ANISHA should look based on face position
        // Center of face relative to screen
        const centerX = faceData.x + faceData.width / 2;
        const centerY = faceData.y + faceData.height / 2;
        
        // Normalize to -1 to 1 range for 3D look direction
        return {
            x: (centerX - 0.5) * 2,
            y: (centerY - 0.5) * 2
        };
    }

    // Cleanup
    cleanup() {
        this.disableCamera();
        
        if (this.video) {
            this.video.remove();
        }
        
        if (this.canvas) {
            this.canvas.remove();
        }
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisionSystem;
              }
