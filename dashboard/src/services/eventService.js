import api from './api';

const eventService = {
  getEvents: async () => {
    const response = await api.get('/events/');
    return response.data;
  },

  getEventSettings: async (eventId) => {
    const response = await api.get(`/events/${eventId}`);
    return response.data;
  },

  updateEventSettings: async (eventId, data) => {
    const response = await api.patch(`/events/${eventId}`, data);
    return response.data;
  },

  uploadLogo: async (eventId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/events/${eventId}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};

export default eventService;
