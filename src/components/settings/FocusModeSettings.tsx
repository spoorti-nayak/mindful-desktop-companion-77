
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFocusMode } from "@/contexts/FocusModeContext";
import { X, Plus, Upload, Image } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  
  // Custom image upload state
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // User identifier for data separation
  const [userId, setUserId] = useState<string>(() => {
    const storedId = localStorage.getItem('focusModeUserId');
    return storedId || '';
  });
  
  // Effect to get user ID on mount
  useEffect(() => {
    const storedId = localStorage.getItem('focusModeUserId');
    if (storedId) {
      setUserId(storedId);
    } else {
      const newId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('focusModeUserId', newId);
      setUserId(newId);
    }
  }, []);
  
  const handleAddToWhitelist = () => {
    if (newApp.trim()) {
      addToWhitelist(newApp.trim());
      setNewApp("");
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file is an image
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      
      // Create URL for the uploaded file
      const imageUrl = URL.createObjectURL(file);
      setCustomImage(imageUrl);
      
      // Save to localStorage with user-specific key
      try {
        localStorage.setItem(`focusModeCustomImage-${userId}`, imageUrl);
      } catch (e) {
        console.error("Failed to save custom image:", e);
      }
      
      setShowImageDialog(false);
    }
  };
  
  // Load custom image from localStorage on component mount
  React.useEffect(() => {
    if (!userId) return;
    
    const savedImage = localStorage.getItem(`focusModeCustomImage-${userId}`);
    if (savedImage) {
      setCustomImage(savedImage);
    }
  }, [userId]);
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const clearCustomImage = () => {
    setCustomImage(null);
    localStorage.removeItem(`focusModeCustomImage-${userId}`);
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
        
        {/* Custom notification image section */}
        <div className="space-y-2">
          <Label>Focus Mode Notification Image</Label>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm text-muted-foreground">
                Custom image for focus mode notifications
              </p>
            </div>
            <Button 
              onClick={() => setShowImageDialog(true)}
              variant="outline"
              size="sm"
            >
              <Image className="h-4 w-4 mr-2" />
              {customImage ? 'Change Image' : 'Set Image'}
            </Button>
          </div>
          
          {customImage && (
            <div className="mt-2 relative">
              <img 
                src={customImage} 
                alt="Custom notification" 
                className="w-full h-32 object-cover rounded-md border border-border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 rounded-full"
                onClick={clearCustomImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <Label>Manage Whitelist</Label>
          
          <div className="flex space-x-2">
            <Input 
              placeholder="Add application or website name" 
              value={newApp}
              onChange={(e) => setNewApp(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddToWhitelist();
                }
              }}
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
        
        {/* Hidden file input for image upload */}
        <input 
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        
        <AlertDialog open={showImageDialog} onOpenChange={setShowImageDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Upload Custom Image</AlertDialogTitle>
              <AlertDialogDescription>
                Choose an image to show on focus mode notifications.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="flex items-center justify-center p-6 border-2 border-dashed border-muted-foreground/20 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                 onClick={triggerFileInput}>
              <div className="text-center space-y-2">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to select an image, or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, GIF up to 5MB
                </p>
              </div>
            </div>
            
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
