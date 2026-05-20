import api from './api';

const eventService = {
  getEvents: async () => {
    const response = await api.get('events/');
    return response.data;
  },

  getEventSettings: async (eventId) => {
    const response = await api.get(`events/${eventId}`);
    return response.data;
  },

  updateEventSettings: async (eventId, data) => {
    const response = await api.patch(`events/${eventId}`, data);
    return response.data;
  },

  uploadLogo: async (eventId, file) => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await api.post(`events/${eventId}/logo`, formData);
    return response.data;
  },

  getPublicActiveEvents: async () => {
    const response = await api.get('events/public/active');
    return response.data;
  },

  // BUG 2 FIX: حذف فعالية مع بياناتها المرتبطة
  deleteEvent: async (eventId) => {
    const response = await api.delete(`events/${eventId}`);
    return response.data;
  }
};

export default eventService;
