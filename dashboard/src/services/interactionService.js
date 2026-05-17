import api from './api';

const interactionService = {
  // Social Posts
  getPosts: async (eventId) => {
    const res = await api.get(`social/${eventId}/approved`);
    return res.data;
  },
  
  createPost: async (postData) => {
    const res = await api.post('social/', postData);
    return res.data;
  },
  
  // Gamification
  getLeaderboard: async (eventId, limit = 10) => {
    const res = await api.get(`interaction/leaderboard/${eventId}`, { params: { limit } });
    return res.data;
  },
  
  // Q&A
  getQuestions: async (eventId) => {
    const res = await api.get(`interaction/questions/${eventId}`);
    return res.data;
  },
  
  createQuestion: async (questionData) => {
    const res = await api.post('interaction/questions/', questionData);
    return res.data;
  },
  
  pinQuestion: async (qId, pinned) => {
    const res = await api.patch(`interaction/questions/${qId}/pin`, null, { params: { pinned } });
    return res.data;
  },

  getPinnedQuestion: async (eventId) => {
    const res = await api.get(`interaction/questions/${eventId}/pinned`);
    return res.data;
  },

  getDocuments: async (eventId) => {
    const res = await api.get(`interaction/events/${eventId}/documents`);
    return res.data;
  },
  
  createDocument: async (eventId, docData) => {
    const res = await api.post(`interaction/events/${eventId}/documents`, docData);
    return res.data;
  },

  deleteDocument: async (docId) => {
    const res = await api.delete(`interaction/documents/${docId}`);
    return res.data;
  },

  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('interaction/upload-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  deleteQuestion: async (qId) => {
    const res = await api.delete(`interaction/questions/${qId}`);
    return res.data;
  },

  // Polls
  getActivePolls: async (eventId) => {
    const res = await api.get(`polls/${eventId}/active`);
    return res.data;
  },

  submitVote: async (pollId, optionId, participantId) => {
    const res = await api.post('polls/vote', null, {
      params: { poll_id: pollId, option_id: optionId, participant_id: participantId }
    });
    return res.data;
  }
};

export default interactionService;
