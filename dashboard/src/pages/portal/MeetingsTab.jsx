import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Check, X, UserPlus, Info } from 'lucide-react';
import networkingService from '../../services/networkingService';

const MeetingsTab = ({ myId }) => {
  const [meetings, setMeetings] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Propose Meeting State
  const [isProposing, setIsProposing] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [duration, setDuration] = useState(15);
  const [locationNote, setLocationNote] = useState('');
  const [agenda, setAgenda] = useState('');

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const data = await networkingService.getMySchedule();
      setMeetings(data || []);
      
      const conns = await networkingService.getConnections();
      setConnections(conns.connected || []);
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handlePropose = async (e) => {
    e.preventDefault();
    if (!selectedConnection || !proposedDate || !proposedTime) return;

    try {
      // Combine date and time to ISO format
      const isoDateTime = `${proposedDate}T${proposedTime}:00`;
      
      await networkingService.proposeMeeting(selectedConnection, {
        proposed_time: isoDateTime,
        duration_minutes: duration,
        location_note: locationNote,
        agenda: agenda
      });
      
      setIsProposing(false);
      // Reset form
      setSelectedConnection(''); setProposedDate(''); setProposedTime('');
      setLocationNote(''); setAgenda('');
      
      fetchMeetings();
    } catch (error) {
      console.error("Failed to propose meeting:", error);
      alert("حدث خطأ أثناء إرسال طلب الاجتماع.");
    }
  };

  const handleRespond = async (meetingId, action) => {
    try {
      await networkingService.respondToMeeting(meetingId, action);
      fetchMeetings();
    } catch (error) {
      console.error(`Failed to ${action} meeting:`, error);
      alert("حدث خطأ أثناء معالجة الطلب.");
    }
  };

  // Group meetings
  const pendingRequests = meetings.filter(m => m.status === 'proposed' && !m.i_proposed);
  const myProposals = meetings.filter(m => m.status === 'proposed' && m.i_proposed);
  const confirmedMeetings = meetings.filter(m => m.status === 'confirmed');

  // Format Date Helper
  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    return {
      date: d.toLocaleDateString('ar', { month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div style={{ padding: 16 }} dir="rtl">
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0 }}>جدول الاجتماعات</h3>
        <button 
          onClick={() => setIsProposing(!isProposing)}
          style={{ background: '#D4AF37', color: '#050B18', border: 'none', borderRadius: 20, padding: '6px 14px', fontFamily: 'Cairo', fontSize: 12, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Calendar size={14} /> طلب اجتماع جديد
        </button>
      </div>

      {isProposing && (
        <form onSubmit={handlePropose} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, marginBottom: 24, border: '1px solid rgba(212,175,55,0.3)' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#D4AF37', fontSize: 14 }}>تفاصيل الاجتماع</h4>
          
          <select required value={selectedConnection} onChange={e => setSelectedConnection(e.target.value)} style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', marginBottom: 10, fontFamily: 'Cairo' }}>
            <option value="">-- اختر شخصاً لطلب اجتماع --</option>
            {connections.map(c => (
              <option key={c.connection_id} value={c.connection_id}>{c.full_name} ({c.council})</option>
            ))}
          </select>
          
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <input required type="date" value={proposedDate} onChange={e => setProposedDate(e.target.value)} style={{ flex: 1, padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontFamily: 'Cairo' }} />
            <input required type="time" value={proposedTime} onChange={e => setProposedTime(e.target.value)} style={{ flex: 1, padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontFamily: 'Cairo' }} />
          </div>
          
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={{ flex: 1, padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontFamily: 'Cairo' }}>
              <option value={15}>15 دقيقة</option>
              <option value={30}>30 دقيقة</option>
              <option value={45}>45 دقيقة</option>
              <option value={60}>ساعة واحدة</option>
            </select>
            <input placeholder="المكان (مثال: ردهة الفندق)" value={locationNote} onChange={e => setLocationNote(e.target.value)} style={{ flex: 2, padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontFamily: 'Cairo' }} />
          </div>
          
          <textarea placeholder="موضوع الاجتماع / الأجندة" value={agenda} onChange={e => setAgenda(e.target.value)} style={{ width: '100%', padding: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontFamily: 'Cairo', marginBottom: 12, minHeight: 60, boxSizing: 'border-box' }} />
          
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={{ flex: 1, background: '#D4AF37', color: '#050B18', border: 'none', borderRadius: 8, padding: 10, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Cairo' }}>إرسال الطلب</button>
            <button type="button" onClick={() => setIsProposing(false)} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: 10, cursor: 'pointer', fontFamily: 'Cairo' }}>إلغاء</button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: 'rgba(255,255,255,0.4)' }}>جاري التحميل...</div>
      ) : meetings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
          <Calendar size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontFamily: 'Cairo' }}>لا توجد اجتماعات في جدولك</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Pending Requests Received */}
          {pendingRequests.length > 0 && (
            <div>
              <h4 style={{ color: '#D4AF37', margin: '0 0 10px 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14}/> طلبات واردة بانتظار ردك</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingRequests.map(m => (
                  <MeetingCard key={m.meeting_id} meeting={m} formatter={formatDateTime} onRespond={handleRespond} />
                ))}
              </div>
            </div>
          )}

          {/* Confirmed Meetings */}
          {confirmedMeetings.length > 0 && (
            <div>
              <h4 style={{ color: '#22c55e', margin: '0 0 10px 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14}/> مؤكدة</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {confirmedMeetings.map(m => (
                  <MeetingCard key={m.meeting_id} meeting={m} formatter={formatDateTime} isConfirmed />
                ))}
              </div>
            </div>
          )}

          {/* My Proposals (Pending) */}
          {myProposals.length > 0 && (
            <div>
              <h4 style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 10px 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14}/> بانتظار رد الطرف الآخر</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myProposals.map(m => (
                  <MeetingCard key={m.meeting_id} meeting={m} formatter={formatDateTime} isWaiting />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

// ── Meeting Card Component ───────────────────────────────────────
const MeetingCard = ({ meeting, formatter, onRespond, isConfirmed, isWaiting }) => {
  const { date, time } = formatter(meeting.proposed_time);
  
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14,
      border: `1px solid ${isConfirmed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.06)'}`,
      borderRight: isConfirmed ? '3px solid #22c55e' : 'none'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4 }}>اجتماع مع:</div>
          <div style={{ color: '#F0F4F2', fontWeight: 'bold', fontSize: 14 }}>{meeting.with.full_name}</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{meeting.with.council}</div>
        </div>
        <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: 8 }}>
          <div style={{ color: '#D4AF37', fontWeight: 'bold', fontSize: 13 }}>{time}</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{date}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 12, background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} color="#D4AF37"/> {meeting.duration_minutes} دقيقة</div>
        {meeting.location_note && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} color="#D4AF37"/> {meeting.location_note}</div>}
        {meeting.agenda && <div style={{ width: '100%', marginTop: 4, color: 'rgba(255,255,255,0.5)' }}>📝 {meeting.agenda}</div>}
      </div>

      {onRespond && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={() => onRespond(meeting.meeting_id, 'confirm')}
            style={{ flex: 1, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontFamily: 'Cairo', fontSize: 12, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          ><Check size={14}/> تأكيد الموعد</button>
          <button 
            onClick={() => onRespond(meeting.meeting_id, 'decline')}
            style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, cursor: 'pointer', fontFamily: 'Cairo', fontSize: 12 }}
          >رفض</button>
        </div>
      )}
      
      {isWaiting && (
         <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center' }}>تم الإرسال... بانتظار التأكيد</div>
      )}
    </div>
  );
};

export default MeetingsTab;
