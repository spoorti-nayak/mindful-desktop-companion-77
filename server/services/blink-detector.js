const EventEmitter = require('events');

// Check if opencv4nodejs is available
let cv = null;
let isOpenCvAvailable = false;

// Check if running on Windows
const isWindows = process.platform === 'win32';

// On Windows, always use mock mode to avoid OpenCV installation issues
if (isWindows) {
  console.log('Running on Windows - using mock blink detection mode');
  isOpenCvAvailable = false;
} else {
  // On non-Windows platforms, try to load OpenCV
  try {
    cv = require('opencv4nodejs');
    isOpenCvAvailable = true;
    console.log('OpenCV loaded successfully');
  } catch (error) {
    console.warn('OpenCV not available:', error.message);
    console.warn('Blink detection will run in mock mode');
  }
}

class BlinkDetector extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      eyeAspectRatioThreshold: 0.3, // Threshold for determining if eye is closed
      eyeConsecutiveFrames: 3, // Number of consecutive frames eye must be below threshold to count as a blink
      ...options
    };
    
    this.isMockMode = !isOpenCvAvailable;
    this.isRunning = false;
    this.consecutiveFrames = 0;
    this.mockBlinkInterval = null;
    
    if (!this.isMockMode) {
      try {
        this.faceCascade = new cv.CascadeClassifier(cv.HAAR_EYE_CASCADE);
        this.videoCapture = null;
      } catch (error) {
        console.error('Error initializing OpenCV components:', error);
        this.isMockMode = true;
      }
    }
    
    console.log(`BlinkDetector initialized in ${this.isMockMode ? 'mock' : 'OpenCV'} mode`);
  }
  
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    if (this.isMockMode) {
      console.log('Starting blink detector in mock mode');
      // Simulate random blinks in mock mode (every 3-8 seconds)
      this.mockBlinkInterval = setInterval(() => {
        if (Math.random() < 0.5) {
          this.emit('blink');
          console.log('Mock blink detected');
        }
      }, 3000 + Math.random() * 5000);
    } else {
      console.log('Starting blink detector with OpenCV');
      try {
        this.videoCapture = new cv.VideoCapture(0);
        this.processFrames();
      } catch (error) {
        console.error('Failed to initialize video capture:', error);
        // Fall back to mock mode if camera initialization fails
        this.isMockMode = true;
        this.start();
      }
    }
  }
  
  stop() {
    this.isRunning = false;
    
    if (this.mockBlinkInterval) {
      clearInterval(this.mockBlinkInterval);
      this.mockBlinkInterval = null;
    }
    
    if (!this.isMockMode && this.videoCapture) {
      try {
        this.videoCapture.release();
        this.videoCapture = null;
      } catch (error) {
        console.error('Error releasing video capture:', error);
      }
    }
  }
  
  async processFrames() {
    if (!isOpenCvAvailable || this.isMockMode) return;
    
    while (this.isRunning) {
      try {
        const frame = await this.videoCapture.readAsync();
        if (frame.empty) continue;
        
        // Convert to grayscale for face detection
        const grayFrame = frame.cvtColor(cv.COLOR_BGR2GRAY);
        
        // Detect faces
        const faces = this.faceCascade.detectMultiScale(grayFrame);
        
        for (const face of faces) {
          // Process eye regions and detect blinks
          const eyeAspectRatio = this.calculateEyeAspectRatio(face, grayFrame);
          
          if (eyeAspectRatio < this.options.eyeAspectRatioThreshold) {
            this.consecutiveFrames++;
            
            if (this.consecutiveFrames >= this.options.eyeConsecutiveFrames) {
              this.emit('blink');
              this.consecutiveFrames = 0;
            }
          } else {
            this.consecutiveFrames = 0;
          }
        }
        
        // Small delay to reduce CPU usage
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        console.error('Error processing video frame:', error);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Longer delay on error
      }
    }
  }
  
  calculateEyeAspectRatio(face, grayFrame) {
    if (this.isMockMode) {
      return Math.random() < 0.1 ? 0.2 : 0.4; // Simulate occasional blinks
    }
    
    // This is a simplified version - a real implementation would:
    // 1. Extract eye regions from the face
    // 2. Find eye landmarks
    // 3. Calculate the aspect ratio of the eye opening
    
    // For a real implementation, you'd likely use a facial landmark detector
    // like dlib or a deep learning model
    
    // Returning a dummy value here
    return Math.random() < 0.1 ? 0.2 : 0.4; // Simulate occasional blinks
  }
}

module.exports = { BlinkDetector, isOpenCvAvailable };
