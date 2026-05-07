import api from './api';

const interactionService = {
  // Social Posts
  getPosts: async (eventId) => {
    const res = await api.get(`/interaction/posts/${eventId}/approved`);
    return res.data;
  },
  
  createPost: async (postData) => {
    const res = await api.post('/interaction/posts', postData);
    return res.data;
  },
  
  // Gamification
  getLeaderboard: async (eventId, limit = 10) => {
    const res = await api.get(`/interaction/leaderboard/${eventId}`, { params: { limit } });
    return res.data;
  },
  
  // Q&A
  getQuestions: async (eventId) => {
    const res = await api.get(`/interaction/questions/${eventId}`);
    return res.data;
  }
};

export default interactionService;
