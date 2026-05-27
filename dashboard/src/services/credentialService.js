import api from './api';

const credentialService = {
  saveBadgeDesign: async (eventId, data) => {
    const res = await api.post('credentials/badges/design', { 
      event_id: eventId, 
      ...data
    });
    return res.data;
  },

  
  getBadgeDesign: async (eventId) => {
    const res = await api.get(`credentials/badges/design/${eventId}`);
    return res.data;
  },
  
  getBadgeUrl: (token) => {
    const baseURL = api.defaults.baseURL || '/api/v1/';
    const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    return `${base}/credentials/badges/secure-download/${token}`;
  },
  
  getCertificateUrl: (token) => {
    const baseURL = api.defaults.baseURL || '/api/v1/';
    const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    return `${base}/credentials/certificates/secure-download/${token}`;
  },

  getCertificatePreviewUrl: (eventId) => {
    const baseURL = api.defaults.baseURL || '/api/v1/';
    const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    return `${base}/credentials/certificates/preview/${eventId}`;
  },

  saveCertificateDesign: async (eventId, data) => {
    const res = await api.post('credentials/certificates/design', { 
      event_id: eventId, 
      ...data
    });
    return res.data;
  },

  getCertificateDesign: async (eventId) => {
    const res = await api.get(`credentials/certificates/design/${eventId}`);
    return res.data;
  },
};

export default credentialService;
