
import { Bell, Moon, Sun, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function TopNav() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { user, logout } = useAuth();
  const [notifications] = useState([
    { id: 1, title: "Time for an eye break!", time: "Just now" },
    { id: 2, title: "Great focus session!", time: "2h ago" },
    { id: 3, title: "Welcome to Attention Please!", time: "1d ago" },
  ]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <div className="flex h-16 items-center justify-between border-b px-6">
      <div className="flex items-center gap-2">
        <div className="flex items-center space-x-1">
          <span className="h-3 w-3 rounded-full bg-attention-blue-400"></span>
          <span className="h-3 w-3 rounded-full bg-attention-green-400"></span>
        </div>
        <h1 className="text-xl font-semibold">Attention Please!</h1>
      </div>
      <div className="flex items-center space-x-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Notifications</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex flex-col space-y-1 border-b pb-3"
                >
                  <p className="text-sm font-medium">{notification.title}</p>
                  <span className="text-xs text-muted-foreground">
                    {notification.time}
                  </span>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
        
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "light" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full border">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuItem>Notifications</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
