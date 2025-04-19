
import { useEffect, useState } from 'react';
import BlinkDetectionService from '@/services/BlinkDetectionService';
import { useToast } from '@/hooks/use-toast';
import { useSystemTray } from '@/hooks/use-system-tray';

export function useBlinkDetection() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const { toast } = useToast();
  const { isTrayActive } = useSystemTray();
  
  useEffect(() => {
    // Check if the browser supports the required APIs
    const checkSupport = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setIsSupported(false);
          console.error('Browser does not support getUserMedia API');
          return;
        }
        
        // Check if camera access is available
        await navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            // Stop all tracks immediately after checking
            stream.getTracks().forEach(track => track.stop());
            setIsSupported(true);
          })
          .catch(err => {
            console.error('Camera access denied:', err);
            setIsSupported(false);
          });
      } catch (error) {
        console.error('Error checking camera support:', error);
        setIsSupported(false);
      }
    };
    
    checkSupport();
  }, []);
  
  useEffect(() => {
    const blinkService = BlinkDetectionService.getInstance();
    
    // Handler for low blink rate notifications
    const handleLowBlinkRate = (message: string) => {
      toast({
        title: "Blink Reminder",
        description: message,
        duration: 8000,
      });
    };
    
    // Add listener when component mounts
    blinkService.addBlinkRateListener(handleLowBlinkRate);
    
    // Start detection if we're in tray mode
    if (isTrayActive) {
      startDetection();
    }
    
    // Clean up when component unmounts
    return () => {
      blinkService.removeBlinkRateListener(handleLowBlinkRate);
      stopDetection();
    };
  }, [toast, isTrayActive]);
  
  // Start blink detection
  const startDetection = async () => {
    if (!isSupported) return false;
    
    const blinkService = BlinkDetectionService.getInstance();
    const started = await blinkService.startDetection();
    
    if (started) {
      setIsDetecting(true);
      return true;
    }
    
    return false;
  };
  
  // Stop blink detection
  const stopDetection = () => {
    const blinkService = BlinkDetectionService.getInstance();
    blinkService.stopDetection();
    setIsDetecting(false);
  };
  
  // Toggle blink detection
  const toggleDetection = async () => {
    if (isDetecting) {
      stopDetection();
      return false;
    } else {
      return await startDetection();
    }
  };
  
  return {
    isDetecting,
    isSupported,
    startDetection,
    stopDetection,
    toggleDetection
  };
}
