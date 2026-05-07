import api from './api';

const credentialService = {
  saveBadgeDesign: async (eventId, elementsConfig) => {
    const res = await api.post('/credentials/badges/design', { event_id: eventId, elements_config: elementsConfig });
    return res.data;
  },
  
  getPrintUrl: (participantId) => {
    // Return absolute URL for the print iframe or direct download
    return `${api.defaults.baseURL}/credentials/badges/print/${participantId}`;
  },
  
  getCertificateUrl: (participantId) => {
    return `${api.defaults.baseURL}/credentials/certificates/download/${participantId}`;
  }
};

export default credentialService;
