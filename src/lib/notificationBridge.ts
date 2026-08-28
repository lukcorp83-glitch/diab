import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NotificationBridgePlugin {
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<void>;
  requestActiveNotifications(): Promise<void>;
  getGlucoseHistory(): Promise<{ history: string }>;
  updateForegroundNotification(options: { title: string, text: string }): Promise<void>;
  startLiveTimer(options: { targetTime: number; title?: string; text?: string; id?: number }): Promise<void>;
  stopLiveTimer(options?: { id?: number }): Promise<void>;
  addListener(
    eventName: 'glucoseNotificationReceived',
    listenerFunc: (data: { glucose: number; iob: number; package: string }) => void,
  ): Promise<any>;
}

export const NotificationBridge: any = Capacitor.Plugins?.NotificationBridge || registerPlugin<NotificationBridgePlugin>('NotificationBridge');

