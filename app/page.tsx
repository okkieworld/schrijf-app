"use client";
import { supabase } from './lib/supabase'; 
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}
import { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
import { Book, ChevronDown, Layout, Info, PenTool, Users, MapPin, Archive, Trash2, Menu, X, SlidersHorizontal, ArrowLeft, LogOut, User, Settings } from 'lucide-react';
import Link from 'next/link';

export default function WritingApp() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [scenes, setScenes] = useState<Record<string, any>>({});
  const [selectedScene, setSelectedScene] = useState<any>(null);
  const [prose, setProse] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [totalWords, setTotalWords] = useState(0);

  // Tabs & Codex State
  const [activeTab, setActiveTab] = useState("kaart"); 
  const [codexData, setCodexData] = useState<any>({ characters: [], locations: [], items: [] });
  const [showLegend, setShowLegend] = useState(false);

  // SIDEBAR & MENU STATES
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false); 

  // SWIPE DETECTION STATES
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });

  // Touch handlers voor het swipen
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchStart.x - touchEndX;
    const diffY = touchStart.y - touchEndY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 60) {
      if (diffX > 0) {
        if (isLeftSidebarOpen) {
          setIsLeftSidebarOpen(false); 
        } else if (!isRightSidebarOpen) {
          setIsRightSidebarOpen(true); 
        }
      } else {
        if (isRightSidebarOpen) {
          setIsRightSidebarOpen(false); 
        } else if (!isLeftSidebarOpen) {
          setIsLeftSidebarOpen(true); 
        }
      }
    }
  };

  const handleSceneChange = async (newScene: any) => {
    if (selectedScene?.id) {
      await supabase.from('scenes').update({ prose: prose }).eq('id', selectedScene.id);
    }
    setSelectedScene(newScene);
    setIsLeftSidebarOpen(false); 

    if (selectedProject?.id && newScene?.id) {
      await supabase.from('projects').update({ last_active_scene_id: newScene.id }).eq('id', selectedProject.id);
    }

    const { data } = await supabase.from('scenes').select('prose').eq('id', newScene.id).single();
    setProse(data?.prose || newScene.prose || "");
  };

  const selectProject = async (project: any) => {
    setSelectedProject(project);
    try {
      const { data: chaptersData } = await supabase
        .from('chapters')
        .select(`*, scenes (*)`)
        .eq('project_id', project.id)
        .order('ord');

      const fetchedChapters = chaptersData || [];
      setChapters(fetchedChapters);

      const scenesMap: Record<string, any[]> = {};
      let totaalWoorden = 0;

      fetchedChapters.forEach((ch: any) => {
        if (ch.scenes) {
          const sortedScenes = [...ch.scenes].sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
          scenesMap[ch.id] = sortedScenes;
          sortedScenes.forEach((s: any) => {
            if (s.prose) totaalWoorden += s.prose.trim().split(/\s+/).filter(Boolean).length;
          });
        }
      });

      setScenes(scenesMap);
      setTotalWords(totaalWoorden);

      const [charRes, locRes, itemRes] = await Promise.all([
        supabase.from('characters').select('*').eq('project_id', project.id).order('name'),
        supabase.from('locations').select('*').eq('project_id', project.id).order('is_major_location', { ascending: false }).order('name'),
        supabase.from('items').select('*').eq('project_id', project.id).order('name')
      ]);

      setCodexData({
        characters: charRes.data || [],
        locations: locRes.data || [],
        items: itemRes.data || []
      });

      if (project.last_active_scene_id) {
        let foundScene: any = null;
        Object.values(scenesMap).forEach((sceneArray: any) => {
          const match = sceneArray.find((s: any) => s.id === project.last_active_scene_id);
          if (match) foundScene = match;
        });

        if (foundScene) {
          setSelectedScene(foundScene);
          setProse(foundScene.prose || "");
          if (foundScene.chapter_id) {
            setExpandedChapters((prev) => prev.includes(foundScene.chapter_id) ? prev : [...prev, foundScene.chapter_id]);
          }
        }
      }
    } catch (error) {
      console.error("Fout bij laden project:", error);
    }
  };

  const toggleChapter = async (chapterId: string) => {
    setExpandedChapters((prev) => prev.includes(chapterId) ? prev.filter(id => id !== chapterId) : [...prev, chapterId]);
  };

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    setProjects(data || []);
    return data;
  }, []);

  const saveProse = useMemo(
    () =>
      debounce(async (sceneId: string, newText: string) => {
        if (!sceneId) return;
        setIsSaving(true);
        await supabase.from('scenes').update({ prose: newText }).eq('id', sceneId);
        setIsSaving(false);
      }, 1000),
    []
  );

  const updateSceneField = async (sceneId: any, field: string, newValue: any) => {
    const { error } = await supabase.from('scenes').update({ [field]: newValue }).eq('id', sceneId);
    if (!error) {
      setSelectedScene((prev: any) => ({ ...prev, [field]: newValue }));
      if (selectedScene?.chapter_id) {
        const chapterId = selectedScene.chapter_id;
        setScenes((prev: any) => ({
          ...prev,
          [chapterId]: (prev[chapterId] || []).map((s: any) => s.id === sceneId ? { ...s, [field]: newValue } : s)
        }));
      }
    }
  };

  const addChapter = async (title: string) => {
    if (!selectedProject?.id) return;
    const { data } = await supabase.from('chapters').insert([{ title: title, ord: chapters.length + 1, project_id: selectedProject.id }]).select();
    if (data && data[0]) setChapters([...chapters, data[0]]);
  };

  const addScene = async (chapterId: string) => {
    const currentScenes = scenes[chapterId] || [];
    const { data } = await supabase.from('scenes').insert([{ chapter_id: chapterId, title: 'Nieuwe Scène', prose: '', ord: currentScenes.length + 1 }]).select();
    if (data && data[0]) setScenes({ ...scenes, [chapterId]: [...currentScenes, data[0]] });
  };

  const deleteScene = async (sceneId: string, chapterId: string) => {
    if (!confirm("Weet je zeker dat je deze scène wilt verwijderen?")) return;
    const { error } = await supabase.from('scenes').delete().eq('id', sceneId);
    if (!error) {
      setScenes((prev: any) => ({ ...prev, [chapterId]: prev[chapterId].filter((s: any) => s.id !== sceneId) }));
      if (selectedScene?.id === sceneId) { setSelectedScene(null); setProse(""); }
    }
  };

  const applyStyle = (type: 'gedachte' | 'brief' | 'whatsapp') => {
    const textarea = document.getElementById('schrijfveld') as HTMLTextAreaElement;
    if (!textarea) return;
    textarea.focus();
    let textToInsert = "";
    let startOffset = 0; let endOffset = 0;   
    switch(type) {
      case 'gedachte': textToInsert = "*gedachte*"; startOffset = 1; endOffset = 1; break;
      case 'brief': textToInsert = ">>> brief <<<"; startOffset = 4; endOffset = 4; break;
      case 'whatsapp': textToInsert = "> **Naam:** bericht"; startOffset = 11; endOffset = 0; break;
    }
    document.execCommand('insertText', false, textToInsert);
    const currentPos = textarea.selectionStart;
    textarea.setSelectionRange(currentPos - textToInsert.length + startOffset, currentPos - endOffset);
  };

  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const STATUS_OPTIONS = ["Idee", "Outline", "Concept", "Eerste Versie", "Redactie", "Voltooid", "Archief"];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Idee': return 'bg-purple-400'; case 'Outline': return 'bg-blue-400'; case 'Concept': return 'bg-amber-400';
      case 'Eerste Versie': return 'bg-stone-500'; case 'Redactie': return 'bg-orange-500'; case 'Voltooid': return 'bg-green-500';
      case 'Archief': return 'bg-red-400'; default: return 'bg-stone-200';
    }
  };

  useEffect(() => {
    const startup = async () => {
      const fetchedProjects = await fetchProjects();
      if (fetchedProjects && fetchedProjects.length > 0) await selectProject(fetchedProjects[0]);
    };
    startup();
  }, []);

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex flex-col h-screen bg-stone-50 text-stone-900 font-sans overflow-hidden select-none"
    >
      
      {/* UNIVERSELE HEADER: WERKT NU OP ELK SCHERMFORMATOOR */}
{/* UNIVERSELE HEADER: LOGO ALTIJD ZICHTBAAR, SWIPE BERICHT WEG */}
      <header className={`h-16 border-b border-stone-200 bg-white flex items-center px-4 justify-between shadow-sm shrink-0 select-none w-full relative ${isMainMenuOpen ? 'z-[60]' : 'z-40'}`}>
        
        {/* Linkerkant: Logo (Nu altijd zichtbaar op zowel PC als mobiel) */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img 
            src="/images/StelrLogo.png" 
            alt="STELR Logo" 
            className="h-9 md:h-12 w-auto object-contain" 
          />
        </div>

        {/* Midden: Gestapelde titels */}
        <div className="flex flex-col items-center max-w-[50%] md:max-w-[60%] truncate text-center px-2">
          <span className="block text-[9px] md:text-[10px] uppercase tracking-widest text-stone-400 font-bold leading-none mb-1 truncate max-w-full">
            {selectedProject ? selectedProject.title : "Geen manuscript"}
          </span>
          <h1 className="font-serif italic font-semibold text-stone-800 text-xs md:text-base truncate leading-tight max-w-full">
            {selectedScene ? selectedScene.title : "Geen scène geselecteerd"}
          </h1>
        </div>

        {/* Rechterkant: Status info + Universele Menu-knop */}
        <div className="flex items-center justify-end gap-3 flex-1 relative z-50">
          
          <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-stone-400 font-medium whitespace-nowrap">
            {isSaving ? 'Synchroniseren...' : 'Opgeslagen'}
          </span>
          
          {/* Menu-knop */}
          <button 
            onClick={(e) => {
              e.stopPropagation(); 
              setIsMainMenuOpen(!isMainMenuOpen);
            }} 
            className="p-2 text-stone-600 hover:bg-stone-100 rounded-md transition-colors relative z-50 pointer-events-auto"
            aria-label="Applicatie menu"
          >
            {isMainMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* DE DROPDOWN */}
          {isMainMenuOpen && (
            <div className="absolute right-0 top-12 w-56 bg-white border border-stone-200 rounded-md shadow-xl py-2 z-[70] pointer-events-auto">
              <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 mb-1">
                STELR Writer
              </div>
              
              <Link 
                href="/hub" 
                onClick={() => setIsMainMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
              >
                <ArrowLeft size={16} className="text-stone-400" />
                <span>Naar de Hub</span>
              </Link>
              
              <button 
                onClick={() => { alert("Profiel openen"); setIsMainMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 text-left transition-colors"
              >
                <User size={16} className="text-stone-400" />
                <span>Mijn Profiel</span>
              </button>

              <div className="border-t border-stone-100 my-1 opacity-60" />

              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-400 hover:bg-stone-50 text-left italic transition-colors cursor-not-allowed">
                <span>↳ Wereldbeheer (binnenkort)</span>
              </button>

              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-400 hover:bg-stone-50 text-left italic transition-colors cursor-not-allowed">
                <span>↳ Architectuur (binnenkort)</span>
              </button>

              <div className="border-t border-stone-100 mt-1.5 pt-1.5">
                <button 
                  onClick={() => { alert("Uitloggen..."); setIsMainMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left transition-colors"
                >
                  <LogOut size={16} />
                  <span>Uitloggen</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </header>

      {/* HOOFD CONTAINER */}
      <div className="flex-1 flex overflow-hidden relative w-full">
        
        {/* MOBIELE DONKERE OVERLAYS BIJ GEOPENDE SWIPE-SIDEBARS */}
        {isLeftSidebarOpen && <div onClick={() => setIsLeftSidebarOpen(false)} className="fixed inset-0 bg-stone-950/40 z-40 lg:hidden" />}
        {isRightSidebarOpen && <div onClick={() => setIsRightSidebarOpen(false)} className="fixed inset-0 bg-stone-950/40 z-40 xl:hidden" />}

        {/* KOLOM 1: MANUSCRIPTEN (Swipe van links) */}
        <nav className={`
          fixed inset-y-0 left-0 w-72 bg-stone-200 border-r border-stone-300 flex flex-col h-full z-50 transition-transform duration-300 ease-in-out pt-16 lg:pt-0
          lg:relative lg:translate-x-0 ${isLeftSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <div className="p-4 border-b border-stone-300 font-serif font-bold text-base flex items-center justify-between lg:hidden">
            <span>Manuscripten</span>
            <button onClick={() => setIsLeftSidebarOpen(false)} className="p-1 text-stone-600"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {projects.map((p: any) => (
              <div key={p.id} className="space-y-1">
                <button onClick={() => selectProject(p)} className={`w-full text-left p-2 rounded text-sm hover:bg-stone-300 ${selectedProject?.id === p.id ? "bg-stone-300 font-bold" : ""}`}>
                  {p.title}
                </button>

                {selectedProject?.id === p.id && chapters.map((c) => (
                  <div key={c.id} className="ml-2 space-y-1">
                    <button onClick={() => toggleChapter(c.id)} className="w-full text-left text-xs font-semibold p-1 flex items-center gap-1 text-stone-700 truncate">
                      <ChevronDown size={12} className={`${expandedChapters.includes(c.id) ? "" : "-rotate-90"} transition-transform`} />
                      H{c.ord}: {c.title}
                    </button>

                    {expandedChapters.includes(c.id) && (
                      <div className="ml-3 border-l border-stone-400 pl-2 space-y-0.5">
                        {scenes[c.id]?.map((s: any) => (
                          <button key={s.id} onClick={() => handleSceneChange(s)} className={`w-full text-left p-1 text-xs rounded truncate flex items-center gap-2 ${selectedScene?.id === s.id ? "font-bold text-orange-900 bg-stone-300/40" : "text-stone-500"}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(s.status)}`} />
                            <span className="truncate">{s.title}</span>
                          </button>
                        ))}
                        <button onClick={() => addScene(c.id)} className="text-[11px] text-stone-500 hover:text-stone-900 block pt-1">+ Scène</button>
                      </div>
                    )}
                  </div>
                ))}
                {selectedProject?.id === p.id && (
                  <button onClick={() => { const t = prompt("Titel:"); if(t) addChapter(t); }} className="text-[11px] text-stone-600 font-bold ml-2 pt-2 block">+ Hoofdstuk</button>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-stone-300 bg-stone-100 text-xs font-bold text-stone-600 flex justify-between">
            <span>TOTAAL:</span>
            <span>{totalWords.toLocaleString()} wrd</span>
          </div>
        </nav>

        {/* KOLOM 2: DE EDITOR (Altijd in het midden) */}
        <section className="flex-1 bg-white p-4 md:p-8 overflow-y-auto min-w-0 h-full flex flex-col items-center">
          {selectedScene ? (
            <div className="w-full max-w-prose h-full flex flex-col select-text">
              
              {/* Opmaakbalk */}
              <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-4 shrink-0 text-[10px] font-bold uppercase tracking-wider text-stone-400 select-none">
                <div className="flex gap-3">
                  <button type="button" onClick={() => applyStyle('gedachte')} className="hover:text-stone-900">Gedachte</button>
                  <button type="button" onClick={() => applyStyle('brief')} className="hover:text-stone-900">Brief</button>
                  <button type="button" onClick={() => applyStyle('whatsapp')} className="hover:text-stone-900">WhatsApp</button>
                </div>
                <button onClick={() => setShowLegend(!showLegend)} className="hover:text-stone-900 flex items-center gap-1"><Info size={12} /> Stijlgids</button>
              </div>

              {showLegend && (
                <div className="mb-4 p-3 bg-stone-50 border border-stone-200 rounded text-xs text-stone-600 grid grid-cols-2 gap-2 select-none">
                  <div><span className="font-mono text-orange-700">*Tekst*</span> = Gedachte</div>
                  <div><span className="font-mono text-orange-700">&gt;&gt;&gt; Tekst &lt;&lt;&lt;</span> = Brief</div>
                </div>
              )}

              <textarea 
                id="schrijfveld"
                className="flex-1 w-full border-none focus:ring-0 text-base md:text-lg leading-relaxed font-serif text-stone-800 resize-none outline-none bg-transparent"
                value={prose}
                onChange={(e) => { setProse(e.target.value); if (selectedScene?.id) saveProse(selectedScene.id, e.target.value); }}
                placeholder="Begin met schrijven... (Swipe vanaf de zijkanten voor navigatie/scènekaart)"
              />
            </div>
          ) : (
            <div className="my-auto text-stone-300 italic text-center p-4 select-none">
              <Book size={48} className="mx-auto mb-2 opacity-40" />
              <p>Swipe vanaf de linkerkant van je scherm naar rechts om je manuscripten te tonen.</p>
            </div>
          )}
        </section>

        {/* KOLOM 3: SCÈNEKAART & CODEX (Swipe van rechts) */}
        <aside className={`
          fixed inset-y-0 right-0 w-80 border-l border-stone-200 bg-stone-50 flex flex-col h-full z-50 transition-transform duration-300 ease-in-out pt-16 xl:pt-0 shadow-xl xl:shadow-none
          xl:relative xl:translate-x-0 ${isRightSidebarOpen ? "translate-x-0" : "translate-x-full"}
        `}>
          <div className="flex border-b border-stone-200 bg-stone-100 text-[10px] font-bold uppercase tracking-wider text-stone-500 shrink-0">
            <button onClick={() => setActiveTab("kaart")} className={`flex-1 p-3 text-center ${activeTab === 'kaart' ? 'bg-white border-b-2 border-orange-500 text-orange-900' : ''}`}>Scènekaart</button>
            <button onClick={() => setActiveTab("wereld")} className={`flex-1 p-3 text-center ${activeTab === 'wereld' ? 'bg-white border-b-2 border-orange-500 text-orange-900' : ''}`}>Codex</button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto text-sm space-y-4">
            {selectedScene && activeTab === "kaart" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-stone-400">Status</label>
                  <select value={selectedScene.status || "Idee"} onChange={(e) => updateSceneField(selectedScene.id, 'status', e.target.value)} className="w-full text-xs mt-1 p-1 bg-white border border-stone-200 rounded">
                    {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-stone-400">POV Personage</label>
                  <select value={selectedScene.pov || ""} onChange={(e) => updateSceneField(selectedScene.id, 'pov', e.target.value)} className="w-full text-xs mt-1 p-1 bg-white border border-stone-200 rounded">
                    <option value="">— Kies POV —</option>
                    {codexData.characters.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-stone-400">Doel van scène</label>
                  <textarea value={selectedScene.purpose || ""} onChange={(e) => updateSceneField(selectedScene.id, 'purpose', e.target.value)} className="w-full text-xs mt-1 p-2 bg-white border border-stone-200 rounded h-16 resize-none" />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-stone-400">Conflict</label>
                  <textarea value={selectedScene.conflict || ""} onChange={(e) => updateSceneField(selectedScene.id, 'conflict', e.target.value)} className="w-full text-xs mt-1 p-2 bg-white border border-stone-200 rounded h-16 resize-none" />
                </div>

                <button onClick={() => deleteScene(selectedScene.id, selectedScene.chapter_id)} className="text-xs text-red-500 flex items-center gap-1 pt-2 hover:underline"><Trash2 size={12} /> Scène verwijderen</button>
              </div>
            ) : (
              <div className="text-stone-400 italic text-xs">Selecteer een scène of bekijk de Codex locaties.</div>
            )}

            {activeTab === "wereld" && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase text-stone-400">Locaties</h4>
                {codexData.locations.map((l: any) => (
                  <div key={l.id} className="p-2 bg-white border border-stone-200 rounded text-xs">
                    <div className="font-bold">{l.name}</div>
                    <div className="text-stone-500">{l.description || 'Geen omschrijving.'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}