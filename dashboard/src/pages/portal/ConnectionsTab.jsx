import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, X, Search, MoreVertical, FileText } from 'lucide-react';
import networkingService from '../../services/networkingService';

const ConnectionsTab = ({ onBadgeUpdate, myId }) => {
  const [pending, setPending] = useState([]);
  const [connected, setConnected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const data = await networkingService.getConnections();
      setPending(data.pending_incoming || []);
      setConnected(data.connected || []);
      onBadgeUpdate(prev => ({
        ...prev,
        pending_count: data.pending_incoming?.length || 0
      }));
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleRespond = async (connectionId, action) => {
    try {
      await networkingService.respondToRequest(connectionId, action);
      // Refresh the lists
      fetchConnections();
    } catch (error) {
      console.error(`Failed to ${action} connection:`, error);
      alert(`حدث خطأ أثناء معالجة الطلب.`);
    }
  };

  const handleDownloadVCard = async (participantId) => {
    try {
      await networkingService.downloadVCard(participantId);
    } catch (error) {
      console.error("Failed to download vCard:", error);
      alert("حدث خطأ أثناء تحميل بطاقة الاتصال.");
    }
  };

  const filteredConnected = connected.filter(c => 
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.council?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 16 }} dir="rtl">
      
      {/* Pending Requests */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#D4AF37', fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserPlus size={16} /> طلبات معلقة ({pending.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map(req => (
              <div key={req.connection_id} style={{
                background: 'rgba(212,175,55,0.05)', borderRadius: 12, padding: 14,
                border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'flex-start', gap: 12
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #022C22, #1DB58A)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, border: '2px solid rgba(212,175,55,0.3)'
                }}>
                  {req.avatar_url ? (
                    <img src={req.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                  ) : (
                    req.full_name?.charAt(0)
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#F0F4F2', fontWeight: 'bold', fontSize: 14 }}>{req.full_name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 6 }}>{req.council} · {req.role}</div>
                  {req.message && (
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 8, fontStyle: 'italic' }}>
                      "{req.message}"
                    </div>
                  )}
                  {req.via_qr && (
                    <div style={{ color: '#D4AF37', fontSize: 10, marginBottom: 8 }}>📷 تم عبر مسح الشارة</div>
                  )}
                  
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      onClick={() => handleRespond(req.connection_id, 'accept')}
                      style={{ flex: 1, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontFamily: 'Cairo', fontSize: 12, fontWeight: 'bold' }}
                    >
                      قبول
                    </button>
                    <button 
                      onClick={() => handleRespond(req.connection_id, 'decline')}
                      style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: '8px', cursor: 'pointer', fontFamily: 'Cairo', fontSize: 12 }}
                    >
                      رفض
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected List */}
      <div>
        <h3 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
             <UserCheck size={16} /> شبكتي ({connected.length})
          </span>
        </h3>
        
        {connected.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="البحث في اتصالاتي..."
              style={{ width: '100%', padding: '10px 40px 10px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#F0F4F2', fontFamily: 'Cairo', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {loading ? (
           <div style={{ textAlign: 'center', padding: 20, color: 'rgba(255,255,255,0.4)' }}>جاري التحميل...</div>
        ) : filteredConnected.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
            <UserPlus size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontSize: 14, fontFamily: 'Cairo' }}>{search ? 'لا توجد نتائج مطابقة' : 'ليس لديك اتصالات بعد'}</div>
            {!search && <div style={{ fontSize: 12, marginTop: 4 }}>تصفح الدليل للبحث عن أشخاص وتوسيع شبكتك.</div>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredConnected.map(conn => (
              <div key={conn.connection_id} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12,
                border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #022C22, #1DB58A)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, position: 'relative'
                }}>
                  {conn.avatar_url ? (
                    <img src={conn.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                  ) : (
                    conn.full_name?.charAt(0)
                  )}
                  {conn.unread_messages > 0 && (
                     <div style={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, background: '#ef4444', borderRadius: '50%', border: '2px solid #0A3D2B' }} />
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#F0F4F2', fontWeight: 'bold', fontSize: 14 }}>{conn.full_name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{conn.council}</div>
                </div>

                <button 
                  onClick={() => handleDownloadVCard(conn.participant_id)}
                  title="حفظ جهة الاتصال (vCard)"
                  style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <FileText size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionsTab;
