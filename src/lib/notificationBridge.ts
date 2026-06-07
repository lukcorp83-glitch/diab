import { registerPlugin } from '@capacitor/core';

export interface NotificationBridgePlugin {
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<void>;
  requestActiveNotifications(): Promise<void>;
  getGlucoseHistory(): Promise<{ history: string }>;
  addListener(
    eventName: 'glucoseNotificationReceived',
    listenerFunc: (data: { glucose: number; iob: number; package: string }) => void,
  ): Promise<any>;
}

export const NotificationBridge = registerPlugin<NotificationBridgePlugin>('NotificationBridge');
