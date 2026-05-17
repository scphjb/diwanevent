import api from './api';

const networkingService = {
  // Profile
  getMyProfile:           ()           => api.get('networking/profile/me').then(r => r.data),
  updateMyProfile:        (data)       => api.patch('networking/profile/me', data).then(r => r.data),
  getParticipantProfile:  (id)         => api.get(`networking/profile/${id}`).then(r => r.data),

  // Directory
  getDirectory: (eventId, params = {}) =>
    api.get('networking/directory', { params: { event_id: eventId, ...params } }).then(r => r.data),

  // Recommendations
  getRecommendations: (eventId) =>
    api.get('networking/recommendations', { params: { event_id: eventId } }).then(r => r.data),

  // Connections
  sendConnectionRequest: (targetId, message = '', viaQr = false) =>
    api.post(`networking/connect/${targetId}`, null, { params: { message, via_qr: viaQr } }).then(r => r.data),

  quickConnectViaQR: (scannedQr, location = null) =>
    api.post('networking/connect/qr-scan', null, { params: { scanned_qr: scannedQr, location } }).then(r => r.data),

  respondToRequest: (connectionId, action) =>
    api.patch(`networking/connect/${connectionId}/respond`, null, { params: { action } }).then(r => r.data),

  getConnections: () => api.get('networking/connections').then(r => r.data),

  // Messages
  getChatHistory: (connectionId, skip = 0) =>
    api.get(`networking/chat/${connectionId}`, { params: { skip } }).then(r => r.data),

  sendMessage: (connectionId, content) =>
    api.post(`networking/chat/${connectionId}`, null, { params: { content } }).then(r => r.data),

  getUnreadCount: () => api.get('networking/chat/unread-count').then(r => r.data),

  // Meetings
  proposeMeeting: (connectionId, data) =>
    api.post('networking/meetings/propose', null, { params: { connection_id: connectionId, ...data } }).then(r => r.data),

  respondToMeeting: (meetingId, action, counterTime = null) =>
    api.patch(`networking/meetings/${meetingId}/respond`, null, { params: { action, counter_time: counterTime } }).then(r => r.data),

  getMySchedule: () => api.get('networking/meetings/my-schedule').then(r => r.data),

  // vCard
  downloadVCard: (participantId) =>
    api.get(`networking/vcard/${participantId}`, { responseType: 'blob' }).then(r => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contact_${participantId}.vcf`;
      a.click();
    }),

  // Admin Analytics
  getNetworkingAnalytics: (eventId) =>
    api.get(`networking/admin/analytics/${eventId}`).then(r => r.data),
};

export default networkingService;
