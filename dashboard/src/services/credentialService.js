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
    return `${api.defaults.baseURL}/credentials/badges/secure-download/${token}`;
  },
  
  getCertificateUrl: (token) => {
    return `${api.defaults.baseURL}/credentials/certificates/secure-download/${token}`;
  },

  getCertificatePreviewUrl: (eventId) => {
    return `${api.defaults.baseURL}/credentials/certificates/preview/${eventId}`;
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
