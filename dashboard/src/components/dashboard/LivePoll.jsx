import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import useAttendanceSocket from '../../hooks/useAttendanceSocket';

const LivePoll = ({ eventId }) => {
  const [activePoll, setActivePoll] = useState(null);
  const [results, setResults] = useState([]);

  // Fetch initial active poll
  useEffect(() => {
    // Mock or API call
    const poll = {
      id: 1,
      question: 'ما رأيك في مستوى التحول الرقمي في المؤسسة؟',
      options: [
        { id: 1, text: 'ممتاز جداً' },
        { id: 2, text: 'جيد' },
        { id: 3, text: 'يحتاج تحسين' },
        { id: 4, text: 'ضعيف' }
      ]
    };
    setActivePoll(poll);
    setResults(poll.options.map(o => ({ option_id: o.id, count: 0 })));
  }, [eventId]);

  // Listen for real-time votes
  useAttendanceSocket(eventId, (message) => {
    if (message.type === 'poll_update' && message.data.poll_id === activePoll?.id) {
      setResults(message.data.results);
    }
  });

  if (!activePoll) return null;

  const chartData = activePoll.options.map(opt => {
    const res = results.find(r => r.option_id === opt.id);
    return {
      name: opt.text,
      votes: res ? res.count : 0
    };
  });

  const totalVotes = results.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 backdrop-blur-xl">
      <div className="text-center mb-10">
        <span className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-widest border border-amber-500/20 mb-4 inline-block">
          تصويت مباشر
        </span>
        <h2 className="text-3xl font-black text-white">{activePoll.question}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Results List */}
        <div className="space-y-6">
          {chartData.map((data, idx) => {
            const percentage = totalVotes > 0 ? Math.round((data.votes / totalVotes) * 100) : 0;
            return (
              <div key={data.name} className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-brand-secondary">{data.name}</span>
                  <span className="text-amber-500">{percentage}% ({data.votes})</span>
                </div>
                <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className="h-full bg-brand-primary rounded-full"
                  />
                </div>
              </div>
            );
          })}
          <div className="pt-6 border-t border-white/5 text-center text-brand-secondary/30 text-sm">
            إجمالي الأصوات: {totalVotes}
          </div>
        </div>

        {/* Visual Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" hide />
              <YAxis hide />
              <Bar dataKey="votes" radius={[10, 10, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#D4AF37' : '#2A64EC'} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default LivePoll;
