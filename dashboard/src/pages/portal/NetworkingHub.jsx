import React, { useState, useEffect, useRef } from 'react';
import { Users, MessageCircle, Calendar, Search,
         UserPlus, Check, X, Star, QrCode, ChevronRight,
         Phone, Mail, Award } from 'lucide-react';
import networkingService from '../../services/networkingService';

// Import Tabs
import ConnectionsTab from './ConnectionsTab';
import MeetingsTab from './MeetingsTab';

// ── ثوابت ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'directory',       icon: Users,         label: 'الدليل',         badge: null },
  { id: 'connections',     icon: UserPlus,      label: 'اتصالاتي',       badge: 'pending_count' },
  { id: 'messages',        icon: MessageCircle, label: 'المحادثات',       badge: 'unread_count' },
  { id: 'meetings',        icon: Calendar,      label: 'الاجتماعات',     badge: null },
];

const SPECIALTIES_OPTIONS = [
  'إدارة أعمال', 'تقنية معلومات', 'تسويق', 'مبيعات',
  'مالية ومحاسبة', 'موارد بشرية', 'علاقات عامة', 'إدارة مشاريع',
  'قانون ومحاماة', 'تصميم وإبداع', 'استشارات', 'تطوير أعمال'
];

const LOOKING_FOR_OPTIONS = [
  'تعاون مهني', 'تبادل خبرات', 'شراكات', 'معلومات قانونية',
  'زملاء في المهنة', 'الإرشاد المهني', 'عقود عمل'
];

// Helper to get active theme safely in all portal components
const getIsLightTheme = () => {
  if (typeof document === 'undefined') return false;
  return (
    document.documentElement.classList.contains('light-theme') ||
    document.body.classList.contains('light-theme') ||
    localStorage.getItem('portal_theme') === 'light'
  );
};

// ── المكوّن الرئيسي ───────────────────────────────────────────────
const NetworkingHub = ({ eventId, participant }) => {
  const [activeTab, setActiveTab] = useState('directory');
  const [badges, setBadges] = useState({ pending_count: 0, unread_count: 0 });
  const wsRef = useRef(null);
  const isLightTheme = getIsLightTheme();

  const showToast = (message, type = 'info') => {
    console.log(`[Toast ${type}]: ${message}`);
  };

  // WebSocket للإشعارات الفورية
  useEffect(() => {
    const token = localStorage.getItem('participant_token');
    if (!token || !eventId) return;
    
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}/api/v1/ws/${eventId}?token=${token}`;
    
    try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onmessage = (e) => {
          const data = JSON.parse(e.data);
          
          if (data.type === 'networking_request' && data.target_participant_id === participant?.id) {
            setBadges(b => ({ ...b, pending_count: b.pending_count + 1 }));
            showToast(`📩 طلب اتصال جديد من ${data.from.full_name}`, 'info');
          }
          if (data.type === 'direct_message' && data.target_participant_id === participant?.id) {
            setBadges(b => ({ ...b, unread_count: b.unread_count + 1 }));
          }
          if (data.type === 'networking_response' && data.target_participant_id === participant?.id) {
            if (data.status === 'accepted') {
              showToast(`✅ قبل ${data.responder.full_name} طلب اتصالك!`, 'success');
            }
          }
          if (data.type === 'meeting_request' && data.target_participant_id === participant?.id) {
            showToast(`📅 دعوة اجتماع من ${data.proposer.full_name}`, 'info');
          }
        };
        
        return () => ws.close();
    } catch (err) {
        console.error("WebSocket connection failed:", err);
    }
  }, [eventId, participant]);

  // جلب عدد الإشعارات
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const [conns, unread] = await Promise.all([
          networkingService.getConnections(),
          networkingService.getUnreadCount()
        ]);
        setBadges({
          pending_count: conns.pending_incoming?.length || 0,
          unread_count: unread.unread_count || 0
        });
      } catch (err) {
        console.error("Failed to fetch badges", err);
      }
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      display:'flex', 
      flexDirection:'column', 
      height:'100%', 
      minHeight: '100vh', 
      background: isLightTheme ? '#F8FAFC' : '#050B18', 
      fontFamily:'Cairo, sans-serif',
      transition: 'background 0.3s'
    }}>
      
      {/* Header */}
      <div style={{ 
        padding:'16px 20px', 
        borderBottom: isLightTheme ? '1px solid rgba(217,119,6,0.15)' : '1px solid rgba(212,175,55,0.15)', 
        display:'flex', 
        alignItems:'center', 
        justifyContent:'space-between' 
      }}>
        <h1 style={{ color: isLightTheme ? '#D97706' : '#D4AF37', fontSize:20, fontWeight:900, margin:0 }}>🤝 التواصل المهني</h1>
        <ProfileCompletionBadge participant={participant} />
      </div>
      
      {/* Tabs */}
      <div style={{ 
        display:'flex', 
        borderBottom: isLightTheme ? '1px solid rgba(15,23,42,0.08)' : '1px solid rgba(255,255,255,0.08)', 
        background: isLightTheme ? '#FFFFFF' : '#0D1527' 
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const badgeCount = tab.badge ? badges[tab.badge] : 0;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex:1, padding:'12px 8px', border:'none', cursor:'pointer', fontFamily:'Cairo',
                background: isActive ? (isLightTheme ? '#F8FAFC' : '#050B18') : 'transparent',
                borderBottom: isActive ? (isLightTheme ? '2px solid #D97706' : '2px solid #D4AF37') : '2px solid transparent',
                color: isActive ? (isLightTheme ? '#D97706' : '#D4AF37') : (isLightTheme ? '#64748B' : 'rgba(255,255,255,0.5)'),
                display:'flex', flexDirection:'column', alignItems:'center', gap:4, position:'relative',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize:11 }}>{tab.label}</span>
              {badgeCount > 0 && (
                <span style={{
                  position:'absolute', top:6, right:'calc(50% - 20px)',
                  background:'#ef4444', color:'#fff', borderRadius:'50%',
                  width:16, height:16, fontSize:10, display:'flex',
                  alignItems:'center', justifyContent:'center', fontWeight:'bold'
                }}>{badgeCount > 9 ? '9+' : badgeCount}</span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Content */}
      <div style={{ flex:1, overflow:'auto', paddingBottom: 110 }}>
        {activeTab === 'directory'   && <DirectoryTab eventId={eventId} myId={participant?.id} />}
        {activeTab === 'connections' && <ConnectionsTab onBadgeUpdate={setBadges} myId={participant?.id} />}
        {activeTab === 'messages'    && <MessagesTab myId={participant?.id} />}
        {activeTab === 'meetings'    && <MeetingsTab myId={participant?.id} />}
      </div>
    </div>
  );
};

// ── تبويب الدليل ──────────────────────────────────────────────────
const DirectoryTab = ({ eventId, myId }) => {
  const [results, setResults] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [openToMeetOnly, setOpenToMeetOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [availableTags, setAvailableTags] = useState([]);
  const isLightTheme = getIsLightTheme();

  useEffect(() => {
    networkingService.getRecommendations(eventId)
      .then(setRecommendations)
      .catch(err => console.error(err));
      
    networkingService.getMyProfile()
      .then(p => setIsVisible(p.is_visible))
      .catch(err => console.error(err));

    networkingService.getDirectory(eventId, { limit: 100 })
      .then(data => {
        const participants = data.results || data;
        const tagsMap = {};
        participants.forEach(p => {
          const specs = p.profile?.specialties || [];
          specs.forEach(s => {
            if (s) tagsMap[s] = (tagsMap[s] || 0) + 1;
          });
        });
        const sortedTags = Object.entries(tagsMap)
          .sort((a, b) => b[1] - a[1])
          .map(t => t[0])
          .slice(0, 12);
        setAvailableTags(sortedTags);
      })
      .catch(err => console.error(err));
  }, [eventId]);

  useEffect(() => {
    const timer = setTimeout(() => fetchDirectory(), 400);
    return () => clearTimeout(timer);
  }, [search, selectedSpecialty, openToMeetOnly]);

  const fetchDirectory = async () => {
    setLoading(true);
    try {
      const data = await networkingService.getDirectory(eventId, { 
        search, 
        specialty: selectedSpecialty, 
        open_to_meet: openToMeetOnly || undefined 
      });
      setResults(data.results || data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (participantId) => {
    try {
      await networkingService.sendConnectionRequest(participantId);
      setResults(prev => prev.map(p =>
        p.id === participantId ? { ...p, connection_status: 'pending' } : p
      ));
      setRecommendations(prev => prev.map(p => 
        p.id === participantId ? { ...p, connection_status: 'pending' } : p
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleVisibility = async () => {
    try {
      const res = await networkingService.updateMyProfile({ is_visible: !isVisible });
      setIsVisible(res.is_visible ?? !isVisible);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding:16 }} dir="rtl">
      
      {/* Visibility Toggle */}
      <div style={{ 
        background: isLightTheme ? '#FFFFFF' : 'rgba(255,255,255,0.04)', 
        borderRadius:12, 
        padding:14, 
        marginBottom:16, 
        display:'flex', 
        alignItems:'center', 
        justifyContent:'space-between', 
        border: isLightTheme ? '1px solid rgba(15,23,42,0.08)' : '1px solid rgba(255,255,255,0.06)',
        boxShadow: isLightTheme ? '0 4px 12px rgba(15,23,42,0.03)' : 'none'
      }}>
        <div>
          <div style={{ color: isLightTheme ? '#0F172A' : '#F0F4F2', fontSize:14, fontWeight:'bold', display:'flex', alignItems:'center', gap:6 }}>
             الظهور الميداني
          </div>
          <div style={{ color: isLightTheme ? '#475569' : 'rgba(255,255,255,0.4)', fontSize:11, marginTop:2 }}>
            {isVisible ? 'أنت مرئي في دليل المشاركين' : 'ملفك مخفي عن الآخرين حالياً'}
          </div>
        </div>
        <button 
          onClick={toggleVisibility} 
          style={{ 
            background: isVisible ? 'linear-gradient(135deg, #2A64EC, #2A64EC)' : (isLightTheme ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.1)'), 
            color: isVisible ? '#fff' : (isLightTheme ? '#475569' : 'rgba(255,255,255,0.5)'), 
            border:'none', borderRadius:20, padding:'6px 16px', fontFamily:'Cairo', fontSize:12, fontWeight:'bold', cursor:'pointer', transition:'all 0.3s' 
          }}
        >
          {isVisible ? '👁 مرئي' : '👁‍🗨 مخفي'}
        </button>
      </div>

      {/* بحث */}
      <div style={{ position:'relative', marginBottom:12 }}>
        <Search size={16} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color: isLightTheme ? '#64748B' : 'rgba(255,255,255,0.4)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم، الجهة، التخصص..."
          style={{ 
            width:'100%', 
            padding:'10px 40px 10px 12px', 
            background: isLightTheme ? '#FFFFFF' : 'rgba(255,255,255,0.06)', 
            border: isLightTheme ? '1px solid rgba(15,23,42,0.15)' : '1px solid rgba(255,255,255,0.1)', 
            borderRadius:10, 
            color: isLightTheme ? '#0F172A' : '#F0F4F2', 
            fontFamily:'Cairo', 
            fontSize:13, 
            outline:'none', 
            boxSizing:'border-box',
            boxShadow: isLightTheme ? '0 2px 8px rgba(15,23,42,0.02)' : 'none'
          }}
        />
      </div>
      
      {/* فلاتر */}
      <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
        <button
          onClick={() => setOpenToMeetOnly(!openToMeetOnly)}
          style={{ 
            padding:'6px 14px', borderRadius:20, border:'1px solid', fontFamily:'Cairo', fontSize:12, cursor:'pointer', whiteSpace:'nowrap',
            background: openToMeetOnly ? (isLightTheme ? '#D97706' : '#D4AF37') : 'transparent',
            color: openToMeetOnly ? '#FFFFFF' : (isLightTheme ? '#D97706' : '#D4AF37'),
            borderColor: isLightTheme ? '#D97706' : '#D4AF37',
            transition: 'all 0.2s'
          }}
        >
          📅 متاح للاجتماع
        </button>
        {availableTags.map(spec => {
          const isSelected = selectedSpecialty === spec;
          return (
            <button key={spec}
              onClick={() => setSelectedSpecialty(isSelected ? '' : spec)}
              style={{ 
                padding:'6px 14px', borderRadius:20, fontFamily:'Cairo', fontSize:11, cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.2s',
                border: isSelected ? (isLightTheme ? '1px solid #D97706' : '1px solid #D4AF37') : (isLightTheme ? '1px solid rgba(15,23,42,0.08)' : '1px solid rgba(255,255,255,0.15)'),
                background: isSelected ? (isLightTheme ? 'rgba(217,119,6,0.15)' : 'rgba(212,175,55,0.2)') : (isLightTheme ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.03)'),
                color: isSelected ? (isLightTheme ? '#D97706' : '#D4AF37') : (isLightTheme ? '#475569' : 'rgba(255,255,255,0.6)'),
              }}
            >#{spec}</button>
          );
        })}
      </div>
      
      {/* التوصيات */}
      {!search && recommendations.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <h3 style={{ color: isLightTheme ? '#D97706' : '#D4AF37', fontSize:13, margin:'0 0 10px', display:'flex', alignItems:'center', gap:6 }}>
            <Star size={14} /> مقترح لك التواصل معهم
          </h3>
          <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:8 }}>
            {recommendations.map(rec => (
              <RecommendationCard key={rec.id} participant={rec} onConnect={handleConnect} />
            ))}
          </div>
        </div>
      )}
      
      {/* النتائج */}
      {loading
        ? <LoadingSkeleton count={5} />
        : results.map(p => (
          <ParticipantCard key={p.id} participant={p} onConnect={handleConnect} />
        ))
      }
      
      {!loading && results.length === 0 && (
          <EmptyState icon="🔍" text="لا توجد نتائج مطابقة لبحثك" />
      )}
    </div>
  );
};

// ── بطاقة المشارك ─────────────────────────────────────────────────
const ParticipantCard = ({ participant: p, onConnect }) => {
  const isLightTheme = getIsLightTheme();
  const statusColors = {
    none: isLightTheme ? '#64748B' : 'rgba(255,255,255,0.6)',
    pending: isLightTheme ? '#D97706' : '#D4AF37',
    accepted: '#22c55e',
    declined: '#ef4444'
  };
  const statusLabels = {
    none: 'تواصل',
    pending: 'معلّق',
    accepted: 'متصل ✓',
    declined: 'مرفوض'
  };

  return (
    <div style={{
      background: isLightTheme ? '#FFFFFF' : 'rgba(255,255,255,0.04)', 
      borderRadius:12, 
      padding:14,
      marginBottom:10, 
      border: isLightTheme ? '1px solid rgba(15,23,42,0.06)' : '1px solid rgba(255,255,255,0.06)',
      display:'flex', 
      alignItems:'center', 
      gap:12,
      boxShadow: isLightTheme ? '0 4px 12px rgba(15,23,42,0.02)' : 'none'
    }} dir="rtl">
      
      {/* Avatar */}
      <div style={{
        width:48, height:48, borderRadius:'50%', flexShrink:0,
        background: isLightTheme ? '#F1F5F9' : 'linear-gradient(135deg, #050B18, #2A64EC)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:18, border: isLightTheme ? '2px solid rgba(217,119,6,0.2)' : '2px solid rgba(212,175,55,0.3)',
        color: isLightTheme ? '#D97706' : '#FFFFFF'
      }}>
        {p.avatar_url
          ? <img src={p.avatar_url} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} alt="" />
          : p.full_name?.charAt(0)
        }
      </div>
      
      <div style={{ flex:1 }}>
        <div style={{ color: isLightTheme ? '#0F172A' : '#F0F4F2', fontWeight:'bold', fontSize:14, marginBottom:2 }}>{p.full_name}</div>
        <div style={{ color: isLightTheme ? '#475569' : 'rgba(255,255,255,0.5)', fontSize:11, marginBottom:4 }}>{p.council} · {p.role}</div>
        
        {/* التخصصات */}
        {p.specialties?.length > 0 && (
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {p.specialties.slice(0,2).map(s => (
              <span key={s} style={{ 
                background: isLightTheme ? 'rgba(217,119,6,0.08)' : 'rgba(212,175,55,0.1)', 
                color: isLightTheme ? '#D97706' : '#D4AF37', 
                padding:'2px 8px', borderRadius:10, fontSize:10 
              }}>{s}</span>
            ))}
          </div>
        )}
        
        {/* متاح للاجتماع */}
        {p.is_open_to_meet && (
          <span style={{ color:'#22c55e', fontSize:10, marginTop:4, display:'block' }}>📅 متاح للاجتماع</span>
        )}
      </div>
      
      {/* زر الاتصال */}
      {p.connection_status === 'none' && (
        <button
          onClick={() => onConnect(p.id)}
          style={{ 
            background: isLightTheme ? 'rgba(217,119,6,0.08)' : 'rgba(212,175,55,0.15)', 
            color: isLightTheme ? '#D97706' : '#D4AF37', 
            border: isLightTheme ? '1px solid rgba(217,119,6,0.2)' : '1px solid rgba(212,175,55,0.3)', 
            borderRadius:8, padding:'8px 14px', cursor:'pointer', fontFamily:'Cairo', fontSize:12, display:'flex', alignItems:'center', gap:4 
          }}
        >
          <UserPlus size={13} /> تواصل
        </button>
      )}
      {p.connection_status !== 'none' && (
        <span style={{ color: statusColors[p.connection_status], fontSize:12, fontWeight:'bold' }}>
          {statusLabels[p.connection_status]}
        </span>
      )}
    </div>
  );
};

// ── تبويب المحادثات ───────────────────────────────────────────────
const MessagesTab = ({ myId }) => {
  const [connections, setConnections] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const messagesEndRef = useRef(null);
  const isLightTheme = getIsLightTheme();

  useEffect(() => {
    networkingService.getConnections()
      .then(d => setConnections(d.connected || []))
      .catch(err => console.error(err));
  }, []);

  const openChat = async (conn) => {
    setActiveChat(conn);
    try {
        const msgs = await networkingService.getChatHistory(conn.connection_id);
        setMessages(msgs);
        setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
        setConnections(prev => prev.map(c =>
          c.connection_id === conn.connection_id ? { ...c, unread_messages: 0 } : c
        ));
    } catch(err) {
        console.error(err);
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeChat) return;
    try {
        const msg = await networkingService.sendMessage(activeChat.connection_id, newMsg.trim());
        setMessages(prev => [...prev, msg]);
        setNewMsg('');
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }), 50);
    } catch(err) {
        console.error(err);
    }
  };

  if (activeChat) return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }} dir="rtl">
      {/* Chat Header */}
      <div style={{ 
        padding:'12px 16px', 
        borderBottom: isLightTheme ? '1px solid rgba(15,23,42,0.08)' : '1px solid rgba(255,255,255,0.08)', 
        display:'flex', alignItems:'center', gap:10 
      }}>
        <button onClick={() => setActiveChat(null)} style={{ background:'none', border:'none', color: isLightTheme ? '#D97706' : '#D4AF37', cursor:'pointer', fontSize: 28 }}>←</button>
        <div style={{ color: isLightTheme ? '#0F172A' : '#F0F4F2', fontWeight:'bold', fontSize:14 }}>{activeChat.full_name}</div>
        <div style={{ color: isLightTheme ? '#475569' : 'rgba(255,255,255,0.4)', fontSize:11 }}>{activeChat.council}</div>
      </div>
      
      {/* Messages */}
      <div style={{ flex:1, overflow:'auto', padding:16, display:'flex', flexDirection:'column', gap:10 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display:'flex', justifyContent: msg.is_mine ? 'flex-start' : 'flex-end' }}>
            <div style={{
              maxWidth:'75%', padding:'10px 14px', borderRadius:12,
              background: msg.is_mine ? '#2A64EC' : (isLightTheme ? '#E2E8F0' : 'rgba(255,255,255,0.08)'),
              color: msg.is_mine ? '#FFFFFF' : (isLightTheme ? '#0F172A' : '#F0F4F2'), 
              fontSize:13, lineHeight:1.5
            }}>
              {msg.content}
              <div style={{ 
                fontSize:10, 
                color: msg.is_mine ? 'rgba(255,255,255,0.7)' : (isLightTheme ? '#64748B' : 'rgba(255,255,255,0.4)'), 
                marginTop:4, textAlign: msg.is_mine ? 'left' : 'right' 
              }}>
                {msg.is_mine && (msg.is_read ? '✓✓' : '✓')} {new Date(msg.sent_at).toLocaleTimeString('ar', { numberingSystem: 'latn', hour:'2-digit', minute:'2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div style={{ 
        padding:12, 
        borderTop: isLightTheme ? '1px solid rgba(15,23,42,0.08)' : '1px solid rgba(255,255,255,0.08)', 
        display:'flex', gap:8 
      }}>
        <input
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="اكتب رسالتك..."
          style={{ 
            flex:1, padding:'10px 14px', 
            background: isLightTheme ? '#FFFFFF' : 'rgba(255,255,255,0.06)', 
            border: isLightTheme ? '1px solid rgba(15,23,42,0.15)' : '1px solid rgba(255,255,255,0.1)', 
            borderRadius:20, 
            color: isLightTheme ? '#0F172A' : '#F0F4F2', 
            fontFamily:'Cairo', fontSize:13, outline:'none' 
          }}
        />
        <button onClick={sendMessage}
          style={{ 
            width:40, height:40, borderRadius:'50%', 
            background: isLightTheme ? '#D97706' : '#D4AF37', 
            border:'none', cursor:'pointer', color:'#FFFFFF', fontWeight:'bold', 
            display:'flex', alignItems:'center', justifyContent:'center', fontSize: 18 
          }}>
          ←
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ padding:16 }} dir="rtl">
      <h3 style={{ color: isLightTheme ? '#475569' : 'rgba(255,255,255,0.6)', fontSize:13, marginBottom:12 }}>محادثاتك</h3>
      {connections.length === 0
        ? <EmptyState icon="💬" text="لا محادثات بعد — تواصل مع أحد المشاركين" />
        : connections.map(conn => (
          <div key={conn.connection_id}
            onClick={() => openChat(conn)}
            style={{ 
              display:'flex', alignItems:'center', gap:12, padding:14, borderRadius:12, marginBottom:8, 
              background: isLightTheme ? '#FFFFFF' : 'rgba(255,255,255,0.04)', 
              border: isLightTheme ? '1px solid rgba(15,23,42,0.06)' : '1px solid rgba(255,255,255,0.06)', 
              cursor:'pointer',
              boxShadow: isLightTheme ? '0 4px 12px rgba(15,23,42,0.02)' : 'none'
            }}
          >
            <div style={{ 
              width:42, height:42, borderRadius:'50%', 
              background: isLightTheme ? '#E2E8F0' : 'linear-gradient(135deg, #050B18, #2A64EC)', 
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, position:'relative',
              color: isLightTheme ? '#D97706' : '#FFFFFF'
            }}>
              {conn.full_name?.charAt(0)}
              {conn.unread_messages > 0 && (
                <span style={{ position:'absolute', top:-2, right:-2, background:'#ef4444', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:9, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold' }}>
                  {conn.unread_messages}
                </span>
              )}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ color: isLightTheme ? '#0F172A' : '#F0F4F2', fontWeight: conn.unread_messages > 0 ? 'bold' : 'normal', fontSize:14 }}>{conn.full_name}</div>
              <div style={{ color: isLightTheme ? '#475569' : 'rgba(255,255,255,0.4)', fontSize:11 }}>{conn.council}</div>
            </div>
            <ChevronRight size={16} color={isLightTheme ? '#94A3B8' : 'rgba(255,255,255,0.3)'} />
          </div>
        ))
      }
    </div>
  );
};

// ── مكوّنات مساعدة ──────────────────────────────────────────────────
const LoadingSkeleton = ({ count }) => {
  const isLightTheme = getIsLightTheme();
  return Array(count).fill(0).map((_, i) => (
    <div key={i} style={{ 
      height:80, 
      background: isLightTheme ? '#FFFFFF' : 'rgba(255,255,255,0.04)', 
      borderRadius:12, marginBottom:10, animation:'pulse 1.5s infinite',
      border: isLightTheme ? '1px solid rgba(15,23,42,0.06)' : 'none'
    }} />
  ));
};

const EmptyState = ({ icon, text }) => {
  const isLightTheme = getIsLightTheme();
  return (
    <div style={{ textAlign:'center', padding:40, color: isLightTheme ? '#94A3B8' : 'rgba(255,255,255,0.3)' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:13, fontFamily:'Cairo' }}>{text}</div>
    </div>
  );
};

const ProfileCompletionBadge = ({ participant }) => {
  const isLightTheme = getIsLightTheme();
  return (
    <div style={{ 
      background: isLightTheme ? 'rgba(217,119,6,0.08)' : 'rgba(212,175,55,0.1)', 
      border: isLightTheme ? '1px solid rgba(217,119,6,0.2)' : '1px solid rgba(212,175,55,0.2)', 
      borderRadius:20, padding:'4px 12px', color: isLightTheme ? '#D97706' : '#D4AF37', fontSize:11 
    }}>
      <Award size={12} style={{ display:'inline', marginLeft:4 }} />
      {participant?.full_name?.split(' ')[0]}
    </div>
  );
};

const RecommendationCard = ({ participant: p, onConnect }) => {
  const isLightTheme = getIsLightTheme();
  return (
    <div style={{ 
      minWidth:150, 
      background: isLightTheme ? '#FFFFFF' : 'rgba(255,255,255,0.04)', 
      borderRadius:12, padding:12, 
      border: isLightTheme ? '1px solid rgba(217,119,6,0.2)' : '1px solid rgba(212,175,55,0.15)', 
      textAlign:'center',
      boxShadow: isLightTheme ? '0 4px 12px rgba(15,23,42,0.02)' : 'none'
    }}>
      <div style={{ 
        width:40, height:40, borderRadius:'50%', 
        background: isLightTheme ? '#F1F5F9' : 'linear-gradient(135deg, #050B18, #2A64EC)', 
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, margin:'0 auto 8px',
        color: isLightTheme ? '#D97706' : '#FFFFFF'
      }}>
        {p.full_name?.charAt(0)}
      </div>
      <div style={{ color: isLightTheme ? '#0F172A' : '#F0F4F2', fontSize:12, fontWeight:'bold', marginBottom:2 }}>{p.full_name?.split(' ')[0]}</div>
      <div style={{ color: isLightTheme ? '#475569' : 'rgba(255,255,255,0.4)', fontSize:10, marginBottom:6 }}>{p.match_score}% توافق</div>
      <div style={{ color: isLightTheme ? '#B45309' : 'rgba(212,175,55,0.7)', fontSize:10, marginBottom:8 }}>{p.match_reasons?.[0]}</div>
      
      {p.connection_status === 'pending' ? (
        <button disabled style={{ background: isLightTheme ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.1)', color: isLightTheme ? '#475569' : 'rgba(255,255,255,0.5)', border:'none', borderRadius:8, padding:'5px 12px', fontFamily:'Cairo', fontSize:11 }}>
          طلب مرسل
        </button>
      ) : (
        <button onClick={() => onConnect(p.id)}
          style={{ 
            background: isLightTheme ? 'rgba(217,119,6,0.08)' : 'rgba(212,175,55,0.15)', 
            color: isLightTheme ? '#D97706' : '#D4AF37', 
            border: isLightTheme ? '1px solid rgba(217,119,6,0.2)' : '1px solid rgba(212,175,55,0.3)', 
            borderRadius:8, padding:'5px 12px', cursor:'pointer', fontFamily:'Cairo', fontSize:11 
          }}>
          تواصل
        </button>
      )}
    </div>
  );
};

export default NetworkingHub;
