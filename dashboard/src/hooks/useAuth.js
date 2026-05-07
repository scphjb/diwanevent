import { useState, useEffect } from 'react';
import api from '../services/api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentEventId, setCurrentEventId] = useState(
    parseInt(localStorage.getItem('current_event_id')) || 1
  );

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('diwan_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch (err) {
        console.error("Auth check failed", err);
        localStorage.removeItem('diwan_token');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const switchEvent = (id) => {
    localStorage.setItem('current_event_id', id);
    setCurrentEventId(id);
    window.location.reload(); // Hard reload to clear all states
  };

  return { 
    user, 
    loading, 
    isAdmin: user?.role === 'super_admin',
    currentEventId,
    switchEvent
  };
};
