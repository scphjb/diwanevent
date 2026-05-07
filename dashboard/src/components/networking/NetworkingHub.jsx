import React, { useState } from 'react';
import { UserPlus, MessageSquare, Target, MapPin, Star, Sparkles } from 'lucide-react';

const NetworkingHub = () => {
  const [recommendations] = useState([
    {
      id: 1,
      name: "Dr. Sarah Ahmed",
      role: "AI Research Lead at TechGen",
      matchScore: 98,
      interests: ["Machine Learning", "Event Tech", "Data Privacy"],
      location: "Main Hall - Zone A",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
    },
    {
      id: 2,
      name: "Eng. Khalid Mansour",
      role: "CTO @ Future Systems",
      matchScore: 92,
      interests: ["IoT", "Blockchain", "Smart Cities"],
      location: "Workshop Area",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Khalid"
    },
    {
      id: 3,
      name: "Maria Garcia",
      role: "Marketing Director",
      matchScore: 85,
      interests: ["Social Engagement", "Branding"],
      location: "Exhibition Booth 12",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria"
    }
  ]);

  return (
    <div className="p-6 bg-[#0a0f0d] min-h-screen text-slate-200">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-2 text-[#d4af37] mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-widest">AI Matchmaking</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white">Networking Hub</h1>
            <p className="text-slate-400 mt-2">Discover high-value connections tailored to your professional interests.</p>
          </div>
          <div className="bg-[#103a2b]/30 border border-[#103a2b] px-4 py-2 rounded-2xl flex items-center gap-3">
            <Target className="text-[#50C878] w-5 h-5" />
            <span className="text-white font-bold">95% Profile Accuracy</span>
          </div>
        </div>

        {/* Recommendations Grid */}
        <div className="grid gap-6">
          {recommendations.map((person) => (
            <div 
              key={person.id}
              className="group relative bg-[#121a16] border border-slate-800 rounded-[2rem] p-6 hover:border-[#103a2b] transition-all duration-500 overflow-hidden"
            >
              {/* Match Score Badge */}
              <div className="absolute top-0 right-0 bg-gradient-to-l from-[#103a2b] to-transparent px-8 py-4 rounded-bl-[2rem]">
                <div className="text-right">
                  <div className="text-[#50C878] text-2xl font-black">{person.matchScore}%</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-tighter">Match Score</div>
                </div>
              </div>

              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="relative">
                  <img src={person.avatar} alt={person.name} className="w-24 h-24 rounded-3xl bg-[#0a0f0d] border-2 border-slate-800 p-1" />
                  <div className="absolute -bottom-2 -right-2 bg-[#50C878] p-1.5 rounded-xl shadow-lg border-2 border-[#121a16]">
                    <Star className="w-4 h-4 text-white fill-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">{person.name}</h3>
                  <p className="text-[#d4af37] text-sm font-medium mb-4">{person.role}</p>
                  
                  {/* Interests */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {person.interests.map(interest => (
                      <span key={interest} className="text-[10px] bg-slate-800/50 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                        {interest}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4">
                    <button className="flex-1 bg-[#103a2b] hover:bg-[#1a5a43] text-white font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all">
                      <UserPlus className="w-4 h-4" />
                      Connect Now
                    </button>
                    <button className="bg-slate-800 hover:bg-slate-700 p-3 rounded-2xl transition-all">
                      <MessageSquare className="w-5 h-5" />
                    </button>
                    <button className="bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-2xl flex items-center gap-2 transition-all">
                      <MapPin className="w-4 h-4 text-[#d4af37]" />
                      <span className="text-xs font-bold">{person.location}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NetworkingHub;
