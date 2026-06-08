import { useState, useEffect, useCallback, useRef } from 'react';

export interface ConnectedDevice {
  deviceId: string;
  deviceName: string;
  role: 'master' | 'admin' | 'follower';
  isAdmin: boolean;
}

interface UseGlikoServerProps {
  url?: string;
  roomId?: string;
  deviceId?: string;
  deviceName?: string;
  role?: 'master' | 'admin' | 'follower';
  isAdmin?: boolean;
  onDataReceived?: (data: any) => void;
  onKicked?: () => void;
}

export function useGlikoServer({ 
  url, 
  roomId, 
  deviceId,
  deviceName,
  role = 'follower',
  isAdmin = false,
  onDataReceived,
  onKicked
}: UseGlikoServerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // Zgodnie z decyzją, aplikacja GlikoControl używa głównej, udostępnionej 
  // instancji GlikoServer, unless user explicitly defines a custom one.
  const actualUrl = url || 'wss://glikoserver.onrender.com';

  const connect = useCallback(() => {
    if (!actualUrl || !roomId || !deviceId) return;

    try {
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Automatically format the URL if the user provided http/https instead of ws/wss
      let finalUrl = actualUrl.trim();
      if (finalUrl.startsWith('http://')) finalUrl = finalUrl.replace('http://', 'ws://');
      else if (finalUrl.startsWith('https://')) finalUrl = finalUrl.replace('https://', 'wss://');
      else if (!finalUrl.startsWith('ws://') && !finalUrl.startsWith('wss://')) {
        finalUrl = `wss://${finalUrl}`;
      }

      const ws = new WebSocket(finalUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        // Join the room immediately after connecting
        ws.send(JSON.stringify({ 
          type: 'join', 
          roomId,
          deviceId,
          deviceName: deviceName || 'Nieznane urządzenie',
          role,
          isAdmin
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'glucose_data' && onDataReceived) {
            onDataReceived(data.payload);
          } else if (data.type === 'device_list') {
            setDevices(data.payload || []);
          } else if (data.type === 'kicked') {
            console.warn("Zostałeś rozłączony przez administratora!");
            if (onKicked) onKicked();
            ws.close();
          }
        } catch (e) {
          console.error("GlikoServer parsing error", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        setDevices([]); // clear list on disconnect
        // Auto-reconnect after 5 seconds if we still have a url
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      ws.onerror = (e) => {
        console.error("GlikoServer WebSocket error", e);
        setError("Błąd połączenia z serwerem");
        // onclose will handle reconnect
      };
    } catch (e: any) {
      setError(e.message || "Błąd inicjalizacji WebSocket");
    }
  }, [actualUrl, roomId, deviceId, deviceName, role, isAdmin, onDataReceived, onKicked]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendData = useCallback((payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'glucose_data',
        payload
      }));
      return true;
    }
    return false;
  }, []);

  const kickDevice = useCallback((targetDeviceId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'kick_device',
        targetDeviceId
      }));
    }
  }, []);

  return {
    isConnected,
    error,
    devices,
    sendData,
    kickDevice
  };
}
