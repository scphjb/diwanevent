import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Download, 
  ExternalLink,
  File,
  CheckCircle,
  AlertCircle,
  Upload,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import interactionService from '../services/interactionService';
import api from '../services/api';
import { cn } from '../utils/cn';
import { useEvent } from '../context/EventContext';
import { showSuccess, showError } from '../utils/swal';

const getFullUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1/').replace('/api/v1/', '');
  return `${baseUrl}${url}`;
};

const DocumentsPage = () => {
  const { selectedEventId: eventId } = useEvent();
  const { t } = useTranslation();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: '',
    description: '',
    file_url: '',
    file_type: 'pdf',
    file_size: ''
  });

  useEffect(() => {
    if (eventId) {
      fetchDocuments();
    }
  }, [eventId]);

  const fetchDocuments = async () => {
    try {
      const data = await interactionService.getDocuments(eventId);
      setDocuments(data);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!newDoc.title.trim()) { showError(t('documents.modal.name_required', 'العنوان مطلوب')); return; }
    if (!newDoc.file_url.trim()) { showError(t('documents.modal.url_required', 'الرابط مطلوب')); return; }
    
    try {
      await interactionService.createDocument(eventId, newDoc);
      setShowAddModal(false);
      setNewDoc({ title: '', description: '', file_url: '', file_type: 'pdf', file_size: '' });
      fetchDocuments();
      showSuccess(t('documents.create_success', 'تم إضافة المستند بنجاح'));
    } catch (err) {
      const detail = err.response?.data?.detail;
      showError(t('documents.create_error', 'فشل إضافة المستند'), typeof detail === 'string' ? detail : JSON.stringify(detail) || err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const res = await interactionService.uploadFile(file);
      setNewDoc(prev => ({
        ...prev,
        file_url: res.url,
        file_type: res.type,
        file_size: res.size,
        title: prev.title || file.name.split('.')[0]
      }));
    } catch (err) {
      alert(t('documents.upload_error', 'فشل رفع الملف'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm(t('documents.delete_confirm', 'هل أنت متأكد من حذف هذا المستند؟'))) return;
    try {
      await interactionService.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      alert(t('documents.delete_error', 'فشل الحذف'));
    }
  };

  if (!eventId) {
    return (
      <DashboardLayout activePath="/dashboard/documents">
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-[32px] p-10 max-w-3xl mx-auto backdrop-blur-md">
          <FileText className="w-16 h-16 text-emerald-400/20 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">{t('documents.no_event_selected', 'لم يتم اختيار فعالية')}</h3>
          <p className="text-emerald-400/30 text-sm max-w-md mx-auto">{t('documents.no_event_selected_desc', 'يرجى اختيار فعالية نشطة أو إنشاء فعالية جديدة لإدارة المستندات.')}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePath="/dashboard/documents">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('documents.title', 'مركز المستندات')}</h1>
          <p className="text-emerald-400/50 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {t('documents.subtitle', 'إدارة الملفات والموارد المتاحة للمشاركين')}
          </p>
        </div>
        
        <Button variant="gold" className="flex items-center gap-2 h-14 px-8" onClick={() => setShowAddModal(true)}>
          <Plus className="w-5 h-5" />
          {t('documents.add_btn', 'إضافة مستند جديد')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {documents.map((doc, idx) => (
            <motion.div 
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-[32px] p-6 hover:bg-white/10 transition-all flex flex-col h-full group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-emerald-950 transition-all">
                  <FileText className="w-6 h-6" />
                </div>
                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-xl font-bold text-white mb-2 line-clamp-2" title={doc.title}>{doc.title}</h3>
              <p className="text-emerald-400/40 text-sm mb-6 flex-1 line-clamp-3">{doc.description || t('documents.no_description', 'لا يوجد وصف')}</p>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-amber-500 uppercase">
                    {doc.file_type || 'PDF'}
                  </span>
                  {doc.file_size && (
                    <span className="text-[10px] text-white/20 font-bold">{doc.file_size}</span>
                  )}
                </div>
                
                <a 
                  href={getFullUrl(doc.file_url)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-bold"
                >
                  <span>{t('documents.view', 'عرض')}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {documents.length === 0 && !loading && (
        <div className="text-center py-24 bg-white/5 rounded-[40px] border border-white/10 border-dashed">
          <div className="w-20 h-20 bg-emerald-500/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-emerald-500/20" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">{t('documents.no_docs', 'لا توجد مستندات')}</h3>
          <p className="text-emerald-400/30 max-w-sm mx-auto mb-10">{t('documents.start_desc', 'ابدأ بإضافة ملفات PDF أو روابط لمصادر مفيدة للمشاركين.')}</p>
          <Button variant="outline" className="border-white/10" onClick={() => setShowAddModal(true)}>
             <Plus className="w-5 h-5 ml-2" /> {t('documents.add_btn')}
          </Button>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-emerald-950/40">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#022C22] border border-white/10 rounded-[40px] p-10 w-full max-w-xl shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t('documents.modal.title', 'إضافة مستند')}</h2>
            </div>

            <div className="space-y-6">
              {/* File Upload Area */}
              <div className="relative">
                <label className={cn(
                  "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-[30px] transition-all cursor-pointer group",
                  newDoc.file_url 
                    ? "border-emerald-500/50 bg-emerald-500/5" 
                    : "border-white/10 bg-white/5 hover:border-emerald-500/30 hover:bg-white/10"
                )}>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                  
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                      <span className="text-sm font-bold text-emerald-400">جاري الرفع...</span>
                    </div>
                  ) : newDoc.file_url ? (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                      <span className="text-sm font-black text-white">تم اختيار الملف بنجاح</span>
                      <span className="text-[10px] text-emerald-400/50 uppercase">{newDoc.file_type} • {newDoc.file_size}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-bold text-white block">اختر ملفاً للرفع</span>
                        <span className="text-[10px] text-white/20 uppercase tracking-widest mt-1 block">PDF, Word, Images, etc.</span>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-emerald-100/50">{t('documents.modal.name', 'عنوان المستند')}</label>
                <Input 
                  placeholder={t('documents.modal.name_placeholder', 'مثلاً: حقيبة المتدرب...')} 
                  value={newDoc.title} 
                  onChange={(e) => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-emerald-100/50">{t('documents.modal.desc', 'وصف مختصر')}</label>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none text-emerald-400 font-bold min-h-[100px] focus:border-emerald-500 transition-all"
                  placeholder={t('documents.modal.desc_placeholder', 'اكتب تفاصيل عن الملف...')}
                  value={newDoc.description}
                  onChange={(e) => setNewDoc(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">{t('documents.modal.url', 'رابط الملف')}</label>
                  <Input 
                    placeholder="https://..." 
                    value={newDoc.file_url} 
                    onChange={(e) => setNewDoc(prev => ({ ...prev, file_url: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">{t('documents.modal.type', 'نوع الملف')}</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl h-12 px-4 outline-none text-emerald-400 font-bold"
                    value={newDoc.file_type}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, file_type: e.target.value }))}
                  >
                    <option value="pdf" className="bg-slate-900">PDF</option>
                    <option value="docx" className="bg-slate-900">Word (DOCX)</option>
                    <option value="xlsx" className="bg-slate-900">Excel (XLSX)</option>
                    <option value="link" className="bg-slate-900">رابط خارجي (Link)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button className="flex-1 h-14" variant="gold" onClick={handleCreateDocument}>{t('documents.modal.submit', 'إضافة المستند')}</Button>
                <Button className="flex-1 h-14" variant="outline" onClick={() => setShowAddModal(false)}>{t('common.cancel')}</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DocumentsPage;
