
import React from 'react';

// This component is now fully replaced by the RichMediaPopup component
// It's kept as a stub to prevent build errors, but all functionality 
// is now directly handled through the FocusModeContext and RichMediaPopup

interface FocusModeAlertProps {
  appName: string;
  onDismiss: () => void;
  imageUrl?: string;
}

export function FocusModeAlert({ 
  appName,
  onDismiss,
  imageUrl
}: FocusModeAlertProps) {
  // Implementation redirected to RichMediaPopup component
  return null;
}
