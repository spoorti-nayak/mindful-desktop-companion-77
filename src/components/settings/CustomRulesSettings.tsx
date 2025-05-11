
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCustomRules, Rule } from "@/contexts/CustomRulesContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Clock, Plus, Settings } from "lucide-react";

export function CustomRulesSettings() {
  const { rules, addRule, updateRule, deleteRule, toggleRuleEnabled } = useCustomRules();
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [isEditingRule, setIsEditingRule] = useState<string | null>(null);

  const [ruleName, setRuleName] = useState("");
  const [triggerType, setTriggerType] = useState<"tabSwitches" | "timeSpent" | "appUsage">("tabSwitches");
  const [threshold, setThreshold] = useState(10);
  const [timeframe, setTimeframe] = useState(5);
  const [actionText, setActionText] = useState("");
  const [mediaType, setMediaType] = useState<"none" | "image" | "video" | "text">("none");
  const [mediaContent, setMediaContent] = useState("");
  const [autoDismiss, setAutoDismiss] = useState(false);
  const [dismissTime, setDismissTime] = useState(10);
  const [scheduleActive, setScheduleActive] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [activeDays, setActiveDays] = useState([1, 2, 3, 4, 5]); // Monday to Friday

  const resetForm = () => {
    setRuleName("");
    setTriggerType("tabSwitches");
    setThreshold(10);
    setTimeframe(5);
    setActionText("");
    setMediaType("none");
    setMediaContent("");
    setAutoDismiss(false);
    setDismissTime(10);
    setScheduleActive(false);
    setStartTime("09:00");
    setEndTime("17:00");
    setActiveDays([1, 2, 3, 4, 5]);
  };

  const handleSaveRule = () => {
    const newRule: Omit<Rule, 'id'> = {
      name: ruleName,
      triggerCondition: {
        type: triggerType,
        threshold,
        timeframe,
      },
      action: {
        type: 'popup',
        text: actionText,
        autoDismiss,
        dismissTime: autoDismiss ? dismissTime : undefined,
      },
      schedule: scheduleActive ? {
        active: true,
        startTime,
        endTime,
        days: activeDays,
      } : undefined,
      enabled: true,
    };

    if (mediaType !== 'none') {
      newRule.action.media = {
        type: mediaType === 'text' ? 'text' : mediaType,
        content: mediaContent,
      };
    }

    if (isEditingRule) {
      updateRule(isEditingRule, newRule);
      setIsEditingRule(null);
    } else {
      addRule(newRule);
    }

    resetForm();
    setIsCreatingRule(false);
  };

  const handleEditRule = (rule: Rule) => {
    setIsEditingRule(rule.id);
    setRuleName(rule.name);
    setTriggerType(rule.triggerCondition.type);
    setThreshold(rule.triggerCondition.threshold);
    setTimeframe(rule.triggerCondition.timeframe);
    setActionText(rule.action.text);
    
    if (rule.action.media) {
      setMediaType(rule.action.media.type);
      setMediaContent(rule.action.media.content);
    } else {
      setMediaType("none");
      setMediaContent("");
    }
    
    setAutoDismiss(!!rule.action.autoDismiss);
    setDismissTime(rule.action.dismissTime || 10);
    
    if (rule.schedule) {
      setScheduleActive(true);
      setStartTime(rule.schedule.startTime || "09:00");
      setEndTime(rule.schedule.endTime || "17:00");
      setActiveDays(rule.schedule.days || [1, 2, 3, 4, 5]);
    } else {
      setScheduleActive(false);
    }
    
    setIsCreatingRule(true);
  };
  
  // Helper to convert a data URL to a file for upload handling
  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  };

  // Media upload handling
  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setMediaContent(content);
    };
    reader.readAsDataURL(file);
  };
  
  const getTriggerDescription = (rule: Rule): string => {
    switch(rule.triggerCondition.type) {
      case 'tabSwitches':
        return `${rule.triggerCondition.threshold}+ tab switches in ${rule.triggerCondition.timeframe} min`;
      case 'timeSpent':
        return `${rule.triggerCondition.threshold}+ min screen time`;
      case 'appUsage':
        return `${rule.triggerCondition.threshold}+ min on distraction apps`;
      default:
        return 'Custom trigger';
    }
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Custom Notification Rules</CardTitle>
          <CardDescription>
            Create personalized rules for when and how you receive focus reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => { resetForm(); setIsCreatingRule(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Rule
          </Button>
          
          <div className="space-y-4">
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No rules created yet. Click "Create New Rule" to get started.
              </p>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <h3 className="font-medium">{rule.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getTriggerDescription(rule)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRuleEnabled(rule.id)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditRule(rule)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isCreatingRule} onOpenChange={(open) => {
        if (!open) {
          setIsCreatingRule(false);
          setIsEditingRule(null);
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {isEditingRule ? "Edit Rule" : "Create New Rule"}
            </DialogTitle>
            <DialogDescription>
              Create a custom rule to help maintain your focus.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="E.g., Too many distractions reminder"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trigger Condition</Label>
                <Select
                  value={triggerType}
                  onValueChange={(value: any) => setTriggerType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tabSwitches">Tab/App Switches</SelectItem>
                    <SelectItem value="timeSpent">Screen Time</SelectItem>
                    <SelectItem value="appUsage">Distraction App Usage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Threshold</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
                    min={1}
                  />
                  {triggerType === 'tabSwitches' && (
                    <Input
                      type="number"
                      value={timeframe}
                      onChange={(e) => setTimeframe(parseInt(e.target.value) || 1)}
                      min={1}
                      placeholder="minutes"
                      className="w-24"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {triggerType === 'tabSwitches' && `Switches in ${timeframe} minutes`}
                  {triggerType === 'timeSpent' && 'Minutes of screen time'}
                  {triggerType === 'appUsage' && 'Minutes on distraction apps'}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notification Message</Label>
              <Textarea
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                placeholder="Message to show in the notification popup"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Media Type</Label>
              <Select
                value={mediaType}
                onValueChange={(value: any) => setMediaType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Include media?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Media</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {mediaType !== 'none' && (
              <div className="space-y-2">
                <Label>Upload {mediaType}</Label>
                <Input
                  type="file"
                  accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                  onChange={handleMediaUpload}
                />
                {mediaContent && mediaType === 'image' && (
                  <div className="mt-2 h-32 w-full overflow-hidden rounded-md">
                    <img
                      src={mediaContent}
                      alt="Preview"
                      className="h-full w-auto object-contain"
                    />
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-dismiss">Auto-dismiss notification</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically close the popup after a set time
                </p>
              </div>
              <Switch
                id="auto-dismiss"
                checked={autoDismiss}
                onCheckedChange={setAutoDismiss}
              />
            </div>
            
            {autoDismiss && (
              <div className="space-y-2">
                <Label>Auto-dismiss after (seconds)</Label>
                <Input
                  type="number"
                  value={dismissTime}
                  onChange={(e) => setDismissTime(parseInt(e.target.value) || 10)}
                  min={1}
                />
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="schedule-active">Set schedule for this rule</Label>
                <p className="text-xs text-muted-foreground">
                  Only trigger during specific times
                </p>
              </div>
              <Switch
                id="schedule-active"
                checked={scheduleActive}
                onCheckedChange={setScheduleActive}
              />
            </div>
            
            {scheduleActive && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreatingRule(false);
              setIsEditingRule(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule}>Save Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
