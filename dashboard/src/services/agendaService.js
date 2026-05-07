import api from './api';

const agendaService = {
  getSessions: async (eventId) => {
    const response = await api.get('/sessions/', {
      params: { event_id: eventId }
    });
    return response.data;
  },

  createSession: async (data) => {
    const response = await api.post('/sessions/', data);
    return response.data;
  },

  updateSession: async (id, data) => {
    const response = await api.patch(`/sessions/${id}`, data);
    return response.data;
  },

  deleteSession: async (id) => {
    const response = await api.delete(`/sessions/${id}`);
    return response.data;
  }
};

export default agendaService;
