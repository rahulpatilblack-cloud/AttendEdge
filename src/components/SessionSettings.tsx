import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  Shield, 
  AlertTriangle, 
  RefreshCw, 
  LogOut,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const SessionSettings: React.FC = () => {
  const { 
    isSessionActive, 
    lastActivity, 
    sessionTimeout, 
    resetSessionTimer, 
    extendSession, 
    logout 
  } = useSession();
  const { user } = useAuth();
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customTimeout, setCustomTimeout] = useState(Math.floor(sessionTimeout / 60000));
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [autoExtend, setAutoExtend] = useState(false);

  // Calculate time remaining
  const timeRemaining = Math.max(0, sessionTimeout - (new Date().getTime() - lastActivity.getTime()));
  const minutesRemaining = Math.floor(timeRemaining / 60000);
  const secondsRemaining = Math.floor((timeRemaining % 60000) / 1000);

  // Format time
  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get session status
  const getSessionStatus = () => {
    if (minutesRemaining <= 5) {
      return { color: 'bg-red-500', text: 'Critical', icon: AlertTriangle };
    } else if (minutesRemaining <= 15) {
      return { color: 'bg-orange-500', text: 'Warning', icon: Clock };
    } else {
      return { color: 'bg-green-500', text: 'Active', icon: Shield };
    }
  };

  const statusInfo = getSessionStatus();
  const StatusIcon = statusInfo.icon;

  const handleExtendSession = () => {
    extendSession();
    toast({
      title: "Session Extended",
      description: "Your session has been extended successfully",
    });
  };

  const handleResetTimer = () => {
    resetSessionTimer();
    toast({
      title: "Timer Reset",
      description: "Session timer has been reset",
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleCustomTimeoutChange = (value: string) => {
    const minutes = parseInt(value);
    if (minutes >= 5 && minutes <= 480) { // 5 minutes to 8 hours
      setCustomTimeout(minutes);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Session Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Session Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Session</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <StatusIcon className={`w-6 h-6 ${statusInfo.color} text-white p-1 rounded`} />
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold">{statusInfo.text}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Clock className="w-6 h-6 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Time Remaining</p>
                  <p className="font-mono font-semibold">{formatTime(minutesRemaining, secondsRemaining)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Shield className="w-6 h-6 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Session Active</p>
                  <Badge variant={isSessionActive ? "default" : "secondary"}>
                    {isSessionActive ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Last Activity</p>
                <p className="font-semibold">
                  {lastActivity.toLocaleString()}
                </p>
              </div>
              <Button onClick={handleResetTimer} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Timer
              </Button>
            </div>
          </div>

          <Separator />

          {/* Session Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Session Actions</h3>
            
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleExtendSession} className="bg-green-600 hover:bg-green-700">
                <Clock className="w-4 h-4 mr-2" />
                Extend Session
              </Button>
              
              <Button onClick={handleLogout} variant="destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Logout Now
              </Button>
            </div>
          </div>

          <Separator />

          {/* Advanced Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Advanced Settings</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showAdvanced ? 'Hide' : 'Show'} Advanced
              </Button>
            </div>

            {showAdvanced && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="customTimeout">Custom Session Timeout (minutes)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="customTimeout"
                      type="number"
                      min="5"
                      max="480"
                      value={customTimeout}
                      onChange={(e) => handleCustomTimeoutChange(e.target.value)}
                      className="w-32"
                    />
                    <span className="text-sm text-gray-500">5 - 480 minutes</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Current: {Math.floor(sessionTimeout / 60000)} minutes
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="notifications">Enable Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Show session timeout warnings
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={enableNotifications}
                    onCheckedChange={setEnableNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="autoExtend">Auto-extend on Activity</Label>
                    <p className="text-sm text-gray-500">
                      Automatically extend session on user activity
                    </p>
                  </div>
                  <Switch
                    id="autoExtend"
                    checked={autoExtend}
                    onCheckedChange={setAutoExtend}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Session Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Session Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">User ID</p>
                <p className="font-mono">{user?.id}</p>
              </div>
              
              <div>
                <p className="text-gray-600">Role</p>
                <p className="capitalize">{user?.role}</p>
              </div>
              
              <div>
                <p className="text-gray-600">Department</p>
                <p>{user?.department || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-gray-600">Position</p>
                <p>{user?.position || 'N/A'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
