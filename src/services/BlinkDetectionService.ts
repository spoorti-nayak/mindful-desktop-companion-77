import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as faceDetection from '@tensorflow-models/face-detection';
import '@mediapipe/face_mesh';
import '@mediapipe/face_detection';
import { MediaPipeFaceMeshMediaPipeModelConfig } from '@tensorflow-models/face-landmarks-detection/dist/mediapipe/types';

class BlinkDetectionService {
  private static instance: BlinkDetectionService;
  private model: faceLandmarksDetection.FaceLandmarksDetector | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private isRunning: boolean = false;
  private listeners: Array<(message: string) => void> = [];
  private isModelLoaded: boolean = false;
  
  // EAR (Eye Aspect Ratio) threshold
  private EAR_THRESHOLD = 0.2;
  private BLINK_CONSECUTIVE_FRAMES = 2;
  private blinkCount = 0;
  private frameCounter = 0;
  private lastBlinkTime = 0;
  private lowBlinkRateWarningThreshold = 5; // minimum blinks per minute
  private checkInterval = 60000; // 1 minute

  private constructor() {
    // Initialize TensorFlow.js
    this.initializeTensorFlow();
  }

  public static getInstance(): BlinkDetectionService {
    if (!BlinkDetectionService.instance) {
      BlinkDetectionService.instance = new BlinkDetectionService();
    }
    return BlinkDetectionService.instance;
  }

  private async initializeTensorFlow(): Promise<void> {
    try {
      await tf.ready();
      console.log('TensorFlow.js is ready');
      
      // Load the face detection model with explicit version references
      const faceDetectionModel = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        {
          runtime: 'mediapipe',
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229',
        }
      );
      
      console.log('Face detection model loaded');
      
      // Then load the MediaPipe FaceMesh model with explicit version reference
      const config: MediaPipeFaceMeshMediaPipeModelConfig = {
        runtime: 'mediapipe',
        refineLandmarks: true,
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619',
      };
      
      this.model = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        config
      );
      
      console.log('Face landmarks detection model loaded');
      this.isModelLoaded = true;
    } catch (error) {
      console.error('Failed to load face detection models:', error);
      this.isModelLoaded = false;
    }
  }

  public async startDetection(): Promise<boolean> {
    if (this.isRunning) return true;
    if (!this.isModelLoaded) {
      console.warn('Face detection model not loaded, cannot start detection');
      return false;
    }

    try {
      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      
      // Create video element
      this.videoEl = document.createElement('video');
      this.videoEl.srcObject = this.stream;
      this.videoEl.autoplay = true;
      this.videoEl.playsInline = true;
      this.videoEl.muted = true;
      this.videoEl.width = 640;
      this.videoEl.height = 480;
      
      // Hide the video element but keep it in the DOM for processing
      this.videoEl.style.position = 'absolute';
      this.videoEl.style.opacity = '0';
      this.videoEl.style.pointerEvents = 'none';
      document.body.appendChild(this.videoEl);
      
      await this.videoEl.play();
      
      this.isRunning = true;
      this.lastBlinkTime = Date.now();
      this.blinkCount = 0;
      this.detectBlinks();
      this.startBlinkRateCheck();
      
      console.log('Blink detection started with camera');
      return true;
    } catch (error) {
      console.error('Failed to start blink detection with camera:', error);
      this.cleanUp();
      return false;
    }
  }

  public stopDetection(): void {
    if (!this.isRunning) return;
    
    this.cleanUp();
    console.log('Blink detection stopped');
  }

  public isDetectionAvailable(): boolean {
    return this.isModelLoaded;
  }

  private cleanUp(): void {
    this.isRunning = false;
    
    // Stop the camera stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    // Remove the video element
    if (this.videoEl) {
      document.body.removeChild(this.videoEl);
      this.videoEl = null;
    }
  }

  private async detectBlinks(): Promise<void> {
    if (!this.isRunning || !this.model || !this.videoEl) return;

    try {
      // Run face landmarks detection
      const faces = await this.model.estimateFaces(this.videoEl);
      
      if (faces.length > 0) {
        const face = faces[0];
        
        // Get eye landmarks (MediaPipe FaceMesh landmark indices for eyes)
        const leftEye = this.getEyeLandmarks(face, 'left');
        const rightEye = this.getEyeLandmarks(face, 'right');
        
        // Calculate Eye Aspect Ratio (EAR)
        const leftEAR = this.calculateEAR(leftEye);
        const rightEAR = this.calculateEAR(rightEye);
        
        // Average the EAR of both eyes
        const ear = (leftEAR + rightEAR) / 2.0;
        
        // Check if the eyes are closed (EAR below threshold)
        if (ear < this.EAR_THRESHOLD) {
          this.frameCounter += 1;
        } else {
          // If eyes were previously closed and now open, count as blink
          if (this.frameCounter >= this.BLINK_CONSECUTIVE_FRAMES) {
            this.blinkCount += 1;
            this.lastBlinkTime = Date.now();
            console.log('Real blink detected');
          }
          // Reset the frame counter
          this.frameCounter = 0;
        }
      }
      
      // Schedule the next detection
      if (this.isRunning) {
        requestAnimationFrame(() => this.detectBlinks());
      }
    } catch (error) {
      console.error('Error in blink detection:', error);
      // Continue detection despite error
      if (this.isRunning) {
        requestAnimationFrame(() => this.detectBlinks());
      }
    }
  }

  private getEyeLandmarks(face: faceLandmarksDetection.Face, side: 'left' | 'right'): number[][] {
    // Extract the landmarks for the eye region
    // These indices are specific to MediaPipe FaceMesh model
    const keypoints = face.keypoints;
    
    // Simplified extraction - actual indices would be specific to the model
    const eyePoints = side === 'left' 
      ? [33, 160, 158, 133, 153, 144] // Example left eye indices
      : [362, 385, 387, 263, 373, 380]; // Example right eye indices
    
    return eyePoints.map(index => {
      const point = keypoints[index];
      return point ? [point.x, point.y] : [0, 0];
    });
  }

  private calculateEAR(eye: number[][]): number {
    // Calculate the Euclidean distance between points
    const distance = (p1: number[], p2: number[]) => {
      return Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
    };
    
    // Calculate the Eye Aspect Ratio
    // EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
    const horizontalLength = distance(eye[0], eye[3]);
    const verticalLength1 = distance(eye[1], eye[5]);
    const verticalLength2 = distance(eye[2], eye[4]);
    
    // Avoid division by zero
    if (horizontalLength === 0) return 1.0;
    
    return (verticalLength1 + verticalLength2) / (2.0 * horizontalLength);
  }

  private startBlinkRateCheck(): void {
    if (!this.isRunning) return;
    
    // Check blink rate every minute
    setTimeout(() => {
      if (!this.isRunning) return;
      
      const currentTime = Date.now();
      const elapsedMinutes = (currentTime - this.lastBlinkTime) / 60000;
      
      // If no blinks detected in the last minute
      if (elapsedMinutes >= 1) {
        this.notifyLowBlinkRate();
      }
      
      // Reset blink count for the next interval
      this.blinkCount = 0;
      
      // Schedule next check
      if (this.isRunning) {
        this.startBlinkRateCheck();
      }
    }, this.checkInterval);
  }

  private notifyLowBlinkRate(): void {
    const message = "You've been blinking less frequently. Remember to blink more often to reduce eye strain.";
    this.listeners.forEach(listener => listener(message));
  }

  public addBlinkRateListener(callback: (message: string) => void): void {
    this.listeners.push(callback);
  }

  public removeBlinkRateListener(callback: (message: string) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
}

export default BlinkDetectionService;
