import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, Sparkles, User } from 'lucide-react';

const AIConcierge = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Welcome to Diwan Event! I am your AI Concierge. How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // محاكاة استجابة الذكاء الاصطناعي (LLM Response)
    setTimeout(() => {
      const botMsg = { 
        role: 'bot', 
        content: `Based on your interest in AI, I recommend attending the "Generative Models" session at 2:00 PM in Hall B. Would you like me to add it to your calendar?` 
      };
      setMessages(prev => [...prev, botMsg]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-br from-[#103a2b] to-[#d4af37] p-5 rounded-full shadow-[0_10px_40px_rgba(16,58,43,0.5)] hover:scale-110 transition-all group"
        >
          <MessageCircle className="w-8 h-8 text-white" />
          <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce">AI LIVE</div>
        </button>
      ) : (
        <div className="w-[400px] h-[600px] bg-[#0a0f0d] border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
          {/* Header */}
          <div className="bg-[#103a2b] p-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Bot className="w-6 h-6 text-[#d4af37]" />
              </div>
              <div>
                <h3 className="text-white font-bold">Diwan Concierge</h3>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">Online & Thinking</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white"><X /></button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                  msg.role === 'user' 
                  ? 'bg-[#d4af37] text-black font-medium rounded-tr-none' 
                  : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-6 bg-slate-900/50 border-t border-slate-800">
            <div className="relative">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="w-full bg-black border border-slate-700 rounded-2xl py-4 pl-6 pr-14 text-sm text-white focus:border-[#d4af37] transition-all outline-none"
              />
              <button 
                onClick={handleSend}
                className="absolute right-2 top-2 p-2 bg-[#103a2b] rounded-xl hover:bg-[#1a5a43] transition-all"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex justify-center gap-2 mt-4">
              <Sparkles className="w-3 h-3 text-[#d4af37]" />
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Powered by Diwan Sovereign AI</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIConcierge;
