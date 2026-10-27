import { useState } from 'react';
import { Database, Target, Radio, Settings, ShieldAlert } from 'lucide-react';
import CurriculumManagerTab from '../components/admin/CurriculumManagerTab';
import GrandMockTab from '../components/admin/GrandMockTab';
import LiveQuizTab from '../components/admin/LiveQuizTab';
import AdminDataManager from '../components/admin/AdminDataManager';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('curriculum');

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16 pt-4">
      
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-md p-8 rounded-3xl border border-rose-500/20 shadow-2xl flex items-center gap-6">
        <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-rose-400">
          <ShieldAlert size={36} />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Command Center</h1>
          <p className="text-rose-400 font-bold tracking-widest uppercase text-xs mt-2">System Management & Analytics</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto custom-scrollbar border-b border-slate-800 pb-4 gap-2">
        <TabButton 
          active={activeTab === 'curriculum'} 
          onClick={() => setActiveTab('curriculum')} 
          icon={Database} 
          label="Curriculum & Daily Flow" 
        />
        <TabButton 
          active={activeTab === 'grand'} 
          onClick={() => setActiveTab('grand')} 
          icon={Target} 
          label="Grand Subject Exams" 
        />
        <TabButton 
          active={activeTab === 'live'} 
          onClick={() => setActiveTab('live')} 
          icon={Radio} 
          label="Live Quiz Manager" 
        />
        <TabButton 
          active={activeTab === 'data'} 
          onClick={() => setActiveTab('data')} 
          icon={Settings} 
          label="Data & User Management" 
        />
      </div>

      {/* Tab Content */}
      <div className="pt-4">
        {activeTab === 'curriculum' && <CurriculumManagerTab />}
        {activeTab === 'grand' && <GrandMockTab />}
        {activeTab === 'live' && <LiveQuizTab />}
        {activeTab === 'data' && <AdminDataManager />}
      </div>

    </div>
  );
}

// Reusable Tab Button
function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all border whitespace-nowrap ${
        active 
        ? 'bg-brand-500/10 border-brand-500/50 text-brand-400 shadow-inner' 
        : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  );
}