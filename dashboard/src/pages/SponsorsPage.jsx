import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  Heart, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Award,
  Image as ImageIcon,
  Check,
  Search,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../services/api';
import { cn } from '../utils/cn';
import { useEvent } from '../context/EventContext';
import Swal, { showSuccess, showError, showConfirm } from '../utils/swal';
import { getImageUrl } from '../utils/image';

const SponsorsPage = () => {
  const { selectedEventId: eventId } = useEvent();
  const { t } = useTranslation();
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSponsor, setNewSponsor] = useState({
    name: '',
    tier: 'gold',
    type: 'sponsor', // new field
    website_url: '',
    display_duration: 8
  });
  const [logoFile, setLogoFile] = useState(null);

  const [editingSponsor, setEditingSponsor] = useState(null);

  useEffect(() => {
    if (eventId) {
      fetchSponsors();
    }
  }, [eventId]);

  const fetchSponsors = async () => {
    try {
      const response = await api.get(`sponsors/${eventId}`);
      setSponsors(response.data);
    } catch (err) {
      console.error("Failed to fetch sponsors");
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpen = (sponsor) => {
    setEditingSponsor(sponsor);
    setNewSponsor({
      name: sponsor.name,
      tier: sponsor.tier,
      type: sponsor.type || 'sponsor',
      website_url: sponsor.website_url || '',
      display_duration: sponsor.display_duration || 8
    });
    setLogoFile(null);
    setShowAddModal(true);
  };

  const handleCreateSponsor = async () => {
    if (!newSponsor.name || (!editingSponsor && !logoFile)) return;
    if (!eventId) {
      alert(t('common.no_event_selected', 'يرجى اختيار فعالية أولاً'));
      return;
    }
    
    const formData = new FormData();
    formData.append('name', newSponsor.name);
    formData.append('tier', newSponsor.tier);
    formData.append('type', newSponsor.type);
    if (newSponsor.website_url) {
      formData.append('website_url', newSponsor.website_url);
    }
    formData.append('display_duration', newSponsor.display_duration);
    if (logoFile) formData.append('logo', logoFile);

    try {
      if (editingSponsor) {
        await api.put(`sponsors/${eventId}/${editingSponsor.id}`, formData);
      } else {
        await api.post(`sponsors/?event_id=${eventId}`, formData);
      }
      setShowAddModal(false);
      setEditingSponsor(null);
      setNewSponsor({ name: '', tier: 'gold', type: 'sponsor', website_url: '', display_duration: 8 });
      setLogoFile(null);
      fetchSponsors();
      showSuccess(t('sponsors.save_success', 'تم حفظ البيانات بنجاح ✅'));
    } catch (err) {
      showError(t('sponsors.save_error', 'فشل حفظ البيانات'));
    }
  };

  const handleDelete = async (sponsorId) => {
    try {
      const result = await showConfirm(
        t('sponsors.delete_confirm_title', 'حذف الراعي'),
        t('sponsors.delete_confirm', 'هل أنت متأكد من حذف هذا الراعي؟')
      );
      
      if (result.isConfirmed) {
        await api.delete(`sponsors/${eventId}/${sponsorId}`);
        fetchSponsors();
        showSuccess(t('sponsors.delete_success', 'تم حذف الراعي بنجاح'));
      }
    } catch (err) {
      showError(t('sponsors.delete_error', 'فشل الحذف'));
    }
  };

  const tierColors = {
    platinum: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    gold: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    silver: 'text-slate-400 bg-slate-500/10 border-slate-500/20'
  };

  return (
    <DashboardLayout activePath="/dashboard/sponsors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('sponsors.title', 'شركاء النجاح')}</h1>
          <p className="text-brand-secondary/50 flex items-center gap-2">
            <Heart className="w-4 h-4" />
            {t('sponsors.subtitle', 'إدارة الرعاة والشركاء الرسميين للفعالية')}
          </p>
        </div>
        
        <Button variant="gold" className="flex items-center gap-2 h-14 px-8" onClick={() => { setEditingSponsor(null); setNewSponsor({ name: '', tier: 'gold', type: 'sponsor', website_url: '', display_duration: 8 }); setShowAddModal(true); }}>
          <Plus className="w-5 h-5" />
          {t('sponsors.add_btn', 'إضافة راع جديد')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatePresence>
          {sponsors.map((sponsor, idx) => (
            <motion.div 
              key={sponsor.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-[32px] p-6 group hover:bg-white/10 transition-all flex flex-col"
            >
              <div className="aspect-square rounded-2xl bg-white/5 mb-6 overflow-hidden flex items-center justify-center p-4 border border-white/5">
                <img src={getImageUrl(sponsor.logo_url)} alt={sponsor.name} className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-2">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black uppercase border", tierColors[sponsor.tier] || tierColors.gold)}>
                      {sponsor.tier}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-black uppercase border",
                      (sponsor.type || 'sponsor') === 'media' ? "text-orange-400 border-orange-500/20 bg-orange-500/10" : "text-brand-secondary border-brand-primary/20 bg-brand-primary/10"
                    )}>
                      {(sponsor.type || 'sponsor') === 'media' ? t('sponsors.media', 'إعلامي') : t('sponsors.sponsor', 'راعي')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditOpen(sponsor)} className="p-2 text-amber-400/20 hover:text-amber-400 transition-colors">
                      <Plus className="w-4 h-4 rotate-45 scale-125" />
                    </button>
                    <button onClick={() => handleDelete(sponsor.id)} className="p-2 text-red-400/20 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{sponsor.name}</h3>
                {sponsor.website_url && (
                  <a href={sponsor.website_url} target="_blank" rel="noreferrer" className="text-brand-secondary/30 text-xs flex items-center gap-1 hover:text-brand-secondary transition-colors">
                    <ExternalLink className="w-3 h-3" />
                    {t('sponsors.website', 'الموقع الإلكتروني')}
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {sponsors.length === 0 && !loading && (
        <div className="text-center py-20 bg-white/5 rounded-[32px] border border-white/10">
          <Heart className="w-16 h-16 text-brand-secondary/10 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">{t('sponsors.no_sponsors', 'لا يوجد رعاة حالياً')}</h3>
          <p className="text-brand-secondary/30 mt-2">{t('sponsors.no_sponsors_desc', 'ابدأ بإضافة أول شريك للفعالية.')}</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-brand-dark/40">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#050B18] border border-white/10 rounded-[40px] p-10 w-full max-w-xl shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-8">
              {editingSponsor ? t('sponsors.edit_title', 'تعديل بيانات الراعي') : t('sponsors.add_title', 'إضافة راع جديد')}
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-brand-secondary/50">{t('sponsors.modal.name', 'الاسم')}</label>
                  <Input 
                    value={newSponsor.name} 
                    onChange={(e) => setNewSponsor(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-brand-secondary/50">{t('sponsors.modal.tier', 'الفئة')}</label>
                  <select 
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:border-brand-primary"
                    value={newSponsor.tier}
                    onChange={(e) => setNewSponsor(prev => ({ ...prev, tier: e.target.value }))}
                  >
                    <option value="platinum" className="bg-[#050B18]">Platinum</option>
                    <option value="gold" className="bg-[#050B18]">Gold</option>
                    <option value="silver" className="bg-[#050B18]">Silver</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-brand-secondary/50">{t('sponsors.modal.type', 'نوع الشراكة')}</label>
                <select 
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:border-brand-primary"
                  value={newSponsor.type}
                  onChange={(e) => setNewSponsor(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="sponsor" className="bg-[#050B18]">{t('sponsors.sponsor', 'راعي رسمي (Sponsor)')}</option>
                  <option value="media" className="bg-[#050B18]">{t('sponsors.media', 'شريك إعلامي (Media Partner)')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-brand-secondary/50">{t('sponsors.modal.website', 'الموقع الإلكتروني')}</label>
                <Input 
                  placeholder="https://..." 
                  value={newSponsor.website_url} 
                  onChange={(e) => setNewSponsor(prev => ({ ...prev, website_url: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-brand-secondary/50">{t('sponsors.modal.logo', 'الشعار (Logo)')}</label>
                <div 
                  className={cn(
                    "w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all",
                    logoFile ? "border-brand-primary bg-brand-primary/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                  )}
                  onClick={() => document.getElementById('logo-upload').click()}
                >
                  {logoFile ? (
                    <div className="text-brand-secondary flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      <span className="font-bold">{logoFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-brand-secondary/20 mb-2" />
                      <span className="text-xs text-brand-secondary/30">{t('sponsors.modal.choose_logo', 'اختر صورة الشعار')}</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    id="logo-upload" 
                    hidden 
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files[0])} 
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button className="flex-1" variant="gold" onClick={handleCreateSponsor}>
                  {editingSponsor ? t('common.save', 'حفظ التعديلات') : t('common.save', 'إضافة')}
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => { setShowAddModal(false); setEditingSponsor(null); }}>{t('common.cancel', 'إلغاء')}</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SponsorsPage;
