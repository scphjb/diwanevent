import api from './api';

const sponsorService = {
  getSponsors: async (eventId) => {
    const res = await api.get(`/sponsors/${eventId}`);
    return res.data;
  },
  
  createSponsor: async (data) => {
    const res = await api.post('/sponsors/', data);
    return res.data;
  }
};

export default sponsorService;
