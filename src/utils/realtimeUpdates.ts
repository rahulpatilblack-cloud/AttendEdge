interface RealtimeEvent {
  type: string;
  data: any;
  timestamp: number;
  userId?: string;
}

class RealtimeUpdates {
  private listeners: Map<string, Set<(event: RealtimeEvent) => void>> = new Map();
  private isListening = false;

  // Subscribe to specific event types
  subscribe(eventType: string, callback: (event: RealtimeEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Start listening to localStorage events
    if (!this.isListening) {
      this.startListening();
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  // Publish an event
  publish(eventType: string, data: any, userId?: string) {
    const event: RealtimeEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
      userId
    };

    // Store in localStorage for cross-tab communication
    try {
      localStorage.setItem(`realtime_${eventType}`, JSON.stringify(event));
      
      // Trigger local listeners
      this.notifyListeners(event);
      
      // Clean up after a short delay
      setTimeout(() => {
        localStorage.removeItem(`realtime_${eventType}`);
      }, 1000);
    } catch (error) {
      console.error('Failed to publish realtime event:', error);
    }
  }

  private startListening() {
    this.isListening = true;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('realtime_')) {
        const eventType = e.key.replace('realtime_', '');
        try {
          const event = JSON.parse(e.newValue || '{}');
          this.notifyListeners(event);
        } catch (error) {
          console.error('Failed to parse realtime event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
  }

  private notifyListeners(event: RealtimeEvent) {
    const callbacks = this.listeners.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in realtime callback:', error);
        }
      });
    }
  }

  // Convenience methods for common events
  notifyLeaveUpdate(leaveId: string, status: string, userId?: string) {
    this.publish('leave_update', { leaveId, status }, userId);
  }

  notifyAllocationUpdate(allocationId: string, hours: number, userId?: string) {
    this.publish('allocation_update', { allocationId, hours }, userId);
  }

  notifyUserAction(action: string, resource: string, details: any, userId?: string) {
    this.publish('user_action', { action, resource, details }, userId);
  }

  notifyDataRefresh(resource: string, userId?: string) {
    this.publish('data_refresh', { resource }, userId);
  }
}

export const realtimeUpdates = new RealtimeUpdates();

// React hook for easier usage
export const useRealtimeUpdates = () => {
  const subscribe = (eventType: string, callback: (event: RealtimeEvent) => void) => {
    return realtimeUpdates.subscribe(eventType, callback);
  };

  const notifyLeaveUpdate = (leaveId: string, status: string) => {
    const userId = localStorage.getItem('user_id') || 'anonymous';
    realtimeUpdates.notifyLeaveUpdate(leaveId, status, userId);
  };

  const notifyAllocationUpdate = (allocationId: string, hours: number) => {
    const userId = localStorage.getItem('user_id') || 'anonymous';
    realtimeUpdates.notifyAllocationUpdate(allocationId, hours, userId);
  };

  const notifyDataRefresh = (resource: string) => {
    const userId = localStorage.getItem('user_id') || 'anonymous';
    realtimeUpdates.notifyDataRefresh(resource, userId);
  };

  return {
    subscribe,
    notifyLeaveUpdate,
    notifyAllocationUpdate,
    notifyDataRefresh,
    publish: realtimeUpdates.publish.bind(realtimeUpdates)
  };
};
