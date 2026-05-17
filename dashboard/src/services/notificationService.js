import api from './api';

const notificationService = {
  getNotifications: async () => {
    const response = await api.get('notifications/');
    return response.data;
  },
  
  markAllAsRead: async () => {
    const response = await api.post('notifications/read-all');
    return response.data;
  },
  
  clearAll: async () => {
    const response = await api.delete('notifications/clear');
    return response.data;
  }
};

export default notificationService;
