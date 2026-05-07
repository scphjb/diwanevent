import { useState, useEffect, useCallback } from 'react';

/**
 * Hook مخصص لإدارة اتصال الـ WebSocket وتحديث البيانات لحظياً.
 * @param {number} eventId - معرف الفعالية
 * @param {function} onMessage - دالة تُستدعى عند استقبال رسالة جديدة
 */
const useAttendanceSocket = (eventId, onMessage) => {
    const [socket, setSocket] = useState(null);
    const [status, setStatus] = useState('connecting');

    const connect = useCallback(() => {
        const wsBaseUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8000`;
        const wsUrl = `${wsBaseUrl}/ws/${eventId}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Connected to Attendance WebSocket');
            setStatus('connected');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (onMessage) onMessage(data);
        };

        ws.onclose = () => {
            console.log('Disconnected from Attendance WebSocket');
            setStatus('disconnected');
            // محاولة إعادة الاتصال بعد 5 ثوانٍ
            setTimeout(connect, 5000);
        };

        ws.onerror = (err) => {
            console.error('WebSocket Error:', err);
            setStatus('error');
            ws.close();
        };

        setSocket(ws);
    }, [eventId, onMessage]);

    useEffect(() => {
        if (eventId) {
            connect();
        }
        return () => {
            if (socket) socket.close();
        };
    }, [eventId]);

    return { socket, status };
};

export default useAttendanceSocket;
