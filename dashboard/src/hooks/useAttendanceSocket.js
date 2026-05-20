import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook مخصص لإدارة اتصال الـ WebSocket وتحديث البيانات لحظياً.
 * @param {number} eventId - معرف الفعالية
 * @param {function} onMessage - دالة تُستدعى عند استقبال رسالة جديدة
 */
const useAttendanceSocket = (eventId, onMessage) => {
    const [status, setStatus] = useState('connecting');
    const savedCallback = useRef();
    const wsRef = useRef(null);

    useEffect(() => {
        savedCallback.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        if (!eventId) return;

        let active = true;
        let ws = null;
        let reconnectTimeout = null;

        const connect = () => {
            // Close any existing connection first
            if (wsRef.current) {
                try {
                    wsRef.current.close();
                } catch (e) {
                    console.error("Error closing existing ws", e);
                }
            }

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const defaultWsUrl = `${protocol}//${window.location.host}`;
            const wsBaseUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;
            const wsUrl = `${wsBaseUrl}/ws/${eventId}`;
            ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('Connected to Attendance WebSocket');
                if (active) setStatus('connected');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("WebSocket received:", data); // Debug log
                    if (active && savedCallback.current) {
                        savedCallback.current(data);
                    }
                } catch (err) {
                    console.error("Error parsing WebSocket message:", err);
                }
            };

            ws.onclose = () => {
                console.log('Disconnected from Attendance WebSocket');
                if (active) {
                    setStatus('disconnected');
                    // محاولة إعادة الاتصال بعد 5 ثوانٍ
                    reconnectTimeout = setTimeout(() => {
                        if (active) connect();
                    }, 5000);
                }
            };

            ws.onerror = (err) => {
                console.error('WebSocket Error:', err);
                if (active) setStatus('error');
                ws.close();
            };
        };

        connect();

        return () => {
            active = false;
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (ws) {
                ws.close();
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [eventId]);

    return { socket: wsRef.current, status };
};

export default useAttendanceSocket;
