"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, MapPin, Sword, Trash2, Layout, User, Fingerprint, Brain, Heart, Save } from 'lucide-react';
import Link from 'next/link';

// 1. Initialiseer Supabase (slechts één keer!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function BeheerPage() {
  const [projectId, setProjectId] = useState(null);
const [data, setData] = useState<any>({ characters: [], locations: [], items: [] });
  const [activeCategory, setActiveCategory] = useState('characters');
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState('basis');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: projs } = await supabase.from('projects').select('id').limit(1);
      if (projs?.[0]) {
        setProjectId(projs[0].id);
        fetchData(projs[0].id);
      }
    };
    init();
  }, []);

  const fetchData = async (id: any) => {
    const { data: chars } = await supabase.from('characters').select('*').eq('project_id', id).order('name');
    const { data: locs } = await supabase.from('locations').select('*').eq('project_id', id).order('name');
    const { data: its } = await supabase.from('items').select('*').eq('project_id', id).order('name');
    setData({ characters: chars || [], locations: locs || [], items: its || [] });
  };

const activeItem = data[activeCategory]?.find((item: any) => item.id === selectedId);

  const updateField = async (id: any, field: string, value: any)=> {
    setIsSaving(true);
    const { error } = await supabase.from(activeCategory).update({ [field]: value }).eq('id', id);
    if (!error) {
      setData((prev: any) => ({
        ...prev,
        [activeCategory]: prev[activeCategory].map((item: any) => item.id === id ? { ...item, [field]: value } : item)
      }));
    }
    setTimeout(() => setIsSaving(false), 500);
  };

  const addNewItem = async () => {
    const name = `Nieuw(e) ${activeCategory === 'characters' ? 'Karakter' : activeCategory === 'locations' ? 'Locatie' : 'Object'}`;
    const { data: newItem, error } = await supabase.from(activeCategory).insert([{ project_id: projectId, name }]).select().single();
    if (!error) {
      await fetchData(projectId);
      setSelectedId(newItem.id);
      setActiveTab('basis');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je dit wilt verwijderen?')) return;
    await supabase.from(activeCategory).delete().eq('id', selectedId);
    await fetchData(projectId);
    setSelectedId(null);
  };

  return (
    <div className="flex h-screen bg-stone-100 font-sans text-stone-900 overflow-hidden">
      {/* 1. SIDEBAR */}
      <aside className="w-20 bg-stone-900 flex flex-col items-center py-6 gap-8 border-r border-stone-800">
        <Link href="/" title="Terug naar Editor"><Layout className="text-stone-500 hover:text-white transition-colors" size={24} /></Link>
        <div className="flex flex-col gap-6">
          <button onClick={() => {setActiveCategory('characters'); setSelectedId(null); setActiveTab('basis');}} className={`p-3 rounded-xl transition-all ${activeCategory === 'characters' ? 'bg-orange-800 text-white' : 'text-stone-500 hover:bg-stone-800'}`}><User size={24} /></button>
          <button onClick={() => {setActiveCategory('locations'); setSelectedId(null); setActiveTab('basis');}} className={`p-3 rounded-xl transition-all ${activeCategory === 'locations' ? 'bg-orange-800 text-white' : 'text-stone-500 hover:bg-stone-800'}`}><MapPin size={24} /></button>
          <button onClick={() => {setActiveCategory('items'); setSelectedId(null); setActiveTab('basis');}} className={`p-3 rounded-xl transition-all ${activeCategory === 'items' ? 'bg-orange-800 text-white' : 'text-stone-500 hover:bg-stone-800'}`}><Sword size={24} /></button>
        </div>
      </aside>

      {/* 2. MASTER LIJST */}
      <nav className="w-80 bg-white border-r border-stone-200 flex flex-col h-full shadow-sm">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center">
          <h2 className="font-bold uppercase tracking-widest text-xs text-stone-400">{activeCategory}</h2>
          <button onClick={addNewItem} className="p-1 hover:bg-stone-100 rounded-full text-orange-800"><UserPlus size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {data[activeCategory]?.map((item: any) => (
            <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full text-left p-4 border-b border-stone-50 transition-all ${selectedId === item.id ? 'bg-orange-50 border-r-4 border-r-orange-800' : 'hover:bg-stone-50'}`}>
              <div className="font-bold text-sm text-stone-900">{item.name || "Naamloos"}</div>
              <div className="text-xs text-stone-500 truncate mt-1 italic">{item.description || "Geen samenvatting..."}</div>
            </button>
          ))}
        </div>
      </nav>

      {/* 3. DETAIL PANEEL */}
      <main className="flex-1 overflow-y-auto bg-stone-50 p-10">
        {activeItem ? (
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-8 bg-stone-900 text-white flex justify-between items-start">
              <div className="flex-1">
                <input
                  className="bg-transparent text-3xl font-serif font-bold w-full outline-none focus:border-b border-orange-800/50"
                  value={activeItem.name || ""}
                  onChange={(e) => updateField(activeItem.id, 'name', e.target.value)}
                />
                <div className="flex items-center gap-2 mt-2 text-stone-400 text-xs tracking-widest uppercase">
                  <span>{isSaving ? 'Synchroniseren...' : 'Dossier Geselecteerd'}</span>
                </div>
              </div>
              <button onClick={handleDelete} className="text-stone-500 hover:text-red-500 transition-colors p-2">
                <Trash2 size={20}/>
              </button>
            </div>

            <div className="flex border-b border-stone-100 bg-stone-50 px-8">
              <TabButton active={activeTab === 'basis'} onClick={() => setActiveTab('basis')} icon={<User size={14}/>} label="Basis" />
              {activeCategory === 'characters' && (
                <>
                  <TabButton active={activeTab === 'fysiek'} onClick={() => setActiveTab('fysiek')} icon={<Fingerprint size={14}/>} label="Fysiek" />
                  <TabButton active={activeTab === 'psychologie'} onClick={() => setActiveTab('psychologie')} icon={<Brain size={14}/>} label="Psychologie" />
                </>
              )}
            </div>

            <div className="p-10 flex-1">
              {activeTab === 'basis' && (
                <div className="space-y-8">
                  <Field label="Beschrijving" value={activeItem.description} onChange={(v: any) => updateField(activeItem.id, 'description', v)} area />
                  {activeCategory === 'characters' && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-2 gap-8">
                        <Field label="Rol" value={activeItem.role} onChange={(v: any) => updateField(activeItem.id, 'role', v)} />
                        <Field label="Leeftijd" value={activeItem.age} onChange={(v: any) => updateField(activeItem.id, 'age', v)} />
                      </div>
                      <Field label="Kernmotivatie" value={activeItem.motivation} onChange={(v: any) => updateField(activeItem.id, 'motivation', v)} area />
                    </div>
                  )}
                </div>
              )}
              {/* Hier kun je de andere tabs (fysiek/psychologie) ook invullen met Field componenten */}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-stone-300">
            <Layout size={64} className="mb-4 opacity-10" />
            <p className="text-xl font-serif italic text-stone-400">Kies een element om de Codex te openen</p>
          </div>
        )}
      </main>
    </div>
  );
}

// Hulpprogramma's voor de UI
const TabButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 py-4 px-6 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${active ? 'border-orange-800 text-orange-900 bg-white' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
    {icon} {label}
  </button>
);

const Field = ({ label, value, onChange, area, placeholder }: any) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</label>
    {area ? (
      <textarea 
        className="w-full bg-stone-50 border border-stone-100 rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-orange-800 outline-none transition-all min-h-[100px]"
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <input 
        className="w-full bg-stone-50 border border-stone-100 rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-orange-800 outline-none transition-all"
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    )}
  </div>
);