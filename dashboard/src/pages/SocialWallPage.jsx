import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Heart, Share2, Sparkles, Trash2, Edit2, X, Search, ArrowRight, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAttendanceSocket from '../hooks/useAttendanceSocket';
import api from '../services/api';
import eventService from '../services/eventService';
import { useEvent } from '../context/EventContext';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';
import { toast, Toaster } from 'react-hot-toast';

const PostCard = ({ post, onLike, onUnlike, onCommentClick }) => {
  const [isLiked, setIsLiked] = useState(false);

  const handleLikeToggle = (e) => {
    e.stopPropagation();
    if (isLiked) {
      setIsLiked(false);
      onUnlike(post.id);
    } else {
      setIsLiked(true);
      onLike(post.id);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] shadow-2xl relative overflow-hidden group hover:border-brand-primary/30 transition-all cursor-pointer"
      onClick={() => onCommentClick(post)}
    >
      <div className="absolute top-0 right-0 p-4 opacity-20 text-4xl">{post.emoji || '👏'}</div>
      
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-secondary to-brand-primary flex items-center justify-center text-white font-bold text-xl">
          {post.author?.[0] || 'U'}
        </div>
        <div>
          <h4 className="font-bold text-white text-lg">{post.author}</h4>
          <span className="text-brand-secondary/40 text-xs">منذ قليل</span>
        </div>
      </div>

      <p className="text-brand-secondary/80 text-xl leading-relaxed mb-6">
        {post.content}
      </p>

      {post.image_url && (
        <div className="rounded-2xl overflow-hidden mb-6 border border-white/5 h-48 bg-black/20 flex items-center justify-center">
          <img src={post.image_url} alt="Post content" className="w-full h-full object-contain" />
        </div>
      )}

      <div className="flex items-center gap-6">
        <button 
          onClick={handleLikeToggle}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full transition-all relative z-10",
            isLiked ? "bg-brand-primary text-brand-dark font-bold shadow-lg shadow-brand-primary/20" : "bg-white/5 text-brand-secondary/40 hover:bg-white/10"
          )}
        >
          <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
          <span className="text-sm">{post.likes || 0}</span>
        </button>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-brand-secondary/40 hover:bg-white/10 transition-colors">
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm">{post.comments_count || 0}</span>
        </div>
      </div>
    </motion.div>
  );
};

const CommentModal = ({ post, isOpen, onClose }) => {
  const { user } = useAuth();
  const [editingComment, setEditingComment] = useState(null);
  const [comments, setComments] = useState([]);
  const [likers, setLikers] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');

  const fetchComments = () => {
    api.get(`social/${post.id}/comments`).then(res => setComments(res.data));
  };

  useEffect(() => {
    if (isOpen && post) {
      fetchComments();
      api.get(`social/${post.id}/likes`).then(res => setLikers(res.data));
    }
  }, [isOpen, post]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);

    // Optimistic Update
    const originalComments = [...comments];
    if (editingComment) {
      setComments(prev => prev.map(c => 
        c.id === editingComment.id ? { ...c, content: newComment } : c
      ));
    } else {
      const tempId = Date.now();
      setComments(prev => [...prev, { 
        id: tempId, 
        author_name: user?.full_name || 'مشارك', 
        content: newComment,
        is_temp: true 
      }]);
    }

    try {
      if (editingComment) {
        await api.patch(`social/comment/${editingComment.id}`, {
          author_name: user?.full_name || 'مشارك',
          content: newComment
        });
        setEditingComment(null);
        showSuccess('تم تعديل التعليق');
      } else {
        await api.post(`social/${post.id}/comment`, {
          author_name: user?.full_name || 'مشارك',
          content: newComment
        });
        showSuccess('تم إضافة التعليق');
      }
      setNewComment('');
      fetchComments();
      setActiveTab('comments');
    } catch (err) {
      console.error('Failed to post/edit comment');
      setComments(originalComments); // Revert on error
      showError('حدث خطأ أثناء العملية');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    const result = await showConfirm('هل أنت متأكد من حذف هذا التعليق؟');
    if (!result.isConfirmed) return;
    try {
      await api.delete(`social/comment/${commentId}`);
      fetchComments();
      showSuccess('تم حذف التعليق');
    } catch (err) {
      showError('فشل حذف التعليق');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-dark/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-[#0D1527] border border-white/10 rounded-[40px] p-8 shadow-2xl flex flex-col max-h-[85vh]"
          >
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">تفاعلات المنشور</h3>
                <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-white/40 hover:text-white">إغلاق</button>
              </div>
              
              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
                <button 
                  onClick={() => setActiveTab('comments')}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                    activeTab === 'comments' ? "bg-brand-primary text-brand-dark" : "text-white/40 hover:text-white"
                  )}
                >
                  التعليقات ({comments.length})
                </button>
                <button 
                  onClick={() => setActiveTab('likes')}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                    activeTab === 'likes' ? "bg-brand-primary text-brand-dark" : "text-white/40 hover:text-white"
                  )}
                >
                  الإعجابات ({likers.length})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
              {activeTab === 'comments' ? (
                <>
                  {comments.map((c, i) => (
                    <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 group/comment relative">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-brand-secondary text-xs">{c.author_name}</span>
                        <span className="text-[10px] text-white/20">منذ قليل</span>
                      </div>
                      <p className="text-white/80 text-sm">{c.content}</p>
                      
                      {(c.author_name?.trim() === user?.full_name?.trim() || user?.role === 'admin' || user?.role === 'organizer') && (
                        <div className="absolute top-4 left-4 flex gap-2 transition-opacity">
                          <button 
                            onClick={() => { setEditingComment(c); setNewComment(c.content); }}
                            className="p-1.5 bg-white/10 rounded-lg text-blue-400 hover:bg-blue-500/20"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteComment(c.id)}
                            className="p-1.5 bg-white/10 rounded-lg text-red-400 hover:bg-red-500/20"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <div className="text-center py-10 text-white/20">لا توجد تعليقات بعد.</div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {likers.map((l, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                      <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-secondary text-xs font-bold">
                        {l.user_name[0]}
                      </div>
                      <span className="text-white text-xs font-bold truncate">{l.user_name}</span>
                    </div>
                  ))}
                  {likers.length === 0 && (
                    <div className="col-span-2 text-center py-10 text-white/20">لا توجد إعجابات بعد.</div>
                  )}
                </div>
              )}
            </div>

            {activeTab === 'comments' && (
              <div className="relative group/form">
                <AnimatePresence>
                  {editingComment && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute -top-12 left-0 right-0 flex items-center justify-between px-5 py-2 bg-blue-500/20 border border-blue-500/30 rounded-2xl text-blue-300 text-[11px] font-bold backdrop-blur-xl"
                    >
                      <div className="flex items-center gap-2">
                        <Edit2 className="w-3 h-3" />
                        <span>تعديل التعليق المختار...</span>
                      </div>
                      <button 
                        onClick={() => { setEditingComment(null); setNewComment(''); }} 
                        className="hover:bg-white/10 p-1 rounded-lg transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <form onSubmit={handleSubmit} className="relative">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="اكتب تعليقك هنا..."
                    className={cn(
                      "w-full bg-white/5 border rounded-2xl px-6 py-4 text-white focus:outline-none transition-all pr-24",
                      editingComment ? "border-blue-500/50 ring-4 ring-blue-500/10" : "border-white/10 focus:border-brand-primary"
                    )}
                  />
                  <button 
                    disabled={loading}
                    className={cn(
                      "absolute left-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg",
                      editingComment ? "bg-blue-500 text-white shadow-blue-500/20" : "bg-brand-primary text-brand-dark shadow-brand-primary/20"
                    )}
                  >
                    {loading ? '...' : editingComment ? 'تعديل' : 'إرسال'}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const SocialWallPage = () => {
  const { selectedEventId: eventId } = useEvent();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [eventName, setEventName] = useState('حائط التواصل');
  const [selectedPost, setSelectedPost] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchWallData = async () => {
      try {
        const response = await api.get(`social/${eventId}/approved`);
        const mapped = response.data.map(p => ({
          id: p.id,
          author: p.author_name,
          content: p.content,
          image_url: p.image_url,
          emoji: p.emoji,
          likes: p.likes_count,
          comments_count: p.comments_count || 0
        }));
        setPosts(mapped);
      } catch (err) {
        console.error('Failed to fetch wall posts');
      }

      try {
        const settings = await eventService.getEventSettings(eventId);
        if (settings?.event_name) setEventName(settings.event_name);
      } catch (e) {
        console.error('Failed to fetch event settings');
      }
    };
    if (eventId) fetchWallData();
  }, [eventId]);

  const handleLike = async (postId) => {
    try {
      const sessionKey = localStorage.getItem('wall_session') || Math.random().toString(36).substring(7);
      localStorage.setItem('wall_session', sessionKey);
      await api.post(`social/${postId}/like?session_key=${sessionKey}&user_name=${encodeURIComponent(user?.full_name || 'مشارك')}`);
    } catch (err) {
      console.error('Failed to like post');
    }
  };

  const handleUnlike = async (postId) => {
    try {
      const sessionKey = localStorage.getItem('wall_session');
      await api.delete(`social/${postId}/like?session_key=${sessionKey}`);
    } catch (err) {
      console.error('Failed to unlike post');
    }
  };

  useAttendanceSocket(eventId, (message) => {
    if (message.type === 'social_post_approved') {
      const newPost = {
        id: message.post.id,
        author: message.post.author,
        content: message.post.content,
        image_url: message.post.image_url,
        emoji: message.post.emoji,
        likes: 0,
        comments_count: 0
      };
      setPosts(prev => [newPost, ...prev].slice(0, 12));
    }
    if (message.type === 'post_like_update') {
      setPosts(prev => prev.map(p => 
        p.id === message.post_id ? { ...p, likes: message.likes } : p
      ));
    }
    if (message.type === 'post_comment_update') {
      setPosts(prev => prev.map(p => 
        p.id === message.post_id ? { ...p, comments_count: message.comments_count } : p
      ));
    }
  });

  const filteredPosts = posts.filter(p => 
    (p.author || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.content || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050B18] p-12 overflow-hidden relative">
      <Toaster position="top-center" reverseOrder={false} />
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      
      <header className="flex items-center justify-between mb-16 relative z-10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-900/40">
            <Sparkles className="w-8 h-8 text-brand-dark" />
          </div>
          <div>
            <h1 className={cn(
              "font-black text-white max-w-2xl leading-tight text-balance",
              eventName.length > 40 ? "text-xl lg:text-2xl" :
              eventName.length > 20 ? "text-2xl lg:text-3xl" :
              "text-4xl"
            )}>
              {eventName}
            </h1>
            <p className="text-brand-secondary/40 font-bold uppercase tracking-widest text-xs mt-1">حائط التواصل • Powered by Diwan Event</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 hover:border-white/20 transition-all text-sm shadow-lg shadow-black/20"
          >
            <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180 text-brand-secondary/60" />
            <span>العودة للوحة التحكم</span>
          </Link>
          <span className="px-6 py-3 rounded-2xl bg-brand-primary/10 text-brand-secondary border border-brand-primary/20 font-bold text-sm shadow-lg shadow-brand-primary/5">
            مباشر الآن
          </span>
        </div>
      </header>

      {/* Search Bar */}
      <div className="mb-12 relative max-w-xl z-10">
        <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-secondary/30" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث بالكاتب أو بمحتوى المنشور..."
          className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl ltr:pl-12 rtl:pr-12 text-white outline-none focus:border-brand-primary/50 transition-all placeholder:text-white/20"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-10">
        <AnimatePresence>
          {filteredPosts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onLike={handleLike} 
              onUnlike={handleUnlike}
              onCommentClick={(p) => setSelectedPost(p)}
            />
          ))}
        </AnimatePresence>
      </div>

      <CommentModal 
        isOpen={!!selectedPost} 
        post={selectedPost} 
        onClose={() => setSelectedPost(null)} 
      />

      {posts.length === 0 && (
        <div className="h-[60vh] flex flex-col items-center justify-center text-brand-secondary/20">
          <MessageSquare className="w-32 h-32 mb-6" />
          <p className="text-2xl font-bold italic">بانتظار مشاركاتكم الجميلة...</p>
        </div>
      )}
    </div>
  );
};

export default SocialWallPage;
