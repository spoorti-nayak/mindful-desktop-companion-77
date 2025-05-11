
import React, { createContext, useContext, useState, useEffect } from 'react';
import SystemTrayService from '@/services/SystemTrayService';
import { toast } from "sonner";

export interface Rule {
  id: string;
  name: string;
  condition: {
    type: string;
    threshold: number;
    timeWindow: number;
  };
  action: {
    type: string;
    text: string;
    media?: {
      type: 'image' | 'video';
      content: string;
    };
    autoDismiss: boolean;
    dismissTime?: number; // in seconds
  };
  isActive: boolean;
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
  }, []);
  
  // Save rules whenever they change
  useEffect(() => {
    localStorage.setItem('customRules', JSON.stringify(rules));
  }, [rules]);
  
  const addRule = (rule: Omit<Rule, 'id'>) => {
    const newRule: Rule = {
      ...rule,
      id: `rule-${Date.now()}`,
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
      rule.id === id ? { ...rule, isActive: !rule.isActive } : rule
    ));
  };
  
  // Simplified rule checking logic - just based on app switching
  useEffect(() => {
    const systemTray = SystemTrayService.getInstance();
    
    // Set up the monitoring for app switches
    const checkRulesInterval = setInterval(() => {
      if (rules.length === 0) return;
      
      const recentSwitches = systemTray.getRecentSwitchCount();
      
      // Check if any rule should be triggered
      rules.forEach(rule => {
        if (rule.isActive && recentSwitches > 3) {
          triggerRuleAction(rule);
        }
      });
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(checkRulesInterval);
  }, [rules]);
  
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
