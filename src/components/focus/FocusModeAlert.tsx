
// This component is being replaced by the RichMediaPopup component
// It's kept as a stub to prevent build errors, but all functionality 
// is now handled through the CustomRules popup system

import React from 'react';
import { useFocusMode } from '@/contexts/FocusModeContext';

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
  // This is now just a stub - the real functionality is in RichMediaPopup
  return null;
}
