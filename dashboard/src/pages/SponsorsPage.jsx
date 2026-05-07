import React, { useState, useEffect } from 'react';
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

const SponsorsPage = () => {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSponsor, setNewSponsor] = useState({
    name: '',
    tier: 'gold',
    website_url: '',
    display_duration: 8
  });
  const [logoFile, setLogoFile] = useState(null);
  const eventId = 1;

  useEffect(() => {
    fetchSponsors();
  }, []);

  const fetchSponsors = async () => {
    try {
      const response = await api.get(`/sponsors/${eventId}`);
      setSponsors(response.data);
    } catch (err) {
      console.error("Failed to fetch sponsors");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSponsor = async () => {
    if (!newSponsor.name || !logoFile) return;
    
    const formData = new FormData();
    formData.append('event_id', eventId);
    formData.append('name', newSponsor.name);
    formData.append('tier', newSponsor.tier);
    formData.append('website_url', newSponsor.website_url);
    formData.append('display_duration', newSponsor.display_duration);
    formData.append('logo', logoFile);

    try {
      await api.post('/sponsors/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowAddModal(false);
      setNewSponsor({ name: '', tier: 'gold', website_url: '', display_duration: 8 });
      setLogoFile(null);
      fetchSponsors();
    } catch (err) {
      alert("فشل إضافة الراعي");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الراعي؟")) return;
    try {
      await api.delete(`/sponsors/${id}`);
      fetchSponsors();
    } catch (err) {
      alert("فشل الحذف");
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
          <h1 className="text-4xl font-bold text-white mb-2">شركاء النجاح</h1>
          <p className="text-emerald-400/50 flex items-center gap-2">
            <Heart className="w-4 h-4" />
            إدارة الرعاة والشركاء الرسميين للفعالية
          </p>
        </div>
        
        <Button variant="gold" className="flex items-center gap-2 h-14 px-8" onClick={() => setShowAddModal(true)}>
          <Plus className="w-5 h-5" />
          إضافة راع جديد
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
                <img src={sponsor.logo_url} alt={sponsor.name} className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black uppercase border", tierColors[sponsor.tier] || tierColors.gold)}>
                    {sponsor.tier}
                  </span>
                  <button onClick={() => handleDelete(sponsor.id)} className="p-2 text-red-400/20 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{sponsor.name}</h3>
                {sponsor.website_url && (
                  <a href={sponsor.website_url} target="_blank" rel="noreferrer" className="text-emerald-400/30 text-xs flex items-center gap-1 hover:text-emerald-400 transition-colors">
                    <ExternalLink className="w-3 h-3" />
                    الموقع الإلكتروني
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {sponsors.length === 0 && !loading && (
        <div className="text-center py-20 bg-white/5 rounded-[32px] border border-white/10">
          <Heart className="w-16 h-16 text-emerald-400/10 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">لا يوجد رعاة حالياً</h3>
          <p className="text-emerald-400/30 mt-2">ابدأ بإضافة أول شريك للفعالية.</p>
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
            <h2 className="text-2xl font-bold text-white mb-8">إضافة راع جديد</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">الاسم</label>
                  <Input 
                    value={newSponsor.name} 
                    onChange={(e) => setNewSponsor(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-100/50">الفئة</label>
                  <select 
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:border-emerald-500"
                    value={newSponsor.tier}
                    onChange={(e) => setNewSponsor(prev => ({ ...prev, tier: e.target.value }))}
                  >
                    <option value="platinum" className="bg-[#022C22]">Platinum</option>
                    <option value="gold" className="bg-[#022C22]">Gold</option>
                    <option value="silver" className="bg-[#022C22]">Silver</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-emerald-100/50">الموقع الإلكتروني</label>
                <Input 
                  placeholder="https://..." 
                  value={newSponsor.website_url} 
                  onChange={(e) => setNewSponsor(prev => ({ ...prev, website_url: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-emerald-100/50">الشعار (Logo)</label>
                <div 
                  className={cn(
                    "w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all",
                    logoFile ? "border-emerald-500 bg-emerald-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                  )}
                  onClick={() => document.getElementById('logo-upload').click()}
                >
                  {logoFile ? (
                    <div className="text-emerald-400 flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      <span className="font-bold">{logoFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-emerald-400/20 mb-2" />
                      <span className="text-xs text-emerald-400/30">اختر صورة الشعار</span>
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
                <Button className="flex-1" variant="gold" onClick={handleCreateSponsor}>إضافة</Button>
                <Button className="flex-1" variant="outline" onClick={() => setShowAddModal(false)}>إلغاء</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SponsorsPage;
