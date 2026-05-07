import api from './api';

const analyticsService = {
  getSummary: async (eventId) => {
    const response = await api.get(`/analytics/${eventId}/summary`);
    const data = response.data;
    // Map to expected frontend structure
    return {
      total_invited: data.overview.total_invited,
      present: data.overview.checked_in,
      absent: data.overview.pending,
      percentage: data.overview.attendance_rate
    };
  },
  
  getAttendanceStats: async (eventId) => {
    const response = await api.get(`/analytics/${eventId}/peak-hours`);
    return response.data;
  }
};

export default analyticsService;
