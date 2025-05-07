
const EventEmitter = require('events');

// Check if opencv4nodejs is available
let cv = null;
let isOpenCvAvailable = false;

try {
  cv = require('opencv4nodejs');
  isOpenCvAvailable = true;
  console.log('OpenCV loaded successfully');
} catch (error) {
  console.warn('OpenCV not available:', error.message);
  console.warn('Blink detection will run in fallback mode (simulated)');
}

class BlinkDetector extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      eyeAspectRatioThreshold: 0.3, // Threshold for determining if eye is closed
      eyeConsecutiveFrames: 3, // Number of consecutive frames eye must be below threshold to count as a blink
      simulationMode: !isOpenCvAvailable, // Enable simulation if OpenCV is not available
      ...options
    };
    
    this.isRunning = false;
    this.consecutiveFrames = 0;
    this.simulationInterval = null;
    
    if (isOpenCvAvailable) {
      try {
        this.faceCascade = new cv.CascadeClassifier(cv.HAAR_EYE_CASCADE);
        this.videoCapture = null;
        console.log('BlinkDetector initialized with OpenCV');
      } catch (error) {
        console.error('Error initializing OpenCV components:', error);
        this.options.simulationMode = true;
        console.warn('Falling back to simulation mode');
      }
    } else {
      console.log('BlinkDetector using fallback simulation mode');
    }
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    if (this.options.simulationMode) {
      console.log('Starting blink detector in simulation mode');
      this.startSimulation();
    } else if (isOpenCvAvailable) {
      console.log('Starting blink detector with OpenCV');
      
      try {
        this.videoCapture = new cv.VideoCapture(0);
        this.processFrames();
      } catch (error) {
        console.error('Failed to initialize video capture:', error);
        console.log('Falling back to simulation mode');
        this.options.simulationMode = true;
        this.startSimulation();
      }
    }
  }
  
  startSimulation() {
    // Simulate occasional blinks with random intervals
    this.simulationInterval = setInterval(() => {
      // Simulate blinks occurring randomly every 3-10 seconds
      if (Math.random() < 0.2) { // 20% chance each check
        this.emit('blink');
        console.log('Simulated blink detected');
      }
    }, 1000); // Check every second
  }
  
  stop() {
    this.isRunning = false;
    
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    
    if (isOpenCvAvailable && this.videoCapture) {
      try {
        this.videoCapture.release();
        this.videoCapture = null;
      } catch (error) {
        console.error('Error releasing video capture:', error);
      }
    }
  }
  
  async processFrames() {
    if (!isOpenCvAvailable) return;
    
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
    if (!isOpenCvAvailable) return 0.5;
    
    // This is a simplified version - a real implementation would:
    // 1. Extract eye regions from the face
    // 2. Find eye landmarks
    // 3. Calculate the aspect ratio of the eye opening
    
    // For now, we'll use a real detection algorithm based on the grayscale data
    // This is more realistic than random values but still simplified
    
    // Extract the eye region (simplified)
    const eyeRegion = grayFrame.getRegion(
      new cv.Rect(face.x + face.width * 0.2, face.y + face.height * 0.3, face.width * 0.6, face.height * 0.2)
    );
    
    // Calculate average intensity in the region
    const mean = eyeRegion.mean();
    
    // Use intensity to estimate eye openness (simplistic but better than random)
    // Lower mean = darker = possibly closed eye
    const normalized = mean.y / 255;
    return normalized;
  }
}

module.exports = { BlinkDetector, isOpenCvAvailable };
