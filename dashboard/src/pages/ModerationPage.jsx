import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  Check, 
  X, 
  Clock, 
  ShieldAlert, 
  Trash2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import api from '../services/api';
import useAttendanceSocket from '../hooks/useAttendanceSocket';
import { useEvent } from '../context/EventContext';

const ModerationPage = () => {
  const { selectedEventId: eventId } = useEvent();
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      const response = await api.get(`social/${eventId}/moderation`);
      setPosts(response.data);
    } catch (err) {
      console.error('Failed to fetch pending posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [eventId]);

  // Listen for new posts needing moderation
  useAttendanceSocket(eventId, (message) => {
    if (message.type === 'new_post_moderation') {
      // Add to list if not already there
      setPosts(prev => [message.post, ...prev]);
    }
  });

  const handleModerate = async (postId, approved) => {
    try {
      await api.patch(`social/${postId}/moderate`, null, {
        params: { approved, event_id: eventId }
      });
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      alert(t('social_moderation.save_error', 'فشلت عملية الإشراف'));
    }
  };

  return (
    <DashboardLayout activePath="/dashboard/moderation">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('social_moderation.title', 'إدارة الحائط الاجتماعي')}</h1>
          <p className="text-brand-secondary/50 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            {t('social_moderation.subtitle', { count: posts.length })}
          </p>
        </div>
        <Button variant="outline" onClick={fetchPending} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          {t('social_moderation.refresh', 'تحديث القائمة')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {posts.map((post) => (
            <motion.div
              key={post.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/5 border border-white/10 rounded-[32px] p-6 backdrop-blur-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-secondary font-bold">
                      {post.author_name ? post.author_name[0] : 'U'}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{post.author_name}</h4>
                      <span className="text-brand-secondary/30 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t('social_moderation.pending_review', 'بانتظار المراجعة')}
                      </span>
                    </div>
                  </div>
                  <div className="text-3xl opacity-30">{post.emoji}</div>
                </div>
                
                <p className="text-brand-secondary/70 text-lg mb-6 italic">
                  "{post.content}"
                </p>

                {post.image_url && (
                  <div className="rounded-2xl overflow-hidden mb-6 border border-white/5 h-48 bg-black/20 flex items-center justify-center">
                    <img src={post.image_url} alt="Post content" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={() => handleModerate(post.id, true)}
                  className="flex-1 bg-brand-primary hover:bg-brand-primary text-white h-14 rounded-2xl gap-2"
                >
                  <Check className="w-5 h-5" />
                  {t('social_moderation.approve', 'قبول المنشور')}
                </Button>
                <Button 
                  onClick={() => handleModerate(post.id, false)}
                  className="bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 h-14 px-6 rounded-2xl"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!loading && posts.length === 0 && (
        <div className="h-64 flex flex-col items-center justify-center bg-white/5 rounded-[40px] border border-dashed border-white/10">
          <Check className="w-12 h-12 text-brand-primary/20 mb-4" />
          <p className="text-brand-secondary/20 font-bold">{t('social_moderation.no_posts', 'كل المنشورات مراجعة حالياً')}</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ModerationPage;
