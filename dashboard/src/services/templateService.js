import api from './api';

const templateService = {
  // ── CRUD القوالب ──────────────────────────────────────────────────
  createTemplate: (data) => api.post('templates/', data).then(r => r.data),
  
  listTemplates: (params = {}) => api.get('templates/', { params }).then(r => r.data),
  
  updateTemplate: (id, data) => api.put(`templates/${id}`, data).then(r => r.data),
  
  deleteTemplate: (id) => api.delete(`templates/${id}`).then(r => r.data),

  // ── معاينة PDF ────────────────────────────────────────────────────
  previewPdf: async (designJson, type = 'badge', sampleParticipant = null) => {
    const res = await api.post('templates/preview-pdf', {
      design_json: JSON.stringify(designJson),
      type,
      sample_participant: sampleParticipant || {
        full_name: 'أحمد بن محمد المثال',
        council: 'محكمة عنابة الابتدائية',
        court: 'قسم التنفيذ',
        role: 'محضر قضائي',
        order_num: 'DWN-PREVIEW',
        seat_info: 'قاعة A - مقعد 15',
        event_name: 'الجمعية العامة 2026',
        event_date: '23 أبريل 2026',
        event_location: 'فندق شيراتون',
      }
    }, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
  },

  // ── طباعة (جماعية أو فردية) ──────────────────────────────────────
  printAll: async (templateId, eventId, participantId = null) => {
    const params = { event_id: eventId };
    if (participantId) params.participant_id = participantId;
    
    const res = await api.post(`templates/${templateId}/print`, null, {
      params,
      responseType: 'blob',
    });
    return URL.createObjectURL(res.data);
  },
};

export default templateService;
