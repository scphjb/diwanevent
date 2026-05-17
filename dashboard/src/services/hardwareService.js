import api from './api';

const hardwareService = {
  getScannerStatus: async (eventId) => {
    const res = await api.get(`hardware/status/${eventId}`);
    return res.data;
  },
  
  toggleScanner: async (deviceId, status) => {
    const res = await api.post(`hardware/control`, { device_id: deviceId, status });
    return res.data;
  }
};

export default hardwareService;
