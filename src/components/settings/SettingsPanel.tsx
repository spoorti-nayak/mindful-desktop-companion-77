
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

export function SettingsPanel() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
    });
  };

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="eyecare">Eye Care</TabsTrigger>
      </TabsList>
      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure your basic app preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" defaultValue="JohnDoe" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autostart">Start app on system boot</Label>
                <p className="text-sm text-muted-foreground">
                  Launch automatically when you log in
                </p>
              </div>
              <Switch id="autostart" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="minimizeToTray">Minimize to system tray</Label>
                <p className="text-sm text-muted-foreground">
                  Keep running in the background when closed
                </p>
              </div>
              <Switch id="minimizeToTray" defaultChecked />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleSave}>Save Changes</Button>
          </CardFooter>
        </Card>
      </TabsContent>
      <TabsContent value="notifications">
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Control how and when you receive alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="focusNotifications">Focus reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Alerts when you seem distracted
                </p>
              </div>
              <Switch id="focusNotifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="eyeCareNotifications">Eye care reminders</Label>
                <p className="text-sm text-muted-foreground">
                  20-20-20 rule notifications
                </p>
              </div>
              <Switch id="eyeCareNotifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="soundEffects">Sound effects</Label>
                <p className="text-sm text-muted-foreground">
                  Play sounds with notifications
                </p>
              </div>
              <Switch id="soundEffects" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quietHours">Quiet hours</Label>
              <div className="flex space-x-2">
                <Input id="quietHoursStart" type="time" defaultValue="22:00" />
                <span className="flex items-center">to</span>
                <Input id="quietHoursEnd" type="time" defaultValue="08:00" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleSave}>Save Changes</Button>
          </CardFooter>
        </Card>
      </TabsContent>
      <TabsContent value="eyecare">
        <Card>
          <CardHeader>
            <CardTitle>Eye Care Settings</CardTitle>
            <CardDescription>
              Customize your eye protection features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="eyeCareEnabled">Enable eye care</Label>
                <p className="text-sm text-muted-foreground">
                  Track screen time and provide reminders
                </p>
              </div>
              <Switch id="eyeCareEnabled" defaultChecked />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminderInterval">Reminder interval (minutes)</Label>
              <Input
                id="reminderInterval"
                type="number"
                min="5"
                max="60"
                defaultValue="20"
              />
              <p className="text-xs text-muted-foreground">
                Standard recommendation is 20 minutes (20-20-20 rule)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="restDuration">Rest duration (seconds)</Label>
              <Input
                id="restDuration"
                type="number"
                min="5"
                max="60"
                defaultValue="20"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="screenDimming">Screen dimming during breaks</Label>
                <p className="text-sm text-muted-foreground">
                  Slightly dim the screen to encourage looking away
                </p>
              </div>
              <Switch id="screenDimming" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleSave}>Save Changes</Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
