import api from './api';

const agendaService = {
  getSessions: async (eventId) => {
    const response = await api.get('sessions/', {
      params: { event_id: eventId }
    });
    return response.data;
  },

  // ✅ event_id كـ query param منفصل كما يتوقعه الـ backend
  createSession: async (eventId, data) => {
    const response = await api.post('sessions/', data, {
      params: { event_id: eventId }
    });
    return response.data;
  },

  updateSession: async (eventId, sessionId, data) => {
    const response = await api.patch(`sessions/${eventId}/${sessionId}`, data, {
      params: { event_id: eventId }
    });
    return response.data;
  },

  deleteSession: async (eventId, sessionId) => {
    const response = await api.delete(`sessions/${eventId}/${sessionId}`, {
      params: { event_id: eventId }
    });
    return response.data;
  }
};

export default agendaService;
