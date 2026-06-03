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

  uploadPostImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('social/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
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

  upvoteQuestion: async (qId) => {
    const res = await api.post(`interaction/questions/${qId}/upvote`);
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
  },

  // Logistics & Accommodations
  getLogistics: async (participantId) => {
    const res = await api.get(`interaction/logistics/${participantId}`);
    return res.data;
  },
  
  saveLogistics: async (logisticsData) => {
    const res = await api.post('interaction/logistics', logisticsData);
    return res.data;
  },
  
  dispatchLogistics: async (participantId, dispatchData) => {
    const res = await api.patch(`interaction/logistics/dispatch/${participantId}`, dispatchData);
    return res.data;
  },
  
  listEventLogistics: async (eventId) => {
    const res = await api.get(`interaction/logistics/event/${eventId}`);
    return res.data;
  },

  // Sideline Activities & Excursions
  listActivities: async (eventId, participantId) => {
    const params = participantId ? { participant_id: participantId } : {};
    const res = await api.get(`interaction/activities/${eventId}`, { params });
    return res.data;
  },

  registerActivity: async (activityId, participantId) => {
    const res = await api.post('interaction/activities/register', {
      activity_id: activityId,
      participant_id: participantId
    });
    return res.data;
  },

  unregisterActivity: async (activityId, participantId) => {
    const res = await api.delete(`interaction/activities/unregister/${activityId}/${participantId}`);
    return res.data;
  },

  // Smart Catering & Dietary Planner
  getCateringProfile: async (participantId) => {
    const res = await api.get(`interaction/catering/${participantId}`);
    return res.data;
  },

  saveCateringProfile: async (cateringData) => {
    const res = await api.post('interaction/catering', cateringData);
    return res.data;
  },

  listEventMeals: async (eventId, participantId) => {
    const params = participantId ? { participant_id: participantId } : {};
    const res = await api.get(`interaction/meals/${eventId}`, { params });
    return res.data;
  },

  toggleMealRsvp: async (mealId, participantId, attending, dietaryPreference = null) => {
    const res = await api.post('interaction/meals/rsvp', {
      meal_id: mealId,
      participant_id: participantId,
      attending: attending,
      dietary_preference: dietaryPreference
    });
    return res.data;
  },

  createMeal: async (mealData) => {
    const res = await api.post('interaction/meals/create', mealData);
    return res.data;
  },

  createActivity: async (activityData) => {
    const res = await api.post('interaction/activities/create', activityData);
    return res.data;
  },

  listEventCateringProfiles: async (eventId) => {
    const res = await api.get(`interaction/catering/event/${eventId}`);
    return res.data;
  },

  getActivityRegistrations: async (activityId) => {
    const res = await api.get(`interaction/activities/registrations/${activityId}`);
    return res.data;
  },

  // Committee Task Delegation
  listTasks: async (eventId, committee = null) => {
    const params = committee ? { committee } : {};
    const res = await api.get(`interaction/tasks/${eventId}`, { params });
    return res.data;
  },

  createTask: async (taskData) => {
    const res = await api.post('interaction/tasks/create', taskData);
    return res.data;
  },

  updateTaskStatus: async (taskId, status) => {
    const res = await api.patch(`interaction/tasks/${taskId}/status`, { status });
    return res.data;
  },

  deleteTask: async (taskId) => {
    const res = await api.delete(`interaction/tasks/${taskId}`);
    return res.data;
  },

  updateMeal: async (mealId, mealData) => {
    const res = await api.patch(`interaction/meals/${mealId}`, mealData);
    return res.data;
  },

  deleteMeal: async (mealId) => {
    const res = await api.delete(`interaction/meals/${mealId}`);
    return res.data;
  },

  updateActivity: async (activityId, activityData) => {
    const res = await api.patch(`interaction/activities/${activityId}`, activityData);
    return res.data;
  },

  deleteActivity: async (activityId) => {
    const res = await api.delete(`interaction/activities/${activityId}`);
    return res.data;
  },
};

export default interactionService;
