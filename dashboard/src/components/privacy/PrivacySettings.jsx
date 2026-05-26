import React, { useState } from 'react';
import { Shield, Eye, MapPin, Trash2, Download, CheckCircle2, Lock } from 'lucide-react';

const PrivacySettings = () => {
  const [settings, setSettings] = useState({
    locationTracking: true,
    publicProfile: false,
    aiMatchmaking: true,
    dataSharing: false
  });

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-8 bg-[#0a0f0d] min-h-screen text-slate-200">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex p-4 bg-brand-primary/10 rounded-full mb-4 border border-brand-primary/20">
            <Shield className="w-10 h-10 text-brand-primary" />
          </div>
          <h1 className="text-3xl font-black text-white">Privacy Management</h1>
          <p className="text-slate-400 mt-2">You are in full control of your digital presence at Diwan Event.</p>
        </div>

        {/* Settings Groups */}
        <div className="space-y-4">
          {/* Spatial Privacy */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 hover:border-brand-primary/30 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Real-time Location</h3>
                  <p className="text-xs text-slate-500">Allow organizers to see your location for crowd management.</p>
                </div>
              </div>
              <button 
                onClick={() => toggleSetting('locationTracking')}
                className={`w-14 h-8 rounded-full transition-all relative ${settings.locationTracking ? 'bg-brand-primary' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.locationTracking ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {/* Social Privacy */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 hover:border-brand-primary/30 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Public Professional Profile</h3>
                  <p className="text-xs text-slate-500">Make your LinkedIn and interests visible to other participants.</p>
                </div>
              </div>
              <button 
                onClick={() => toggleSetting('publicProfile')}
                className={`w-14 h-8 rounded-full transition-all relative ${settings.publicProfile ? 'bg-brand-primary' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.publicProfile ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {/* AI Ethics */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 hover:border-brand-primary/30 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">AI Matchmaking Processing</h3>
                  <p className="text-xs text-slate-500">Allow our AI to analyze your interests for networking recommendations.</p>
                </div>
              </div>
              <button 
                onClick={() => toggleSetting('aiMatchmaking')}
                className={`w-14 h-8 rounded-full transition-all relative ${settings.aiMatchmaking ? 'bg-brand-primary' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.aiMatchmaking ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Data Rights (GDPR) */}
        <div className="mt-12 p-8 border-2 border-dashed border-slate-800 rounded-[3rem] text-center">
          <h3 className="text-xl font-bold text-white mb-4">Your Data Rights (GDPR)</h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-3xl flex items-center gap-2 transition-all">
              <Download className="w-5 h-5 text-indigo-400" />
              Export My Data
            </button>
            <button className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-8 py-4 rounded-3xl flex items-center gap-2 transition-all">
              <Trash2 className="w-5 h-5" />
              Right to be Forgotten
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-6">
            <CheckCircle2 className="inline w-3 h-3 mr-1" />
            Encryption at rest enabled for all personal data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;
