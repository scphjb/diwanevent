import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Heart, Share2, Sparkles } from 'lucide-react';
import useAttendanceSocket from '../hooks/useAttendanceSocket';
import api from '../services/api';

const PostCard = ({ post }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.8, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.5 }}
    className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] shadow-2xl relative overflow-hidden group"
  >
    <div className="absolute top-0 right-0 p-4 opacity-20 text-4xl">{post.emoji || '👏'}</div>
    
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-xl">
        {post.author[0]}
      </div>
      <div>
        <h4 className="font-bold text-white text-lg">{post.author}</h4>
        <span className="text-emerald-400/40 text-xs">منذ قليل</span>
      </div>
    </div>

    <p className="text-emerald-100/80 text-xl leading-relaxed mb-6">
      {post.content}
    </p>

    {post.image_url && (
      <div className="rounded-2xl overflow-hidden mb-6 border border-white/5">
        <img src={post.image_url} alt="Post content" className="w-full h-auto object-cover" />
      </div>
    )}

    <div className="flex items-center gap-6 text-emerald-400/40">
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5" />
        <span className="text-sm">{post.likes || 0}</span>
      </div>
      <MessageSquare className="w-5 h-5" />
    </div>
  </motion.div>
);

const SocialWallPage = ({ eventId = 1 }) => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    // Initial fetch of approved posts
    const fetchPosts = async () => {
      try {
        const response = await api.get(`/social/${eventId}/approved`);
        // Map backend model to frontend expected shape
        const mapped = response.data.map(p => ({
          id: p.id,
          author: p.author_name,
          content: p.content,
          image_url: p.image_url,
          emoji: p.emoji,
          likes: p.likes_count
        }));
        setPosts(mapped);
      } catch (err) {
        console.error('Failed to fetch wall posts');
      }
    };
    fetchPosts();
  }, [eventId]);

  useAttendanceSocket(eventId, (message) => {
    if (message.type === 'social_post_approved') {
      setPosts(prev => [message.post, ...prev].slice(0, 12)); // Keep last 12
    }
    if (message.type === 'post_like_update') {
      setPosts(prev => prev.map(p => 
        p.id === message.post_id ? { ...p, likes: message.likes } : p
      ));
    }
  });

  return (
    <div className="min-h-screen bg-[#022C22] p-12 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      
      <header className="flex items-center justify-between mb-16 relative z-10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-900/40">
            <Sparkles className="w-8 h-8 text-emerald-950" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white">حائط التواصل</h1>
            <p className="text-emerald-400/40 font-bold uppercase tracking-widest text-xs">شاركنا تجربتك في ديوان إيفنت</p>
          </div>
        </div>
        <div className="text-right">
          <span className="px-6 py-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
            مباشر الآن
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-10">
        <AnimatePresence>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </AnimatePresence>
      </div>

      {posts.length === 0 && (
        <div className="h-[60vh] flex flex-col items-center justify-center text-emerald-400/20">
          <MessageSquare className="w-32 h-32 mb-6" />
          <p className="text-2xl font-bold italic">بانتظار مشاركاتكم الجميلة...</p>
        </div>
      )}
    </div>
  );
};

export default SocialWallPage;
