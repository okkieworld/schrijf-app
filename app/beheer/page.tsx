"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, MapPin, Sword, Trash2, Layout, User, Fingerprint, Brain, Heart, Info, Save, Share2, Edit3 } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MermaidDiagram = dynamic(
  async () => {
    const mod = await import('../components/MermaidDiagram');
    // We controleren handmatig of het een default export is
    return mod.default || mod;
  },
  { 
    ssr: false,
    loading: () => <div className="h-20 flex items-center justify-center text-stone-400">Laden...</div>
  }
);

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
  const [aiInput, setAiInput] = useState(""); 
  const [showAiTool, setShowAiTool] = useState(false);

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
const syncWithAi = async () => {
  try {
    const parsed = JSON.parse(aiInput);
    setIsSaving(true); // Zet een laadstatus aan

const fieldMapping: { [key: string]: string } = {
      'name': 'name',
      'description': 'description', // Korte omschrijving
      'perception_filter': 'perception_filter', // Expert-bril voor AI
      'dialogue_style': 'dialogue_style', // CRUCIAAL: Voeg deze toe
      'role': 'role',
      'age': 'age',
      'backstory': 'backstory',
      'appearance': 'appearance',
      'physical_traits': 'physical_traits',
      'clothing': 'clothing',
      'scars_marks': 'scars_marks',
      'personality': 'personality',
      'motivation': 'motivation',
      'desires': 'desires',
      'fears': 'fears',
      'strengths': 'strengths',
      'weaknesses': 'weaknesses',
      'notes': 'notes'
    };

    // 1. Bouw één object met alle updates
    const updates: any = {};
    Object.keys(parsed).forEach((aiField) => {
      const targetDbField = fieldMapping[aiField] || aiField;
      updates[targetDbField] = parsed[aiField];
    });

    // 2. Update de lokale state in één keer (voor directe visuele feedback)
    setData((prev: any) => ({
      ...prev,
      [activeCategory]: prev[activeCategory].map((item: any) =>
        item.id === selectedId ? { ...item, ...updates } : item
      ),
    }));

    // 3. Stuur alles in één keer naar Supabase (Online veel betrouwbaarder)
    const { error } = await supabase
      .from(activeCategory)
      .update(updates)
      .eq('id', selectedId);

    if (error) throw error;

    setAiInput("");
    setShowAiTool(false);
    alert("Dossier online en lokaal succesvol bijgewerkt!");
  } catch (e) {
    console.error("Import error:", e);
    alert("Fout bij opslaan. Controleer je internetverbinding en de JSON structuur.");
  } finally {
    setIsSaving(false);
  }
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

const generateMermaidChart = () => {
  // 1. Veiligheid: als er geen data is, toon een simpele placeholder node
  if (!allRelations || allRelations.length === 0) {
    return "graph TD\n  StartNode[Geen relaties gedefinieerd]";
  }

  // 2. Start de graph definitie
  let chart = "graph TD\n";
  
  // 3. Styling: we voegen ook een specifieke kleur toe voor de sfeer
  chart += "  classDef default fill:#ffffff,stroke:#78716c,stroke-width:1px,color:#1c1917,font-family:serif;\n";

  allRelations.forEach((rel) => {
    // 4. Maak IDs die 100% veilig zijn (geen spaties, geen gekke tekens)
    const sourceId = "ID_" + (rel.source?.name || "Bron").replace(/[^a-zA-Z0-9]/g, "");
    const targetId = "ID_" + (rel.target?.name || "Doel").replace(/[^a-zA-Z0-9]/g, "");
    
    // 5. Haal de namen en het type op
    const sourceName = rel.source?.name || "Onbekend";
    const targetName = rel.target?.name || "Onbekend";
    const type = rel.relation_type || "verbonden";

    // 6. Pijl-logica die werkt in v11 (we houden het simpel om syntax errors te voorkomen)
    // Gebruik --> voor een pijl en --- voor een verbinding zonder richting
    let arrow = "-->";
    if (type.toLowerCase().includes('rivaal') || type.toLowerCase().includes('vijand')) {
      arrow = "-.-"; // Gestippelde lijn voor conflict
    } else if (type.toLowerCase().includes('vrouw') || type.toLowerCase().includes('man')) {
      arrow = "==="; // Dikke lijn voor familie/huwelijk
    }
    
    // 7. De string opbouw: ID["Naam"] -- "Label" --> ID2["Naam"]
    // Let op de extra quotes om het label, dit is cruciaal voor Mermaid 11
    chart += `  ${sourceId}["${sourceName}"] ${arrow} |"${type}"| ${targetId}["${targetName}"]\n`;
  });

  return chart;
};


const renderTabContent = () => {
  if (!activeItem) return null;

  switch (activeTab) {
    case 'basis':
      return (
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rol / Titel" value={activeItem.role} onChange={(v: any) => handleFieldChange(activeItem.id, 'role', v)} />
            <Field label="Leeftijd" value={activeItem.age} onChange={(v: any) => handleFieldChange(activeItem.id, 'age', v)} />
          </div>
          <Field label="Korte Samenvatting" area value={activeItem.description} onChange={(v: any) => handleFieldChange(activeItem.id, 'description', v)} />
          <Field label="Achtergrondverhaal (Backstory)" area value={activeItem.backstory} onChange={(v: any) => handleFieldChange(activeItem.id, 'backstory', v)} />
          <Field label="Extra Notities" area value={activeItem.notes} onChange={(v: any) => handleFieldChange(activeItem.id, 'notes', v)} />
        </div>
      );
    case 'fysiek':
      return (
        <div className="grid grid-cols-1 gap-6">
          <Field label="Fysieke Kenmerken" area value={activeItem.physical_traits} onChange={(v: any) => handleFieldChange(activeItem.id, 'physical_traits', v)} />
          <Field label="Kledingstijl" area value={activeItem.clothing} onChange={(v: any) => handleFieldChange(activeItem.id, 'clothing', v)} />
          <Field label="Littekens & Merken" value={activeItem.scars_marks} onChange={(v: any) => handleFieldChange(activeItem.id, 'scars_marks', v)} />
        </div>
      );
case 'psychologie':
      return (
        <div className="grid grid-cols-1 gap-6">
          {/* De cruciale 'Expert-bril' voor de AI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field 
              label="Waarneming (Perception Filter)" 
              area 
              value={activeItem.perception_filter} 
              onChange={(v: any) => handleFieldChange(activeItem.id, 'perception_filter', v)}
              placeholder="Hoe ziet dit personage de wereld fysiek? (Systemen, materie, risico's...)"
            />
            <Field 
              label="Stemvoering (Dialogue Style)" 
              area 
              value={activeItem.dialogue_style} 
              onChange={(v: any) => handleFieldChange(activeItem.id, 'dialogue_style', v)}
              placeholder="Specifieke spreekregels (bijv. Jonas: informeel, 'handelstaal')."
            />
          </div>

          <hr className="border-gray-800 my-2" />

          {/* De psychologische onderstroom */}
                    <div className="grid grid-cols-2 gap-4">
<Field label="Persoonlijkheid (Innerlijke Stem)" area value={activeItem.personality} onChange={(v: any) => handleFieldChange(activeItem.id, 'personality', v)} />
          <Field label="Motivatie" area value={activeItem.motivation} onChange={(v: any) => handleFieldChange(activeItem.id, 'motivation', v)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Grootste Verlangens" area value={activeItem.desires} onChange={(v: any) => handleFieldChange(activeItem.id, 'desires', v)} />
            <Field label="Angsten" area value={activeItem.fears} onChange={(v: any) => handleFieldChange(activeItem.id, 'fears', v)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
              <Field label="Sterktes" area value={activeItem.strengths} onChange={(v: any) => handleFieldChange(activeItem.id, 'strengths', v)} />
              <Field label="Zwaktes" area value={activeItem.weaknesses} onChange={(v: any) => handleFieldChange(activeItem.id, 'weaknesses', v)} />
          </div>
        </div>
      );
    default:
      return null;
  }
};




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

<nav className={`w-80 bg-white border-r border-stone-200 flex flex-col h-full shadow-sm ${activeCategory === 'network' ? 'hidden' : ''}`}>        <div className="p-6 border-b border-stone-100 flex justify-between items-center">
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
  {/* SCENARIO 1: HET VOLLEDIGE NETWERK OVERZICHT */}
  {activeCategory === 'network' ? (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="flex justify-between items-end mb-10 border-b border-stone-200 pb-6">
        <div>
          <h2 className="text-4xl font-serif font-bold text-stone-900 mb-2">Sociale Codex</h2>
          <p className="text-stone-500 italic">Het visuele web van belangen, bloedbanden en vetes.</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-800 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
            {allRelations.length} Actieve Verbindingen
          </span>
        </div>
      </div>

      <section className="bg-white p-8 rounded-[3rem] border border-stone-200 shadow-sm overflow-x-auto">
         <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-6 text-center">Netwerk Diagram</h3>
         <MermaidDiagram chart={generateMermaidChart()} />
      </section>

      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-6">Relatie Dossiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {allRelations.map((rel) => (
            <div key={rel.id} className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <span className="font-serif text-xl font-bold text-stone-900">{rel.source?.name}</span>
                <div className="w-full flex items-center my-4">
                  <div className="h-[1px] flex-1 bg-stone-100"></div>
                  <div className="px-4 py-1 mx-2 bg-stone-900 text-white rounded text-[10px] font-bold uppercase tracking-tighter">
                    {rel.relation_type}
                  </div>
                  <div className="h-[1px] flex-1 bg-stone-100"></div>
                </div>
                <span className="font-serif text-xl font-bold text-stone-900">{rel.target?.name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  ) : activeItem ? (
    /* SCENARIO 2: EEN SPECIFIEK DOSSIER (KARAKTER/LOCATIE/ITEM) */
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden min-h-[600px] flex flex-col">
      <div className="p-8 bg-stone-900 text-white flex justify-between items-start">
        <div className="flex-1">
          <input
            className="bg-transparent text-3xl font-serif font-bold w-full outline-none focus:border-b border-orange-800/50"
            value={activeItem.name || ""}
            onChange={(e) => handleFieldChange(activeItem.id, 'name', e.target.value)}
          />
        </div>
        <button 
        onClick={() => setShowAiTool(!showAiTool)} 
        className={`p-2 rounded-lg transition-all ${showAiTool ? 'bg-orange-800 text-white' : 'text-stone-500 hover:text-white'}`}
        title="AI Dossier Import"
      >
        <Brain size={20}/>
      </button>
        <button onClick={handleDelete} className="text-stone-500 hover:text-red-500 p-2"><Trash2 size={20}/></button>
      </div>
      {/* VOEG DIT BLOK HIER TOE: Het uitklapbare JSON-vlak */}
{showAiTool && (
  <div className="m-8 mt-4 p-6 bg-orange-50 border-2 border-orange-200 rounded-2xl animate-in slide-in-from-top duration-300">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-orange-900">AI Dossier Import (JSON)</h3>
      {/* Kopieerknop voor de prompt */}
<button 
  onClick={() => navigator.clipboard.writeText(`Zet de volgende informatie om in een gedetailleerd karakterdossier van ${activeItem.name}. Geef het resultaat terug als puur JSON zonder tekst eromheen. Gebruik deze velden: role, age, description, dialogue_style (specifieke spreekregels), backstory, appearance, physical_traits, clothing, scars_marks, personality, motivation, desires, fears, strengths, weaknesses, notes.`)}
  className="text-[10px] font-bold text-orange-800 hover:underline"
>
  Kopieer AI Prompt
</button>
    </div>
    <textarea
      className="w-full h-40 bg-white border border-orange-200 rounded-xl p-4 text-mono text-xs focus:ring-2 focus:ring-orange-800 outline-none text-stone-900 transition-all shadow-inner"
      /* De placeholder herinnert je aan de structuur */
      placeholder='Plak hier de JSON. Tip: Gebruik de "Kopieer AI Prompt" knop hierboven om Gemini de juiste data te laten genereren.'
      value={aiInput}
      onChange={(e) => setAiInput(e.target.value)}
    />
    <button
      onClick={syncWithAi}
      className="mt-4 w-full bg-orange-800 text-white py-3 rounded-xl text-xs font-bold hover:bg-stone-900 transition-all flex items-center justify-center gap-2 shadow-md"
    >
      <Save size={16} /> Dossier Bijwerken
    </button>
  </div>
)}

      <div className="flex border-b border-stone-100 bg-stone-50 px-8 overflow-x-auto">
        <TabButton active={activeTab === 'basis'} onClick={() => setActiveTab('basis')} icon={<Info size={14}/>} label="Basis" />
        {activeCategory === 'characters' && (
          <>
            <TabButton active={activeTab === 'fysiek'} onClick={() => setActiveTab('fysiek')} icon={<Fingerprint size={14}/>} label="Fysiek" />
            <TabButton active={activeTab === 'psychologie'} onClick={() => setActiveTab('psychologie')} icon={<Brain size={14}/>} label="Psychologie" />
            <TabButton active={activeTab === 'relaties'} onClick={() => setActiveTab('relaties')} icon={<Heart size={14}/>} label="Relaties" />
          </>
        )}
      </div>

      <div className="p-10 flex-1">
        {renderTabContent()}
{/* RELATIES TAB BINNEN KARAKTER DOSSIER - BOUWMODUS */}
{activeCategory === 'characters' && activeTab === 'relaties' && (
  <div className="space-y-8 animate-in fade-in duration-300">
    
    {/* 1. LINK TOOL - NIEUWE VERBINDING MAAKKEN */}
    <div className="bg-orange-50/50 p-8 rounded-2xl border border-orange-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg text-orange-800">
          <Share2 size={18} />
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-orange-900 leading-none">Nieuwe Verbinding Leggen</h3>
          <p className="text-[10px] text-orange-700/60 mt-1 italic">Definieer hoe {activeItem.name} zich verhoudt tot anderen.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-4">
          <label className="text-[10px] font-bold uppercase text-stone-400 mb-2 block ml-1">
            {activeItem.name} is de...
          </label>
          <input 
            value={newRelation.type}
            onChange={(e) => setNewRelation({...newRelation, type: e.target.value})}
            placeholder="vrouw, rivaal, mentor..." 
            className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-all"
          />
        </div>

        <div className="md:col-span-5">
          <label className="text-[10px] font-bold uppercase text-stone-400 mb-2 block ml-1">van / voor</label>
          <select 
            value={newRelation.targetId}
            onChange={(e) => setNewRelation({...newRelation, targetId: e.target.value})}
            className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-all appearance-none"
          >
            <option value="">Selecteer karakter...</option>
            {data.characters
              .filter((c: any) => c.id !== selectedId)
              .map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <button 
            onClick={addRelation}
            disabled={!newRelation.type || !newRelation.targetId}
            className="w-full bg-stone-900 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-orange-800 disabled:opacity-30 disabled:hover:bg-stone-900 transition-all shadow-sm"
          >
            Verbinding Vastleggen
          </button>
        </div>
      </div>
    </div>

    {/* 2. OVERZICHT LIJST */}
    <div className="space-y-4">
      <div className="flex items-center gap-4 px-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Huidige Verbindingen</h3>
        <div className="h-[1px] flex-1 bg-stone-100"></div>
      </div>
      
      {relations.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {relations.map((rel) => (
            <div key={rel.id} className="group flex items-center justify-between p-5 bg-white border border-stone-100 rounded-2xl shadow-sm hover:border-orange-200 transition-all">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-stone-900">{activeItem.name}</span>
                    <span className="px-3 py-1 bg-stone-50 text-stone-600 rounded-full text-[10px] font-serif italic border border-stone-100">
                      {rel.relation_type}
                    </span>
                    <span className="text-stone-400 text-[10px] uppercase font-bold tracking-tighter">van</span>
                    <span className="font-bold text-stone-900">{rel.target?.name}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => deleteRelation(rel.id)}
                className="text-stone-200 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                title="Relatie verwijderen"
              >
                <Trash2 size={16}/>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center border-2 border-dashed border-stone-100 rounded-[2rem] bg-stone-50/30 text-stone-400 italic text-sm">
          Er zijn nog geen draden gesponnen voor {activeItem.name}.
        </div>
      )}
    </div>
  </div>
)}
      </div>
    </div>
  ) : (
    /* SCENARIO 3: LEGE STAAT */
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