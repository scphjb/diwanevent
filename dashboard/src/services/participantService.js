import api from './api';

const participantService = {
  getParticipants: async (eventId, params = {}) => {
    const response = await api.get('participants/', {
      params: { event_id: eventId, ...params }
    });
    // Return the response as is to allow pages to access 'total' and 'items'
    return response.data;
  },

  publicSearch: async (eventId, query) => {
    const response = await api.get('participants/search', {
      params: { event_id: eventId, q: query }
    });
    return response.data;
  },

  analyzeImport: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('participants/analyze-import', formData);
    return response.data;
  },

  importExcel: async (eventId, file, mapping) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    
    const response = await api.post(`participants/import?event_id=${eventId}`, formData);
    return response.data;
  },

  updateParticipant: async (id, data) => {
    const response = await api.patch(`participants/${id}`, data);
    return response.data;
  },

  checkIn: async (id, locationId = null) => {
    const response = await api.patch(`participants/${id}/check-in`, null, {
      params: { location_id: locationId }
    });
    return response.data;
  },

  undoCheckIn: async (id) => {
    const response = await api.patch(`participants/${id}/undo-check-in`);
    return response.data;
  },

  registerParticipant: async (data) => {
    const response = await api.post('participants/register', null, { params: data });
    return response.data;
  },

  getParticipantByQR: async (qrCode, eventId) => {
    const response = await api.get(`participants/qr/${qrCode}`, {
      params: { event_id: eventId }
    });
    return response.data;
  },

  getParticipant: async (id) => {
    const response = await api.get(`participants/${id}`);
    return response.data;
  },

  printBadge: async (participantId) => {
    let backendBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8000/api/v1';
    // في الإنتاج، نتجنب استخدام localhost إذا كان الفرونت إند يعمل على السيرفر
    if (!import.meta.env.DEV && backendBase.includes('localhost')) {
      backendBase = window.location.origin + '/api/v1';
    }
    const url = `${backendBase}/credentials/badges/print/${participantId}`;
    window.open(url, '_blank');
  },

  downloadCertificate: async (participantId) => {
    let backendBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8000/api/v1';
    if (!import.meta.env.DEV && backendBase.includes('localhost')) {
      backendBase = window.location.origin + '/api/v1';
    }
    const url = `${backendBase}/credentials/certificates/download/${participantId}`;
    window.open(url, '_blank');
  }
};

export default participantService;
