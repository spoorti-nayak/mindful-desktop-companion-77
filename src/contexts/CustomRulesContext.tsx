
import React, { createContext, useContext, useState, useEffect } from 'react';
import SystemTrayService from '@/services/SystemTrayService';
import { toast } from "sonner";

export interface Rule {
  id: string;
  name: string;
  triggerCondition: {
    type: 'tabSwitches' | 'timeSpent' | 'appUsage';
    threshold: number;
    timeframe: number; // in minutes
  };
  action: {
    type: 'popup';
    media?: {
      type: 'image' | 'video' | 'text';
      content: string;
    };
    text: string;
    autoDismiss: boolean;
    dismissTime?: number; // in seconds
  };
  schedule?: {
    active: boolean;
    startTime?: string; // HH:MM format
    endTime?: string; // HH:MM format
    days?: number[]; // 0-6, where 0 is Sunday
  };
  enabled: boolean;
}

interface CustomRulesContextType {
  rules: Rule[];
  addRule: (rule: Omit<Rule, 'id'>) => void;
  updateRule: (id: string, rule: Partial<Rule>) => void;
  deleteRule: (id: string) => void;
  toggleRuleEnabled: (id: string) => void;
}

const CustomRulesContext = createContext<CustomRulesContextType | undefined>(undefined);

export const useCustomRules = () => {
  const context = useContext(CustomRulesContext);
  if (context === undefined) {
    throw new Error('useCustomRules must be used within a CustomRulesProvider');
  }
  return context;
};

export const CustomRulesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rules, setRules] = useState<Rule[]>([]);
  
  // Load saved rules from localStorage on component mount
  useEffect(() => {
    const savedRules = localStorage.getItem('customRules');
    if (savedRules) {
      setRules(JSON.parse(savedRules));
    }
    
    // Set up the rules engine to monitor triggers
    const ruleCheckInterval = setInterval(() => {
      checkRuleTriggers();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(ruleCheckInterval);
  }, []);
  
  // Save rules whenever they change
  useEffect(() => {
    localStorage.setItem('customRules', JSON.stringify(rules));
  }, [rules]);
  
  const addRule = (rule: Omit<Rule, 'id'>) => {
    const newRule: Rule = {
      ...rule,
      id: Date.now().toString(),
    };
    
    setRules([...rules, newRule]);
    toast.success("Rule created successfully");
  };
  
  const updateRule = (id: string, updatedFields: Partial<Rule>) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, ...updatedFields } : rule
    ));
    toast.success("Rule updated successfully");
  };
  
  const deleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
    toast.info("Rule deleted");
  };
  
  const toggleRuleEnabled = (id: string) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };
  
  const checkRuleTriggers = () => {
    const systemTray = SystemTrayService.getInstance();
    
    // Only check enabled rules
    const enabledRules = rules.filter(rule => rule.enabled);
    
    enabledRules.forEach(rule => {
      // Check if rule should be active based on schedule
      if (rule.schedule?.active && !isRuleActiveNow(rule)) {
        return;
      }
      
      let isTriggered = false;
      
      switch (rule.triggerCondition.type) {
        case 'tabSwitches':
          const switchCount = systemTray.getRecentSwitchCount();
          isTriggered = switchCount >= rule.triggerCondition.threshold;
          break;
          
        case 'timeSpent':
          // Convert minutes to milliseconds
          const thresholdMs = rule.triggerCondition.threshold * 60000;
          const screenTimeMs = systemTray.getScreenTime();
          isTriggered = screenTimeMs >= thresholdMs;
          break;
          
        case 'appUsage':
          const appUsage = systemTray.getAppUsageData();
          // Check if any distraction app has been used more than threshold
          const distractionApps = appUsage.filter(app => app.type === 'distraction');
          const exceededApp = distractionApps.find(app => 
            app.time >= (rule.triggerCondition.threshold * 60000)
          );
          isTriggered = !!exceededApp;
          break;
      }
      
      if (isTriggered) {
        triggerRuleAction(rule);
      }
    });
  };
  
  const isRuleActiveNow = (rule: Rule): boolean => {
    if (!rule.schedule || !rule.schedule.active) return true;
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Check if today is in active days
    if (rule.schedule.days && !rule.schedule.days.includes(currentDay)) {
      return false;
    }
    
    // Check if current time is within active hours
    if (rule.schedule.startTime && rule.schedule.endTime) {
      const [startHour, startMinute] = rule.schedule.startTime.split(':').map(Number);
      const [endHour, endMinute] = rule.schedule.endTime.split(':').map(Number);
      
      const currentTimeValue = currentHour * 60 + currentMinute;
      const startTimeValue = startHour * 60 + startMinute;
      const endTimeValue = endHour * 60 + endMinute;
      
      return currentTimeValue >= startTimeValue && currentTimeValue <= endTimeValue;
    }
    
    return true;
  };
  
  const triggerRuleAction = (rule: Rule) => {
    if (rule.action.type === 'popup') {
      showRichMediaPopup(rule);
    }
  };
  
  const showRichMediaPopup = (rule: Rule) => {
    // Dispatch event to show the popup
    const event = new CustomEvent('show-custom-rule-popup', { 
      detail: rule 
    });
    window.dispatchEvent(event);
  };
  
  const value = {
    rules,
    addRule,
    updateRule,
    deleteRule,
    toggleRuleEnabled
  };
  
  return (
    <CustomRulesContext.Provider value={value}>
      {children}
    </CustomRulesContext.Provider>
  );
};
