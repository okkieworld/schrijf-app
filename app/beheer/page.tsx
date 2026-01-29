"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, MapPin, Sword, Trash2, Layout, User, Fingerprint, Brain, Heart, Info, Save, Share2, Edit3 } from 'lucide-react';
import Link from 'next/link';

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

  // --- DEBOUNCED SAVE LOGICA ---
  // Deze functie doet het echte werk in de database
  const saveToDatabase = async (id: any, category: string, field: string, value: any) => {
    setIsSaving(true);
    const { error } = await supabase.from(category).update({ [field]: value }).eq('id', id);
    if (error) console.error("Save error:", error.message);
    
    // Even wachten zodat de gebruiker het 'Synchroniseren' label ziet
    setTimeout(() => setIsSaving(false), 800);
  };

  // We maken een 'gebufferde' versie van de save functie
  const debouncedSave = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return (id: any, category: string, field: string, value: any) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => saveToDatabase(id, category, field, value), 500);
      };
    })(),
    []
  );

  // De functie die wordt aangeroepen bij ELKE toetsaanslag
  const handleFieldChange = (id: any, field: string, value: any) => {
    // 1. Update direct de lokale state (voor snelheid in de UI)
    setData((prev: any) => ({
      ...prev,
      [activeCategory]: prev[activeCategory].map((item: any) => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));

    // 2. Start de timer voor de database
    debouncedSave(id, activeCategory, field, value);
  };
  // -----------------------------

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

  // 1. State voor relaties (bovenaan bij je andere states zetten)
const [relations, setRelations] = useState<any[]>([]);
const [newRelation, setNewRelation] = useState({ targetId: '', type: '' });

// 2. Haal relaties op wanneer een karakter wordt geselecteerd
useEffect(() => {
  if (selectedId && activeCategory === 'characters') {
    fetchRelations();
  }
}, [selectedId]);

const fetchRelations = async () => {
  const { data: rels, error } = await supabase
    .from('character_relations')
    .select(`
      id,
      relation_type,
      target_character_id,
      target:characters!target_character_id(name)
    `)
    .eq('source_character_id', selectedId);
  
  if (!error) setRelations(rels || []);
};

// 3. Een relatie opslaan
const addRelation = async () => {
  if (!newRelation.targetId || !newRelation.type) return;

  const { error } = await supabase.from('character_relations').insert([{
    project_id: projectId,
    source_character_id: selectedId,
    target_character_id: newRelation.targetId,
    relation_type: newRelation.type
  }]);

  if (!error) {
    setNewRelation({ targetId: '', type: '' });
    fetchRelations();
  }
};

const deleteRelation = async (relId: string) => {
  await supabase.from('character_relations').delete().eq('id', relId);
  fetchRelations();
};

const [allRelations, setAllRelations] = useState<any[]>([]);

// 1. De functie om alle relaties uit de database te trekken
const fetchAllNetworkData = async () => {
  const { data: relationsData, error } = await supabase
    .from('character_relations')
    .select(`
      id,
      relation_type,
      source:characters!source_character_id(name),
      target:characters!target_character_id(name)
    `);

  if (error) {
    console.error("Fout bij ophalen netwerk:", error);
  } else {
    setAllRelations(relationsData || []);
  }
};

// Zorg dat de data ververst wordt als je op de netwerk-categorie klikt
useEffect(() => {
  if (activeCategory === 'network') {
    fetchAllNetworkData();
  }
}, [activeCategory]);


  return (
    <div className="flex h-screen bg-stone-100 font-sans text-stone-900 overflow-hidden">
      {/* Verticale Navigatie Sidebar voor Architectuur */}
<aside className="w-20 bg-stone-900 flex flex-col items-center py-6 gap-8 border-r border-stone-800 h-screen">
  {/* Link terug naar de Schrijfpagina */}
  <Link href="/" title="Terug naar Editor">
    <div className="p-3 rounded-xl text-stone-500 hover:text-white hover:bg-stone-800 transition-all cursor-pointer">
      <Edit3 size={24} />
    </div>
  </Link>

  <div className="flex flex-col gap-6">
    <button 
      title="Personages"
      onClick={() => {setActiveCategory('characters'); setSelectedId(null);}} 
      className={`p-3 rounded-xl transition-all ${activeCategory === 'characters' ? 'bg-orange-800 text-white' : 'text-stone-500 hover:bg-stone-800'}`}
    >
      <User size={24} />
    </button>

    <button 
      title="Locaties"
      onClick={() => {setActiveCategory('locations'); setSelectedId(null);}} 
      className={`p-3 rounded-xl transition-all ${activeCategory === 'locations' ? 'bg-orange-800 text-white' : 'text-stone-500 hover:bg-stone-800'}`}
    >
      <MapPin size={24} />
    </button>

    <button 
      title="Items"
      onClick={() => {setActiveCategory('items'); setSelectedId(null);}} 
      className={`p-3 rounded-xl transition-all ${activeCategory === 'items' ? 'bg-orange-800 text-white' : 'text-stone-500 hover:bg-stone-800'}`}
    >
      <Sword size={24} />
    </button>

    <button 
      title="Relatie Netwerk"
      onClick={() => {
        setActiveCategory('network'); 
        setSelectedId(null);
      }} 
      className={`p-3 rounded-xl transition-all ${activeCategory === 'network' ? 'bg-orange-800 text-white' : 'text-stone-500 hover:bg-stone-800'}`}
    >
      <Share2 size={24} />
    </button>
  </div>
</aside>

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

<main className="flex-1 overflow-y-auto bg-stone-50 p-10">


{activeCategory === 'network' && (
  <div className="max-w-6xl mx-auto">
    <div className="flex justify-between items-end mb-10 border-b border-stone-200 pb-6">
      <div>
        <h2 className="text-4xl font-serif font-bold text-stone-900 mb-2">Sociale Codex</h2>
        <p className="text-stone-500 italic">Het web van belangen, bloedbanden en vetes.</p>
      </div>
      <div className="text-right">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-800 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
          {allRelations.length} Actieve Verbindingen
        </span>
      </div>
    </div>

    {allRelations.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {allRelations.map((rel) => (
          <div key={rel.id} className="group relative bg-white p-8 rounded-2xl border border-stone-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex flex-col items-center text-center">
              
              {/* Bron */}
              <div className="mb-2">
                <p className="text-xs uppercase tracking-widest text-stone-400 font-bold mb-1">Karakter</p>
                <p className="font-serif text-xl font-bold text-stone-900">{rel.source?.name}</p>
              </div>

              {/* De Connectie */}
              <div className="w-full flex items-center my-4">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-stone-200"></div>
                <div className="px-4 py-1 mx-2 bg-stone-900 text-white rounded text-[10px] font-bold uppercase tracking-tighter transform -rotate-1">
                  {rel.relation_type}
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-stone-200"></div>
              </div>

              {/* Doel */}
              <div>
                <p className="text-xs uppercase tracking-widest text-stone-400 font-bold mb-1">van / voor</p>
                <p className="font-serif text-xl font-bold text-stone-900">{rel.target?.name}</p>
              </div>

            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-[3rem] bg-white/30">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6">
          <Share2 size={32} className="text-stone-300" />
        </div>
        <p className="font-serif italic text-xl text-stone-500">Geen actieve draden gevonden.</p>
        <p className="text-stone-400 text-sm mt-2">Leg verbindingen vast in de individuele karakterdossiers.</p>
      </div>
    )}
  </div>
)}
  
  {activeItem ? (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden min-h-[600px] flex flex-col">
      {/* HEADER */}
      <div className="p-8 bg-stone-900 text-white flex justify-between items-start">
        <div className="flex-1">
          <input
            className="bg-transparent text-3xl font-serif font-bold w-full outline-none focus:border-b border-orange-800/50"
            value={activeItem.name || ""}
            onChange={(e) => handleFieldChange(activeItem.id, 'name', e.target.value)}
          />
          <div className="flex items-center gap-2 mt-2 text-stone-400 text-[10px] tracking-widest uppercase font-bold">
            <div className={`w-2 h-2 rounded-full ${isSaving ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
            <span>{isSaving ? 'Synchroniseren...' : 'Codex Bijgewerkt'}</span>
          </div>
        </div>
        <button onClick={handleDelete} className="text-stone-500 hover:text-red-500 transition-colors p-2">
          <Trash2 size={20}/>
        </button>
      </div>

      {/* TABS - DYNAMISCH PER CATEGORIE */}
      <div className="flex border-b border-stone-100 bg-stone-50 px-8 overflow-x-auto">
        <TabButton active={activeTab === 'basis'} onClick={() => setActiveTab('basis')} icon={<Info size={14}/>} label="Basis" />
        
        {activeCategory === 'characters' && (
          <>
            <TabButton active={activeTab === 'fysiek'} onClick={() => setActiveTab('fysiek')} icon={<Fingerprint size={14}/>} label="Fysiek" />
            <TabButton active={activeTab === 'psychologie'} onClick={() => setActiveTab('psychologie')} icon={<Brain size={14}/>} label="Psychologie" />
            <TabButton active={activeTab === 'relaties'} onClick={() => setActiveTab('relaties')} icon={<Heart size={14}/>} label="Relaties" />
          </>
        )}

        {activeCategory === 'locations' && (
          <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={<MapPin size={14}/>} label="Locatie Details" />
        )}

        {activeCategory === 'items' && (
          <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={<Sword size={14}/>} label="Item Details" />
        )}
      </div>

      {/* CONTENT AREA */}
      <div className="p-10 flex-1">
        {/* ALGEMENE BASIS TAB */}
        {activeTab === 'basis' && (
          <div className="space-y-8">
            <Field label="Algemene Beschrijving" value={activeItem.description} onChange={(v: any) => handleFieldChange(activeItem.id, 'description', v)} area />
            {activeCategory === 'characters' && (
              <div className="grid grid-cols-2 gap-8">
                <Field label="Rol" value={activeItem.role} onChange={(v: any) => handleFieldChange(activeItem.id, 'role', v)} />
                <Field label="Leeftijd" value={activeItem.age} onChange={(v: any) => handleFieldChange(activeItem.id, 'age', v)} />
              </div>
            )}
          </div>
        )}

        {/* KARAKTER SPECIFIEKE TABS */}
        {activeCategory === 'characters' && activeTab === 'fysiek' && (
          <div className="space-y-8">
            <Field label="Uiterlijk" value={activeItem.appearance} onChange={(v: any) => handleFieldChange(activeItem.id, 'appearance', v)} area />
            <Field label="Kenmerkende Kleding" value={activeItem.clothing} onChange={(v: any) => handleFieldChange(activeItem.id, 'clothing', v)} />
            <Field label="Littekens/Tattoos" value={activeItem.scars_marks} onChange={(v: any) => handleFieldChange(activeItem.id, 'scars_marks', v)} />
          </div>
        )}

        {/* PSYCHOLOGIE TAB */}
{activeCategory === 'characters' && activeTab === 'psychologie' && (
  <div className="space-y-8">
    <Field 
      label="Persoonlijkheid & Trekken" 
      value={activeItem.personality} 
      onChange={(v: any) => handleFieldChange(activeItem.id, 'personality', v)} 
      area 
      placeholder="Is hij extravert, melancholisch, opvliegend? Wat zijn de dominante trekken?"
    />
    <div className="grid grid-cols-2 gap-8">
      <Field label="Grootste Angst" value={activeItem.fears} onChange={(v: any) => handleFieldChange(activeItem.id, 'fears', v)} />
      <Field label="Grootste Verlangen" value={activeItem.desires} onChange={(v: any) => handleFieldChange(activeItem.id, 'desires', v)} />
      <Field label="Sterktes" value={activeItem.strengths} onChange={(v: any) => handleFieldChange(activeItem.id, 'strengths', v)} />
      <Field label="Zwaktes" value={activeItem.weaknesses} onChange={(v: any) => handleFieldChange(activeItem.id, 'weaknesses', v)} />
    </div>
  </div>
)}

{/* RELATIES TAB */}
{activeCategory === 'characters' && activeTab === 'relaties' && (
  <div className="space-y-6">
    {/* LINK TOOL - Nu in de juiste leesvolgorde */}
    <div className="bg-orange-50/50 p-6 rounded-xl border border-orange-100 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-widest mb-4 text-orange-900">Nieuwe Verbinding Leggen</h3>
      <div className="flex gap-4 items-end">
        <div className="flex-[0.4]">
          <label className="text-[10px] font-bold uppercase text-stone-400 mb-2 block italic">
            {activeItem.name} is de...
          </label>
          <input 
            value={newRelation.type}
            onChange={(e) => setNewRelation({...newRelation, type: e.target.value})}
            placeholder="vrouw, rivaal, neef..." 
            className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-orange-800"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase text-stone-400 mb-2 block">van / voor</label>
          <select 
            value={newRelation.targetId}
            onChange={(e) => setNewRelation({...newRelation, targetId: e.target.value})}
            className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-orange-800"
          >
            <option value="">Selecteer karakter...</option>
            {data.characters
              .filter((c: any) => c.id !== selectedId)
              .map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
        </div>
        <button 
          onClick={addRelation}
          className="bg-stone-900 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-orange-800 transition-colors shadow-sm"
        >
          Vastleggen
        </button>
      </div>
    </div>

    {/* OVERZICHT LIJST - Nu met de juiste leesvolgorde */}
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-4">Netwerk van {activeItem.name}</h3>
      {relations.length > 0 ? (
        relations.map((rel) => (
          <div key={rel.id} className="flex items-center justify-between p-4 bg-white border border-stone-100 rounded-xl shadow-sm hover:border-orange-200 transition-all">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-stone-400 font-bold leading-none mb-1">Status</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-900">{activeItem.name}</span>
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-900 rounded text-xs font-serif italic border border-orange-200">
                    {rel.relation_type}
                  </span>
                  <span className="text-stone-400">van</span>
                  <span className="font-bold text-stone-900">{rel.target?.name}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => deleteRelation(rel.id)}
              className="text-stone-300 hover:text-red-500 transition-colors p-2"
              title="Relatie verbreken"
            >
              <Trash2 size={16}/>
            </button>
          </div>
        ))
      ) : (
        <div className="py-10 text-center border-2 border-dashed border-stone-100 rounded-2xl text-stone-400 italic text-sm">
          Geen actieve verbindingen gevonden voor {activeItem.name}.
        </div>
      )}
    </div>
  </div>
)}

{/* OVERIG TAB (Optioneel, als je die tab-knop hebt) */}
{activeCategory === 'characters' && activeTab === 'overig' && (
  <div className="space-y-8">
    <Field 
      label="Achtergrondverhaal (Backstory)" 
      value={activeItem.backstory} 
      onChange={(v: any) => handleFieldChange(activeItem.id, 'backstory', v)} 
      area 
    />
    <Field 
      label="Extra Notities" 
      value={activeItem.notes} 
      onChange={(v: any) => handleFieldChange(activeItem.id, 'notes', v)} 
      area 
    />
  </div>
)}

        {/* LOCATIE SPECIFIEKE TAB */}
        {activeCategory === 'locations' && activeTab === 'details' && (
          <div className="space-y-8">
            <Field label="Zintuiglijke Details (Zien, Horen, Ruiken)" value={activeItem.sensory_details} onChange={(v: any) => handleFieldChange(activeItem.id, 'sensory_details', v)} area />
            <Field label="Sfeer & Atmosfeer" value={activeItem.atmosphere} onChange={(v: any) => handleFieldChange(activeItem.id, 'atmosphere', v)} />
            <Field label="Historische Context" value={activeItem.history} onChange={(v: any) => handleFieldChange(activeItem.id, 'history', v)} area />
          </div>
        )}

        {/* ITEM SPECIFIEKE TAB */}
        {activeCategory === 'items' && activeTab === 'details' && (
          <div className="space-y-8">
            <Field label="Eigenschappen & Krachten" value={activeItem.properties} onChange={(v: any) => handleFieldChange(activeItem.id, 'properties', v)} area />
            <Field label="Oorsprong" value={activeItem.origin} onChange={(v: any) => handleFieldChange(activeItem.id, 'origin', v)} />
            <Field label="Huidige Eigenaar" value={activeItem.owner} onChange={(v: any) => handleFieldChange(activeItem.id, 'owner', v)} />
          </div>
        )}

        {activeCategory === 'network' && (
  <div className="h-full flex flex-col p-10">
    <div className="mb-8">
      <h2 className="h-full flex flex-col p-10 bg-red-500">Relatie Netwerk</h2>
      <p className="text-stone-500 italic">Het sociale weefsel van je verhaal.</p>
    </div>

    {allRelations.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allRelations.map((rel) => (
          <div key={rel.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex flex-col items-center text-center gap-3">
              {/* Bron Karakter */}
              <div className="w-full">
                <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Karakter</span>
                <p className="font-bold text-lg text-stone-900">{rel.source?.name}</p>
              </div>

              {/* De Relatie Lijn */}
              <div className="w-full flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-stone-200"></div>
                <span className="px-3 py-1 bg-orange-100 text-orange-900 rounded-full text-xs font-serif italic border border-orange-200 whitespace-nowrap">
                  {rel.relation_type}
                </span>
                <div className="h-[1px] flex-1 bg-stone-200"></div>
              </div>

              {/* Doel Karakter */}
              <div className="w-full">
                <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">van / voor</span>
                <p className="font-bold text-lg text-stone-900">{rel.target?.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-3xl bg-white/50">
        <Share2 size={48} className="text-stone-200 mb-4" />
        <p className="text-stone-400 italic">Er zijn nog geen relaties gedefinieerd in de Codex.</p>
      </div>
    )}
  </div>
)}
      </div>
    </div>
  ) : (
    <div className="h-full flex flex-col items-center justify-center text-stone-300">
      <Layout size={64} className="mb-4 opacity-10" />
      <p className="text-xl font-serif italic text-stone-400">Selecteer een dossier uit de Codex</p>
    </div>
  )}
</main>
    </div>
  );
}

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