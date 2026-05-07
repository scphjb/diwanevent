import React, { useState, useEffect } from 'react';
import { ChevronDown, Calendar, CheckCircle2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

const EventSelector = ({ selectedEventId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState([
    { id: 1, name: 'مؤتمر القضاء الدولي 2026', date: '2026-05-15', status: 'active' },
    { id: 2, name: 'ندوة التحول الرقمي', date: '2026-06-10', status: 'draft' },
    { id: 3, name: 'منتدى القانون العربي', date: '2026-04-20', status: 'completed' },
  ]);

  const selectedEvent = events.find(e => e.id === selectedEventId) || events[0];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-4 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-white"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center border border-emerald-500/30">
          <Globe className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="text-right">
          <div className="text-xs text-emerald-400/50 mb-0.5">الفعالية النشطة</div>
          <div className="font-semibold text-sm max-w-[200px] truncate">{selectedEvent.name}</div>
        </div>
        <ChevronDown className={cn("w-5 h-5 text-amber-500 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full right-0 mt-3 w-80 bg-[#022C22] border border-white/10 rounded-3xl shadow-2xl z-20 overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 bg-white/5">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">اختر الفعالية</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => {
                      onSelect(event.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-right",
                      selectedEventId === event.id && "bg-emerald-600/10 border-r-4 border-amber-500"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      selectedEventId === event.id ? "bg-amber-500 text-emerald-950" : "bg-white/5 text-emerald-400"
                    )}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">{event.name}</div>
                      <div className="text-xs text-emerald-400/40">{event.date}</div>
                    </div>
                    {selectedEventId === event.id && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                  </button>
                ))}
              </div>
              <div className="p-4 bg-emerald-950/50 border-t border-white/5">
                <button className="w-full py-2.5 rounded-xl border border-dashed border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-500/5 transition-all">
                  + إنشاء فعالية جديدة
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventSelector;
