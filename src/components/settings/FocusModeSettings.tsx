
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFocusMode } from "@/contexts/FocusModeContext";
import { X, Plus } from "lucide-react";

export function FocusModeSettings() {
  const { 
    isFocusMode, 
    toggleFocusMode, 
    whitelist, 
    addToWhitelist, 
    removeFromWhitelist,
    dimInsteadOfBlock,
    toggleDimOption
  } = useFocusMode();
  
  const [newApp, setNewApp] = useState("");
  
  const handleAddToWhitelist = () => {
    if (newApp.trim()) {
      addToWhitelist(newApp.trim());
      setNewApp("");
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Focus Mode</CardTitle>
        <CardDescription>
          Control which applications and websites you can access during focus sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="focus-mode">Enable Focus Mode</Label>
            <p className="text-sm text-muted-foreground">
              Block or dim non-whitelisted apps and websites
            </p>
          </div>
          <Switch 
            id="focus-mode" 
            checked={isFocusMode} 
            onCheckedChange={toggleFocusMode}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="dim-mode">Dim instead of block</Label>
            <p className="text-sm text-muted-foreground">
              Dim screen when using non-whitelisted apps instead of blocking them
            </p>
          </div>
          <Switch 
            id="dim-mode" 
            checked={dimInsteadOfBlock} 
            onCheckedChange={toggleDimOption}
          />
        </div>
        
        <div className="space-y-4">
          <Label>Manage Whitelist</Label>
          
          <div className="flex space-x-2">
            <Input 
              placeholder="Add application or website name" 
              value={newApp}
              onChange={(e) => setNewApp(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddToWhitelist}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {whitelist.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No apps in whitelist. Add apps that you want to allow during Focus Mode.
              </p>
            ) : (
              whitelist.map((app) => (
                <div 
                  key={app} 
                  className="flex items-center justify-between bg-secondary/50 rounded p-2"
                >
                  <span>{app}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeFromWhitelist(app)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
