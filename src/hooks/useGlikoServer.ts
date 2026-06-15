import { useState, useEffect, useCallback, useRef } from 'react';
import i18n from "../i18n";

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
  const reconnectAttemptsRef = useRef(0);
  const callbacksRef = useRef({ onDataReceived, onKicked });

  useEffect(() => {
    callbacksRef.current = { onDataReceived, onKicked };
  }, [onDataReceived, onKicked]);

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
        reconnectAttemptsRef.current = 0; // reset attempts on success
        // Join the room immediately after connecting
        ws.send(JSON.stringify({ 
          type: 'join', 
          roomId,
          deviceId,
          deviceName: deviceName || i18n.t('auto.nieznane_urzadzenie', { defaultValue: i18n.t('auto.nieznane_urzadzenie', { defaultValue: "Nieznane urządzenie" }) }),
          role,
          isAdmin
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'glucose_data' && callbacksRef.current.onDataReceived) {
            callbacksRef.current.onDataReceived(data.payload);
          } else if (data.type === 'device_list') {
            setDevices(data.payload || []);
          } else if (data.type === 'kicked') {
            console.warn(i18n.t('auto.zostales_rozlaczony_przez_admi', { defaultValue: i18n.t('auto.zostales_rozlaczony_przez', { defaultValue: "Zostałeś rozłączony przez administratora!" }) }));
            if (callbacksRef.current.onKicked) callbacksRef.current.onKicked();
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
        
        // Exponential backoff: 5s, 10s, 20s, up to 60s max
        const backoff = Math.min(5000 * Math.pow(2, reconnectAttemptsRef.current), 60000);
        reconnectAttemptsRef.current += 1;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoff);
      };

      ws.onerror = (e) => {
        console.error("GlikoServer WebSocket error", e);
        setError(i18n.t('auto.blad_polaczenia_z_serwerem', { defaultValue: i18n.t('auto.blad_polaczenia_z_serwere', { defaultValue: "Błąd połączenia z serwerem" }) }));
        // onclose will handle reconnect
      };
    } catch (e: any) {
      setError(e.message || i18n.t('auto.blad_inicjalizacji_websocket', { defaultValue: i18n.t('auto.blad_inicjalizacji_websoc', { defaultValue: "Błąd inicjalizacji WebSocket" }) }));
    }
  }, [actualUrl, roomId, deviceId, deviceName, role, isAdmin]);

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
