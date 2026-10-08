import { useState } from 'react';
import { Database, Target, Radio, Settings } from 'lucide-react'; // Added Settings icon
import CurriculumManagerTab from '../components/admin/CurriculumManagerTab';
import GrandMockTab from '../components/admin/GrandMockTab';
import LiveQuizTab from '../components/admin/LiveQuizTab';
import AdminDataManager from '../components/admin/AdminDataManager'; // Import the new component

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('curriculum');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Command Center</h1>
          <p className="text-slate-400">Manage curriculum, build exams, and monitor platform activity.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto custom-scrollbar border-b border-slate-800 pb-2">
        <div className="flex gap-2">
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
          {/* NEW: Data & Progress Tab */}
          <TabButton 
            active={activeTab === 'data'} 
            onClick={() => setActiveTab('data')} 
            icon={Settings} 
            label="Data & User Management" 
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'curriculum' && <CurriculumManagerTab />}
        {activeTab === 'grand' && <GrandMockTab />}
        {activeTab === 'live' && <LiveQuizTab />}
        {activeTab === 'data' && <AdminDataManager />} {/* Render the new component */}
      </div>

    </div>
  );
}

// Reusable Tab Button
function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-sm transition whitespace-nowrap ${
        active 
        ? 'bg-brand-500 text-slate-950 border-b-4 border-slate-950' 
        : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/50 border-b-4 border-transparent'
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  );
}