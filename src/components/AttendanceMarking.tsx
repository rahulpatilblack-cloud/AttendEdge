import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Clock, MapPin, CheckCircle, XCircle, Calendar, Settings } from 'lucide-react';
import { format } from 'date-fns';

const AttendanceMarking: React.FC = () => {
  const { user } = useAuth();
  const { todayAttendance, checkIn, checkOut, isLoading } = useAttendance();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualTime, setManualTime] = useState(format(new Date(), 'HH:mm'));

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location error:', error);
          setLocation(null);
        }
      );
    }
  };

  const handleCheckIn = async () => {
    getCurrentLocation();
    
    let checkInTime;
    if (manualEntry) {
      checkInTime = new Date(`${manualDate}T${manualTime}`);
    } else {
      checkInTime = new Date();
    }

    const success = await checkIn(checkInTime);
    if (success) {
      toast({
        title: "Check-in Successful",
        description: `Checked in at ${format(checkInTime, 'HH:mm')}${manualEntry ? ' (Manual Entry)' : ''}`,
      });
    } else {
      toast({
        title: "Check-in Failed",
        description: "Unable to check in. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCheckOut = async () => {
    getCurrentLocation();
    
    let checkOutTime;
    if (manualEntry) {
      checkOutTime = new Date(`${manualDate}T${manualTime}`);
    } else {
      checkOutTime = new Date();
    }

    const success = await checkOut(checkOutTime);
    if (success) {
      toast({
        title: "Check-out Successful",
        description: `Checked out at ${format(checkOutTime, 'HH:mm')}${manualEntry ? ' (Manual Entry)' : ''}`,
      });
    } else {
      toast({
        title: "Check-out Failed",
        description: "Unable to check out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getWorkingHours = () => {
    if (!todayAttendance?.check_in_time) return '0h 0m';
    const startTime = new Date(todayAttendance.check_in_time);
    const endTime = todayAttendance.check_out_time ? new Date(todayAttendance.check_out_time) : new Date();
    const diffMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const isCheckedIn = todayAttendance?.check_in_time && !todayAttendance?.check_out_time;
  const isCheckedOut = todayAttendance?.check_in_time && todayAttendance?.check_out_time;

  return (
    <Card className="gradient-primary text-white shadow-xl border-0">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Quick Clock In/Out</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Manual Entry Toggle */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-100">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-blue-600" />
            <Label htmlFor="manual-entry" className="text-sm font-medium text-gray-700">Manual Entry</Label>
          </div>
          <Switch
            id="manual-entry"
            checked={manualEntry}
            onCheckedChange={setManualEntry}
          />
        </div>

        {/* Manual Entry Fields */}
        {manualEntry && (
          <div className="space-y-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="manual-date" className="text-sm font-medium text-gray-700">Date</Label>
                <Input
                  id="manual-date"
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="manual-time" className="text-sm font-medium text-gray-700">Time</Label>
                <Input
                  id="manual-time"
                  type="time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs text-blue-700 bg-blue-100 p-2 rounded">
              <span className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">!</span>
              <span>Manual entries are logged for audit purposes</span>
            </div>
          </div>
        )}

        {/* Status Display */}
        <div className="text-center">
          {!todayAttendance?.check_in_time ? (
            <div className="flex flex-col items-center space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center animate-pulse">
                <Clock className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <p className="text-gray-700 font-medium">Ready to Check In</p>
                <p className="text-sm text-gray-500">Start your workday</p>
              </div>
            </div>
          ) : isCheckedIn ? (
            <div className="flex flex-col items-center space-y-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
              <div className="w-14 h-14 bg-green-200 rounded-full flex items-center justify-center animate-pulse">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-green-700 font-semibold">Currently Working</p>
                <p className="text-sm text-green-600">
                  Since {format(new Date(todayAttendance.check_in_time), 'HH:mm')}
                </p>
                <p className="text-sm font-medium text-green-700 mt-1">Working: {getWorkingHours()}</p>
              </div>
            </div>
          ) : isCheckedOut ? (
            <div className="flex flex-col items-center space-y-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
              <div className="w-14 h-14 bg-blue-200 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-blue-700 font-semibold">Day Completed</p>
                <p className="text-sm text-blue-600">
                  {format(new Date(todayAttendance.check_in_time), 'HH:mm')} - {format(new Date(todayAttendance.check_out_time), 'HH:mm')}
                </p>
                <p className="text-sm font-medium text-blue-700 mt-1">Total: {getWorkingHours()}</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Action Button */}
        <div className="text-center">
          {!todayAttendance?.check_in_time ? (
            <Button
              onClick={handleCheckIn}
              disabled={isLoading}
              variant="gradient"
              className="w-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              size="lg"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {manualEntry ? 'Check In (Manual)' : 'Check In'}
            </Button>
          ) : isCheckedIn ? (
            <Button
              onClick={handleCheckOut}
              disabled={isLoading}
              variant="gradient"
              className="w-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              size="lg"
            >
              <XCircle className="w-5 h-5 mr-2" />
              {manualEntry ? 'Check Out (Manual)' : 'Check Out'}
            </Button>
          ) : (
            <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-gray-700 font-medium">Day Completed Successfully</p>
              </div>
            </div>
          )}
        </div>

        {/* Location Info */}
        {location && (
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 bg-gray-50 p-2 rounded-lg">
            <MapPin className="w-4 h-4 text-green-600" />
            <span>Location recorded successfully</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceMarking;
