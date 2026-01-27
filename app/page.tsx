"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { debounce } from 'lodash';
import { Book, ChevronDown, Layout, Info, PenTool, Users, MapPin, Archive } from 'lucide-react';
import Link from 'next/link';


// Deze variabelen worden één keer buiten de component aangemaakt
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Hieronder begint je export default function ...

export default function WritingApp() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [scenes, setScenes] = useState<Record<string, any>>({});
const [selectedScene, setSelectedScene] = useState<any>(null);
  const [prose, setProse] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Tabs & Codex State
  const [activeTab, setActiveTab] = useState("kaart"); // "kaart" of "wereld"
  const [codexData, setCodexData] = useState<any>({ characters: [], locations: [], items: [] });

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    setProjects(data || []);
  };

const selectProject = async (project: any) => {
  setSelectedProject(project);

  // 1. Haal de hoofdstukken op
  const { data: chaptersData } = await supabase
    .from('chapters')
    .select('*')
    .eq('project_id', project.id)
    .order('ord');
  
  setChapters(chaptersData || []);

  // 2. Haal de Codex data op (Characters, Locations, Items)
  const { data: characters } = await supabase.from('characters').select('*').eq('project_id', project.id);
  const { data: locations } = await supabase.from('locations').select('*').eq('project_id', project.id);
  const { data: items } = await supabase.from('items').select('*').eq('project_id', project.id);
  
  setCodexData({
    characters: characters || [],
    locations: locations || [],
    items: items || []
  });

  // 3. Indien je nog een aparte fetchCodex functie hebt, kun je die hier ook laten staan:
  // fetchCodex(project.id); 
};

const toggleChapter = async (chapterId: string) => {
  // 1. Data ophalen als we die nog niet hebben
  if (!scenes[chapterId]) {
    const { data, error } = await supabase
      .from('scenes')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('ord');
    
    if (!error && data) {
      setScenes((prev: any) => ({ ...prev, [chapterId]: data }));
    }
  }

  // 2. De visuele status toggelen (open/dicht)
  setExpandedChapters((prev) => 
    prev.includes(chapterId) 
      ? prev.filter(id => id !== chapterId) // Verwijder uit lijst = inklappen
      : [...prev, chapterId]               // Voeg toe aan lijst = uitklappen
  );
};

const saveProse = useMemo(
  () =>
    debounce(async (sceneId: string, newText: string) => {
      if (!sceneId) return;
      setIsSaving(true);
      const { error } = await supabase
        .from('scenes')
        .update({ prose: newText })
        .eq('id', sceneId);
      
      if (error) console.error("Opslaan mislukt:", error);
      setIsSaving(false);
    }, 1000), // 1 seconde is vaak net wat vlotter dan 1.5
  []
);

  const copyAiPrompt = () => {
    const prompt = `Je bent een redacteur die bestaand proza terugvertaalt naar een scènekaart.
Geef de output uitsluitend als geldig JSON. Schrijf in het Nederlands.
Gebruik exact dit schema:
{
  "pov": "", "setting": "", "purpose": "", "conflict": "", 
  "outcome": "", "setup": "", "payoff": "", "summary": ""
}
Proza:
"""${prose}"""`;
    navigator.clipboard.writeText(prompt);
    alert("Prompt voor de Vlotte Plot Scène (A) gekopieerd!");
  };

const handleJsonImport = async (jsonString: string) => {
  if (!selectedScene) return; 

  try {
    const data = JSON.parse(jsonString);
    const { error } = await supabase
      .from('scenes')
      .update({ ...data })
      .eq('id', (selectedScene as any).id);
    
    if (!error) {
        alert("Scènekaart succesvol bijgewerkt!");
        setSelectedScene((prev: any) => ({ ...prev, ...data }));
        
        // HIER MAKEN WE HET VELD LEEG
        setImportText(""); 

        // Update ook de sidebar lijst
        const chapterId = selectedScene.chapter_id;
        setScenes((prev: any) => ({
          ...prev,
          [chapterId]: prev[chapterId].map((s: any) => 
            s.id === selectedScene.id ? { ...s, ...data } : s
          )
        }));
    }
  } catch (e) {
    // We geven pas een error als de tekst substantieel is en echt niet klopt
    if (jsonString.length > 10) console.log("Wachten op geldige JSON...");
  }
};

  // State voor bewerken
  const [editingId, setEditingId] = useState<any>(null); 
  const [tempTitle, setTempTitle] = useState(""); 

const updateSceneField = async (sceneId: any, field: string, newValue: any) => {
  const { error } = await supabase
    .from('scenes')
    .update({ [field]: newValue })
    .eq('id', sceneId);

  if (!error) {
    // 1. Update de actieve scènekaart
    setSelectedScene((prev: any) => ({
      ...prev,
      [field]: newValue
    }));

    // 2. Update de zijbalk (zodat status-bolletjes en titels direct verspringen)
    if (selectedScene?.chapter_id) {
      const chapterId = selectedScene.chapter_id;
      setScenes((prev: any) => ({
        ...prev,
        [chapterId]: (prev[chapterId] || []).map((s: any) => 
          s.id === sceneId ? { ...s, [field]: newValue } : s
        )
      }));
    }

    setEditingId(null);
  } else {
    console.error("Fout bij updaten veld:", error.message);
    alert("Opslaan mislukt: " + error.message);
  }
};

  const renameChapter = async (id: any, newTitle: string) => {
    const { error } = await supabase.from('chapters').update({ title: newTitle }).eq('id', id);
    if (!error) {
      setChapters(chapters.map((c: any) => c.id === id ? { ...c, title: newTitle } : c));
      setEditingId(null);
    }
  };

  const renameScene = async (chapterId: any, sceneId: any, newTitle: string) => {
    const { error } = await supabase.from('scenes').update({ title: newTitle }).eq('id', sceneId);
    if (!error) {
      setScenes((prev: any) => ({
        ...prev,
        [chapterId]: prev[chapterId].map((s: any) => s.id === sceneId ? { ...s, title: newTitle } : s)
      }));
      setEditingId(null);
    }
  };

const addChapter = async (title: string) => {
  // Gebruik de state die al bovenaan je component staat
  if (!selectedProject?.id) {
    alert("Selecteer eerst een project!");
    return;
  }

  const { data, error } = await supabase
    .from('chapters')
    .insert([{ 
      title: title, 
      ord: chapters.length + 1,
      project_id: selectedProject.id // Pakt dynamisch het geselecteerde project
    }])
    .select();

  if (error) {
    console.error('Fout bij hoofdstuk aanmaken:', error.message);
  } else if (data && data[0]) {
    setChapters([...chapters, data[0]]);
  }
};

const addScene = async (chapterId: string) => {
  // We gebruiken de 'scenes' state die als Record<string, any> is gedefinieerd
  const currentScenesForChapter = scenes[chapterId] || [];
  const newOrd = currentScenesForChapter.length + 1;

  const { data, error } = await supabase
    .from('scenes')
    .insert([{ 
      chapter_id: chapterId, 
      title: 'Nieuwe Scène', 
      prose: '', // Gebruikt 'prose' zoals eerder vastgesteld
      ord: newOrd 
    }])
    .select();

  if (error) {
    console.error('Fout bij scène aanmaken:', error.message);
  } else if (data && data[0]) {
    // Update de Record state voor het specifieke hoofdstuk
    setScenes({
      ...scenes,
      [chapterId]: [...currentScenesForChapter, data[0]]
    });
  }
};

const [importText, setImportText] = useState("");
const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
const STATUS_OPTIONS = [
  "Idee", 
  "Outline", 
  "Concept", 
  "Eerste Versie", 
  "Redactie", 
  "Voltooid", 
  "Archief"
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Idee': return 'bg-purple-400';
    case 'Outline': return 'bg-blue-400';
    case 'Concept': return 'bg-amber-400';
    case 'Eerste Versie': return 'bg-stone-500';
    case 'Redactie': return 'bg-orange-500';
    case 'Voltooid': return 'bg-green-500';
    case 'Archief': return 'bg-red-400';
    default: return 'bg-stone-200';
  }
};

  return (
    <div className="flex h-screen bg-stone-50 text-stone-900 font-sans overflow-hidden">
      
      {/* LINKER KOLOM: Navigatie */}
      <nav className="w-72 bg-stone-200 border-r border-stone-300 flex flex-col h-full">
  <div className="p-4 border-b border-stone-300 font-serif font-bold text-lg flex items-center gap-2">
    <Book size={20} className="text-stone-600" /> Manuscripten
  </div>

  <div className="flex-1 overflow-y-auto p-2 space-y-2">
{/* Verander de map regel naar dit: */}
{projects.map((p: any) => (
  <div key={p.id} className="space-y-1">
    <button
      onClick={() => selectProject(p)}
      className={`w-full text-left p-2 rounded hover:bg-stone-300 transition-colors ${
        // Dit werkt nu omdat selectedProject bovenin op <any> staat
        selectedProject?.id === p.id ? "bg-stone-300 font-semibold text-orange-950" : ""
      }`}
    >
      {p.title}
    </button>

        {/* Hoofdstukken lijst */}
        {selectedProject?.id === p.id &&
          chapters.map((c) => (
<div key={c.id} className="ml-3 space-y-1">
  {/* Hoofdstuk Item */}
  <div className="group flex items-center justify-between gap-2 p-1.5 rounded hover:bg-stone-100 transition-all">
    {editingId === c.id ? (
      <input
        autoFocus
        className="flex-1 bg-white text-sm border border-orange-300 rounded px-1 outline-none"
        value={tempTitle}
        onChange={(e) => setTempTitle(e.target.value)}
        onBlur={() => renameChapter(c.id, tempTitle)}
        onKeyDown={(e) => e.key === "Enter" && renameChapter(c.id, tempTitle)}
      />
    ) : (
      <>
        <button
          onClick={() => toggleChapter(c.id)}
          className="flex-1 text-left text-sm flex items-center gap-1 text-stone-700 font-medium truncate"
        >
          {/* PAS HIER DE CLASSNAME AAN */}
          <ChevronDown
            size={14}
            className={`${expandedChapters.includes(c.id) ? "" : "-rotate-90"} transition-transform`}
          />
          H{c.ord}: {c.title}
        </button>

        <button
          onClick={() => { setEditingId(c.id); setTempTitle(c.title); }}
          className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-orange-900"
        >
          <PenTool size={12} />
        </button>
      </>
    )}
  </div>

  {/* PAS HIER DE CHECK AAN: scenes[c.id] wordt expandedChapters.includes(c.id) */}
  {expandedChapters.includes(c.id) && (
    <div className="ml-5 border-l border-stone-400 pl-2 space-y-0.5">
      {scenes[c.id]?.map((s: any) => (
<div key={s.id} className="group/scene flex items-center justify-between gap-2 rounded hover:bg-stone-300/50 pr-1 transition-all">
  {editingId === s.id ? (
    <input
      autoFocus
      className="flex-1 bg-white text-xs border border-orange-200 rounded px-1 outline-none ml-5"
      value={tempTitle}
      onChange={(e) => setTempTitle(e.target.value)}
      onBlur={() => updateSceneField(s.id, 'title', tempTitle)}
      onKeyDown={(e) => e.key === "Enter" && updateSceneField(s.id, 'title', tempTitle)}
    />
  ) : (
    <>
      {/* LINKERDEEL: Bolletje eerst, dan de Titel */}
      <button
        onClick={() => { setSelectedScene(s); setProse(s.prose || ""); }}
        className={`flex-1 text-left p-1 text-xs rounded truncate flex items-center gap-2 ${
          selectedScene?.id === s.id
            ? "font-bold text-orange-900"
            : "text-stone-500"
        }`}
      >
        {/* Het statusbolletje staat nu vooraan */}
        <div 
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-sm ${getStatusColor(s.status)}`} 
          title={`Status: ${s.status || 'Idee'}`}
        />
        
        <span className="truncate">{s.title}</span>
      </button>

      {/* RECHTERDEEL: De PenTool (alleen bij hover) */}
      <button
        onClick={() => { setEditingId(s.id); setTempTitle(s.title); }}
        className="opacity-0 group-hover/scene:opacity-100 p-1 text-stone-400 hover:text-orange-900 transition-all flex-shrink-0"
      >
        <PenTool size={10} />
      </button>
    </>
  )}
</div>
      ))}
      <button 
        onClick={() => addScene(c.id)} 
        className="px-3 py-1 text-xs bg-stone-200 hover:bg-stone-300 rounded text-stone-700 font-medium transition"
      >
        + Nieuwe Scene
      </button>
    </div>
  )}
</div>
            
          ))}
                    <button 
                       onClick={() => {
    const title = prompt("Hoofdstuk titel:");
    if (title) addChapter(title);
  }}
                       className="px-3 py-1 text-xs bg-stone-200 hover:bg-stone-300 rounded text-stone-700 font-medium transition"
                        >
                       + Hoofdstuk
                     </button>
      </div>
    ))}
  </div>

  {/* Footer Beheer Link */}
  <div className="p-4 border-t border-stone-300 bg-stone-200/50">
    <Link
      href="/beheer"
      className="flex items-center gap-2 w-full p-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-300 hover:text-orange-900 transition-all"
    >
      <Layout size={18} />
      <span>Wereld Beheren</span>
    </Link>
  </div>
</nav>

      {/* RECHTERKANT: Editor & Inspector */}
<main className="flex-1 flex flex-col h-full">
        {selectedScene ? (
          <>
            <header className="h-14 border-b border-stone-200 bg-white flex items-center px-6 justify-between shadow-sm">
              <h2 className="font-serif italic text-stone-600 truncate">{selectedScene.title}</h2>
              <span className="text-[10px] uppercase tracking-widest text-stone-400">
                {isSaving ? 'Synchroniseren...' : 'Veilig opgeslagen'}
              </span>
            </header>

            <div className="flex-1 flex overflow-hidden">
              {/* INSPECTOR SIDEBAR */}
              <aside className="w-80 border-r border-stone-100 bg-stone-50/50 flex flex-col">
                {/* TABS */}
                <div className="flex border-b border-stone-200 bg-stone-100 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  <button onClick={() => setActiveTab("kaart")} className={`flex-1 p-3 transition-all ${activeTab === 'kaart' ? 'bg-white border-b-2 border-orange-500 text-orange-900' : 'hover:bg-stone-200'}`}>
                    Scènekaart
                  </button>
                  <button onClick={() => setActiveTab("wereld")} className={`flex-1 p-3 transition-all ${activeTab === 'wereld' ? 'bg-white border-b-2 border-orange-500 text-orange-900' : 'hover:bg-stone-200'}`}>
                    Codex
                  </button>
                </div>

                {/* TAB CONTENT */}
                <div className="p-6 flex-1 overflow-y-auto">
                  {activeTab === "kaart" ? (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-stone-400 border-b pb-2 uppercase text-[10px] font-bold tracking-widest">
                        <Info size={14} /> Scène-Analyse
                      </div>
{/* Status Dropdown in de Scènekaart */}
<div className="mt-4 pt-4 border-t border-stone-100">
{/* STATUS SELECTIE */}
<section className="group border-b border-stone-100 pb-4">
<div className="flex items-center gap-2 mt-2">
  <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
    Status:
  </label>
  <div className="inline-flex items-center gap-2 bg-stone-100/50 px-2 py-1 rounded border border-stone-200">
    <select 
      value={selectedScene?.status || "Idee"}
      onChange={(e) => updateSceneField(selectedScene.id, 'status', e.target.value)}
      className="bg-transparent border-none text-[11px] text-stone-600 font-bold focus:ring-0 cursor-pointer p-0 pr-5 m-0"
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
    <div className={`w-2 h-2 rounded-full shadow-sm ${getStatusColor(selectedScene?.status)}`} />
  </div>
</div>
  
</section>

</div>
                      
                      <div className="grid grid-cols-2 gap-4">
  
  {/* POV */}
  <section className="group">
    <div className="flex justify-between items-center">
      <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">POV</label>
      {editingId !== `edit-pov` && (
        <button onClick={() => { setEditingId(`edit-pov`); setTempTitle(selectedScene.pov || ""); }} className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-orange-900 transition-all">
          <PenTool size={10} />
        </button>
      )}
    </div>
    {editingId === `edit-pov` ? (
      <input autoFocus className="w-full text-sm p-1 bg-white border border-orange-300 rounded outline-none" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} onBlur={() => updateSceneField(selectedScene.id, 'pov', tempTitle)} onKeyDown={(e) => e.key === 'Enter' && updateSceneField(selectedScene.id, 'pov', tempTitle)} />
    ) : (
      <p className="text-sm text-stone-700 mt-0.5">{selectedScene.pov || "—"}</p>
    )}
  </section>
</div>
<div className="space-y-4 mt-4">
  {/* SETTING */}
  <section className="group">
    <div className="flex justify-between items-center">
      <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Setting</label>
      {editingId !== `edit-setting` && (
        <button onClick={() => { setEditingId(`edit-setting`); setTempTitle(selectedScene.setting || ""); }} className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-orange-900 transition-all">
          <PenTool size={10} />
        </button>
      )}
    </div>
    {editingId === `edit-setting` ? (
      <input autoFocus className="w-full text-sm p-1 bg-white border border-orange-300 rounded outline-none" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} onBlur={() => updateSceneField(selectedScene.id, 'setting', tempTitle)} onKeyDown={(e) => e.key === 'Enter' && updateSceneField(selectedScene.id, 'setting', tempTitle)} />
    ) : (
      <p className="text-sm text-stone-700 mt-0.5">{selectedScene.setting || "—"}</p>
    )}
  </section>
</div>

<div className="space-y-4 mt-4">
  {/* DOEL */}
  <section className="group">
    <div className="flex justify-between items-center">
      <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Doel</label>
      {editingId !== `edit-purpose` && (
        <button onClick={() => { setEditingId(`edit-purpose`); setTempTitle(selectedScene.purpose || ""); }} className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-orange-900 transition-all">
          <PenTool size={10} />
        </button>
      )}
    </div>
    {editingId === `edit-purpose` ? (
      <textarea autoFocus className="w-full text-sm p-1 bg-white border border-orange-300 rounded outline-none h-16" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} onBlur={() => updateSceneField(selectedScene.id, 'purpose', tempTitle)} />
    ) : (
      <p className="text-sm text-stone-600 mt-1">{selectedScene.purpose || "Geen doel."}</p>
    )}
  </section>

  {/* CONFLICT */}
  <section className="group">
    <div className="flex justify-between items-center">
      <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Conflict</label>
      {editingId !== `edit-conflict` && (
        <button onClick={() => { setEditingId(`edit-conflict`); setTempTitle(selectedScene.conflict || ""); }} className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-orange-900 transition-all">
          <PenTool size={10} />
        </button>
      )}
    </div>
    {editingId === `edit-conflict` ? (
      <textarea autoFocus className="w-full text-sm p-1 bg-white border border-orange-300 rounded outline-none h-16" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} onBlur={() => updateSceneField(selectedScene.id, 'conflict', tempTitle)} />
    ) : (
      <p className="text-sm text-stone-600 mt-1">{selectedScene.conflict || "Geen conflict."}</p>
    )}
  </section>

  {/* OUTCOME */}
  <section className="group">
    <div className="flex justify-between items-center">
      <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Uitkomst (Outcome)</label>
      {editingId !== `edit-outcome` && (
        <button onClick={() => { setEditingId(`edit-outcome`); setTempTitle(selectedScene.outcome || ""); }} className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-orange-900 transition-all">
          <PenTool size={10} />
        </button>
      )}
    </div>
    {editingId === `edit-outcome` ? (
      <textarea autoFocus className="w-full text-sm p-1 bg-white border border-orange-300 rounded outline-none h-16" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} onBlur={() => updateSceneField(selectedScene.id, 'outcome', tempTitle)} />
    ) : (
      <p className="text-sm text-stone-600 mt-1">{selectedScene.outcome || "Geen uitkomst."}</p>
    )}
  </section>

  {/* SETUP & PAYOFF GRID */}

    <section className="group">
      <div className="flex justify-between items-center">
        <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Setup</label>
        {editingId !== `edit-setup` && (
          <button onClick={() => { setEditingId(`edit-setup`); setTempTitle(selectedScene.setup || ""); }} className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-orange-900 transition-all">
            <PenTool size={10} />
          </button>
        )}
      </div>
      {editingId === `edit-setup` ? (
        <input autoFocus className="w-full text-xs p-1 bg-white border border-orange-300 rounded outline-none" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} onBlur={() => updateSceneField(selectedScene.id, 'setup', tempTitle)} onKeyDown={(e) => e.key === 'Enter' && updateSceneField(selectedScene.id, 'setup', tempTitle)} />
      ) : (
        <p className="text-xs text-stone-600 mt-1">{selectedScene.setup || "—"}</p>
      )}
    </section>

    

    <section className="group">
      <div className="flex justify-between items-center">
        <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Payoff</label>
        {editingId !== `edit-payoff` && (
          <button onClick={() => { setEditingId(`edit-payoff`); setTempTitle(selectedScene.payoff || ""); }} className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-orange-900 transition-all">
            <PenTool size={10} />
          </button>
        )}
      </div>
      {editingId === `edit-payoff` ? (
        <input autoFocus className="w-full text-xs p-1 bg-white border border-orange-300 rounded outline-none" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} onBlur={() => updateSceneField(selectedScene.id, 'payoff', tempTitle)} onKeyDown={(e) => e.key === 'Enter' && updateSceneField(selectedScene.id, 'payoff', tempTitle)} />
      ) : (
        <p className="text-xs text-stone-600 mt-1">{selectedScene.payoff || "—"}</p>
      )}
    </section>


  {/* SAMENVATTING */}
  <section className="group bg-orange-50/40 p-3 rounded border border-orange-100/50 shadow-sm">
    <div className="flex justify-between items-center">
      <label className="text-[10px] uppercase font-bold text-orange-800/50 tracking-wider block">Samenvatting</label>
      {editingId !== `edit-summary` && (
        <button onClick={() => { setEditingId(`edit-summary`); setTempTitle(selectedScene.summary || ""); }} className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-orange-900 transition-all">
          <PenTool size={10} />
        </button>
      )}
    </div>
    {editingId === `edit-summary` ? (
      <textarea autoFocus className="w-full text-xs p-2 bg-white border border-orange-300 rounded outline-none h-24 italic" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} onBlur={() => updateSceneField(selectedScene.id, 'summary', tempTitle)} />
    ) : (
      <p className="text-xs text-stone-600 mt-1 italic">{selectedScene.summary || "Geen samenvatting."}</p>
    )}
  </section>
</div>

                      <div className="pt-4 border-t border-stone-200 space-y-4">
                        <button onClick={copyAiPrompt} className="w-full py-2 bg-stone-800 text-white text-[10px] uppercase font-bold tracking-widest rounded hover:bg-black">
                          Copy AI Prompt
                        </button>
<textarea 
  placeholder="Plak JSON hier..."
  className="w-full h-20 text-[10px] p-2 bg-white border border-stone-200 rounded font-mono outline-none shadow-inner"
  value={importText} // Dit zorgt dat we het veld kunnen leegmaken
  onChange={(e) => {
    const val = e.target.value;
    setImportText(val); // Update de tekst in het veld
    if (val.trim().endsWith('}')) { // Trigger import pas als de JSON compleet lijkt
       handleJsonImport(val);
    }
  }}
/>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <section>
  <h3 className="text-[10px] font-bold uppercase text-stone-400 mb-3 border-b pb-1">Locaties</h3>
  {codexData.locations.map((loc: any) => ( // Voeg (loc: any) toe
    <details key={loc.id} className="text-sm mb-2 group">
      <summary className="cursor-pointer font-semibold text-stone-700 hover:text-orange-800 list-none">{loc.name}</summary>
      <p className="text-xs text-stone-500 mt-1 pl-2 border-l border-stone-300 py-1">{loc.description}</p>
    </details>
  ))}
</section>
                    </div>
                  )}
                </div>
              </aside>

              {/* EDITOR */}
              <section className="flex-1 bg-white p-12 overflow-y-auto">
                <textarea 
                  className="w-full h-full border-none focus:ring-0 text-xl leading-relaxed font-serif text-stone-800 resize-none max-w-prose mx-auto block"
                  value={prose}
onChange={(e) => {
  const val = e.target.value;
  setProse(val);
  if (selectedScene?.id) {
    saveProse(selectedScene.id, val);
  }
}}                  placeholder="Begin met schrijven..."
                />
              </section>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-stone-300 italic">
            Selecteer een scène om te beginnen
          </div>
        )}
      </main>
    </div>
  );
}