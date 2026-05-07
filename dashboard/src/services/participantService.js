import api from './api';

const participantService = {
  getParticipants: async (eventId, params = {}) => {
    const response = await api.get('/participants/', {
      params: { event_id: eventId, ...params }
    });
    return response.data;
  },

  importExcel: async (eventId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('event_id', eventId);
    
    const response = await api.post('/participants/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateParticipant: async (id, data) => {
    const response = await api.patch(`/participants/${id}`, data);
    return response.data;
  },

  checkIn: async (id) => {
    const response = await api.patch(`/participants/${id}/check-in`);
    return response.data;
  },

  registerParticipant: async (data) => {
    const response = await api.post('/participants/register', null, { params: data });
    return response.data;
  },

  getParticipantByQR: async (qrCode) => {
    const response = await api.get(`/participants/qr/${qrCode}`);
    return response.data;
  },

  getParticipant: async (id) => {
    const response = await api.get(`/participants/${id}`);
    return response.data;
  },

  printBadge: async (participantId) => {
    // We open the PDF in a new tab for printing
    const url = `${api.defaults.baseURL}/credentials/badges/print/${participantId}`;
    window.open(url, '_blank');
  }
};

export default participantService;
