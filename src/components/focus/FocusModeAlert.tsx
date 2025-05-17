
import React from 'react';

// This component is now fully replaced by the RichMediaPopup component
// It's kept as a stub to prevent build errors, but all functionality 
// is now integrated directly in the Focus Mode settings

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
  // Implementation moved to RichMediaPopup component
  // This is just a stub to prevent build errors
  return null;
}
