"use client";

// ==========================================
// BLOK 1: IMPORTS (Bibliotheken, Icons & Config)
// ==========================================
import { supabase } from './lib/supabase'; 
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}
import { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
import { 
  Book, ChevronDown, Layout, Info, PenTool, Users, 
  MapPin, Archive, Trash2, Menu, X, SlidersHorizontal, Sparkles,
  ArrowLeft, LogOut, Globe, ArrowRight, User, Settings 
} from 'lucide-react';
import Link from 'next/link';

// ==========================================
// FUNCTIE:
// ==========================================
// De originele Feather Icon 'Feather' als pure SVG component
function OriginalFeatherIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        fill="currentColor" /* Zorgt dat de veer de tekstkleur van je CSS/Tailwind aanneemt */
        stroke="currentColor" 
        strokeWidth="0.264583" 
        d="m 2.5813051,22.63606 c 0.6705772,-0.494398 1.6561616,-2.346052 2.7576317,-2.784286 0.2598183,-0.103372 -0.1187159,-2.006829 1.5313059,-4.165382 3.1361043,-0.546495 4.9119383,-2.161774 6.5922563,-3.852101 -1.765578,0.54515 -2.041926,0.271772 -2.859292,0.07942 3.305525,-0.607924 5.071188,-1.591805 6.473119,-3.8918132 -1.350827,0.2208936 -3.274837,0.1935116 -3.693252,-10e-8 4.085078,-0.9016829 5.759559,-4.2062255 7.942477,-6.9099549 -4.098094,0.1993918 -6.946767,1.48477 -9.372122,2.9387166 C 10.604814,5.7268966 10.96206,5.9027284 10.722344,6.6716807 10.138224,6.5277407 10.26264,5.1590027 10.48407,4.2095129 9.0668648,5.6893066 7.6647629,7.4643483 7.6644904,10.563494 6.9980824,9.6875543 6.7707359,8.6141653 6.6716807,8.021902 4.9964045,10.139895 5.4145278,12.416739 5.4008845,14.534733 9.6565968,7.8827584 12.908156,6.2099478 16.242366,3.6535394 12.782898,6.7619523 9.0433413,10.004447 5.4803091,15.80553 Z" 
      />
    </svg>
  );
}


export default function WritingApp() {
  
  // ==========================================
  // BLOK 2: APPLICATIE STATES (Data & Selecties)
  // ==========================================
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [scenes, setScenes] = useState<Record<string, any>>({});
  const [selectedScene, setSelectedScene] = useState<any>(null);
  const [prose, setProse] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [totalWords, setTotalWords] = useState(0);
  // States voor de 3 nieuwe icoon-links
  const [currentMode, setCurrentMode] = useState<"editor" | "scenes">("editor");
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);

  // Tabs & Codex State
  const [activeTab, setActiveTab] = useState("kaart"); 
  const [codexData, setCodexData] = useState<any>({ characters: [], locations: [], items: [] });
  const [showLegend, setShowLegend] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const STATUS_OPTIONS = ["Idee", "Outline", "Concept", "Eerste Versie", "Redactie", "Voltooid", "Archief"];

  // Sidebar & Menu States
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false); 

const STELR_THEME = {
  bg: '#e9eae5',      // Saffierwit
  primary: '#2b3e48', // Leigrijs
  accent: '#888268',  // Oud-goud
};

  // ==========================================
  // BLOK 3: MOBILE GESTURES (Swipe Detectie)
  // ==========================================
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });

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
// ==========================================
  // SCÈNE NAVIGATIE LOGICA (Vorige / Volgende)
  // ==========================================
  
  // Maak één platte lijst van alle scènes in de exacte volgorde van hoofdstukken en hun order_index
  const orderedScenes = useMemo(() => {
    if (!selectedProject?.id || !chapters.length) return [];
    
    return chapters.reduce((acc: any[], chapter) => {
      const chapterScenes = scenes[chapter.id] || [];
      return [...acc, ...chapterScenes];
    }, []);
  }, [chapters, scenes, selectedProject]);

  // Vind de huidige index van de geselecteerde scène in de geordende lijst
  const currentSceneIndex = useMemo(() => {
    if (!selectedScene) return -1;
    return orderedScenes.findIndex((s) => s.id === selectedScene.id);
  }, [selectedScene, orderedScenes]);

  // Handler om naar de vorige scène te bladeren
  const handlePreviousScene = () => {
    if (currentSceneIndex > 0) {
      const prevScene = orderedScenes[currentSceneIndex - 1];
      handleSceneChange(prevScene);
    }
  };

  // Handler om naar de volgende scène te bladeren
  const handleNextScene = () => {
    if (currentSceneIndex !== -1 && currentSceneIndex < orderedScenes.length - 1) {
      const nextScene = orderedScenes[currentSceneIndex + 1];
      handleSceneChange(nextScene);
    }
  };

// ==========================================
  // HULP-COMPONENT VOOR DE 3 RESPONSIVE LINKS
  // ==========================================
  const NavigationIcons = () => {
    const hasPrevious = currentSceneIndex > 0;
    const hasNext = currentSceneIndex !== -1 && currentSceneIndex < orderedScenes.length - 1;

    return (
      <div className="flex items-center gap-2 md:gap-4 relative z-[90]">
        
        {/* Pijl Links: Vorige Scene */}
        <button 
          onClick={handlePreviousScene}
          disabled={!hasPrevious}
          className={`p-2 rounded-md transition-colors ${hasPrevious ? "text-stone-600 hover:bg-stone-100 cursor-pointer" : "opacity-30 cursor-not-allowed"}`}
          style={{ color: hasPrevious ? STELR_THEME.primary : undefined }}
          title={hasPrevious ? "Vorige scene" : "Eerste scène berecht"}
        >
          <ArrowLeft size={22} />
        </button>

        {/* Link 2: Toggle Editor / Scènes via JOUW ECHTE STELR VEER */}
        <button 
          onClick={() => setCurrentMode(currentMode === "editor" ? "scenes" : "editor")}
          className="p-2 rounded-md transition-colors bg-transparent"
          style={{ 
            color: currentMode === "editor" ? STELR_THEME.accent : STELR_THEME.primary 
          }}
          title={currentMode === "editor" ? "Wissel naar Scène-overzicht" : "Wissel naar Editor"}
        >
          {currentMode === "editor" ? (
            <OriginalFeatherIcon size={22} />
          ) : (
            <Book size={22} /> 
          )}
        </button>

        {/* Link 3: Sparkle met AI Submenu */}
        <div className="relative">
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              const nextState = !isAiMenuOpen; 
              setIsAiMenuOpen(nextState); 
              if (nextState) setIsMainMenuOpen(false);
            }}
            className={`p-2 rounded-md transition-colors ${isAiMenuOpen ? "text-purple-600 bg-purple-50" : "text-stone-600 hover:bg-stone-100"}`}
            title="AI Prompts"
          >
            <Sparkles size={22} />
          </button>

          {/* AI Prompts Submenu */}
          {isAiMenuOpen && (
            <div className="absolute bottom-14 right-0 md:bottom-auto md:top-12 w-48 bg-white border border-stone-200 rounded-md shadow-xl py-1.5 z-[100] pointer-events-auto">
              <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 mb-1">
                AI Schrijfhulp
              </div>
              <button onClick={() => { alert("Prompt 1"); setIsAiMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-stone-50">Brainstorm ideeën</button>
              <button onClick={() => { alert("Prompt 2"); setIsAiMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-stone-50">Herschrijf geselecteerde tekst</button>
              <button onClick={() => { alert("Prompt 3"); setIsAiMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-stone-50">Toon/Sfeer versterken</button>
            </div>
          )}
        </div>

        {/* Pijl Rechts: Volgende Scene */}
        <button 
          onClick={handleNextScene}
          disabled={!hasNext}
          className={`p-2 rounded-md transition-colors ${hasNext ? "text-stone-600 hover:bg-stone-100 cursor-pointer" : "opacity-30 cursor-not-allowed"}`}
          style={{ color: hasNext ? STELR_THEME.primary : undefined }}
          title={hasNext ? "Volgende scene" : "Laatste scène bereikt"}
        >
          <ArrowRight size={22} />
        </button>

      </div>
    );
  };

  // ==========================================
  // BLOK 4: DATA FETCHING & SYNC (Supabase Handlers)
  // ==========================================
  const fetchProjects = useCallback(async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    setProjects(data || []);
    return data;
  }, []);

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

  // Auto-save met 1 seconde debounce vertraging
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

  // ==========================================
  // BLOK 5: CRUD ACTIONS (Add, Update & Delete)
  // ==========================================
  const toggleChapter = async (chapterId: string) => {
    setExpandedChapters((prev) => prev.includes(chapterId) ? prev.filter(id => id !== chapterId) : [...prev, chapterId]);
  };

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

  // ==========================================
  // BLOK 6: EDITOR HELPERS (Opmaak & Styling)
  // ==========================================
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

  // Initialiseer applicatie bij eerste render
  useEffect(() => {
    const startup = async () => {
      const fetchedProjects = await fetchProjects();
      if (fetchedProjects && fetchedProjects.length > 0) await selectProject(fetchedProjects[0]);
    };
    startup();
  }, []);

  // ==========================================
  // BLOK 7: INTERFACE RENDER (JSX Templates)
  // ==========================================
 return (
  <div 
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
    style={{
      '--stelr-bg': '#e9eae5',      // Saffierwit (zacht voor de ogen)
      '--stelr-primary': '#334a56', // Leigrijs (intellectuele basistext/contrast)
      '--stelr-accent': '#888268',  // Oud-goud (luxe accentkleur uit je logo)
    } as React.CSSProperties}
    className="flex flex-col h-screen bg-[var(--stelr-bg)] text-[var(--stelr-primary)] font-sans overflow-hidden select-none"
  >
    
    {/* --- SUB-BLOK: APP HEADER --- */}
 <header className={`h-16 border-b border-[var(--stelr-primary)]/10 bg-white flex items-center px-4 justify-between shadow-sm shrink-0 select-none w-full relative ${(isMainMenuOpen || isAiMenuOpen) ? 'z-[60]' : 'z-40'}`}>
      
      {/* Logo */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <img 
          src="/images/StelrLogo.png" 
          alt="STELR Logo" 
          className="h-9 md:h-12 w-auto object-contain" 
        />
      </div>

      {/* Dynamic Titles */}
      <div className="flex flex-col items-center max-w-[50%] md:max-w-[60%] truncate text-center px-2">
        <span className="block text-[9px] md:text-[10px] uppercase tracking-widest text-[var(--stelr-primary)]/40 font-bold leading-none mb-1 truncate max-w-full">
          {selectedProject ? selectedProject.title : "Geen manuscript"}
        </span>
        <h1 className="font-serif italic font-semibold text-[var(--stelr-primary)] text-xs md:text-base truncate leading-tight max-w-full">
          {selectedScene ? selectedScene.title : "Geen scène geselecteerd"}
        </h1>
      </div>

      {/* Menu & Dropdown */}
      <div className="flex items-center justify-end gap-3 flex-1 relative z-[60]">
        <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-[var(--stelr-primary)]/40 font-medium whitespace-nowrap">
          {isSaving ? 'Synchroniseren...' : 'Opgeslagen'}
        </span>
        <div className="hidden md:block">
          <NavigationIcons />
        </div>
<button 
  onClick={(e) => { 
    e.stopPropagation(); 
    const nextState = !isMainMenuOpen; 
    setIsMainMenuOpen(nextState); 
    if (nextState) setIsAiMenuOpen(false); // Sluit het AI-menu als hamburger opengaat
  }} 
  className="p-2 text-[var(--stelr-primary)] hover:bg-[var(--stelr-primary)]/5 rounded-md transition-colors relative z-50 pointer-events-auto"
  aria-label="Applicatie menu"
>
  {isMainMenuOpen ? <X size={22} /> : <Menu size={22} />}
</button>

        {isMainMenuOpen && (
          <div className="absolute right-0 top-12 w-56 bg-white border border-[var(--stelr-primary)]/10 rounded-md shadow-xl py-2 z-[70] pointer-events-auto">
            <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--stelr-accent)] border-b border-[var(--stelr-primary)]/5 mb-1">
              STELR Writer
            </div>
            <Link href="/hub" onClick={() => setIsMainMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--stelr-primary)] hover:bg-[var(--stelr-primary)]/5 transition-colors">
              <ArrowLeft size={16} className="text-[var(--stelr-primary)]/50" />
              <span>Naar de Hub</span>
            </Link>
            <button onClick={() => { alert("Profiel openen"); setIsMainMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--stelr-primary)] hover:bg-[var(--stelr-primary)]/5 text-left transition-colors">
              <User size={16} className="text-[var(--stelr-primary)]/50" />
              <span>Mijn Profiel</span>
            </button>
            <div className="border-t border-[var(--stelr-primary)]/5 my-1 opacity-60" />
            
            {/* WERKEND GEMAAKTE LINK: Wereldbeheer */}
            <Link href="/wereldbeheer" onClick={() => setIsMainMenuOpen(false)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--stelr-primary)] hover:bg-[var(--stelr-primary)]/5 text-left font-medium transition-colors">
              <Globe size={16} className="text-[var(--stelr-accent)]" />
              <span>Wereldbeheer</span>
            </Link>
            
            <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--stelr-primary)]/40 hover:bg-[var(--stelr-primary)]/5 text-left italic transition-colors cursor-not-allowed">
              <span>↳ Architectuur (binnenkort)</span>
            </button>
            <div className="border-t border-[var(--stelr-primary)]/5 mt-1.5 pt-1.5">
              <button onClick={() => { alert("Uitloggen..."); setIsMainMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left transition-colors">
                <LogOut size={16} />
                <span>Uitloggen</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>

    {/* Main Workspace Body */}
    <div className="flex-1 flex overflow-hidden relative w-full">
      
      {/* Mobile Sidebar Overlays */}
      {isLeftSidebarOpen && <div onClick={() => setIsLeftSidebarOpen(false)} className="fixed inset-0 bg-[var(--stelr-primary)]/20 backdrop-blur-xs z-40 lg:hidden" />}
      {isRightSidebarOpen && <div onClick={() => setIsRightSidebarOpen(false)} className="fixed inset-0 bg-[var(--stelr-primary)]/20 backdrop-blur-xs z-40 xl:hidden" />}

      {/* --- SUB-BLOK: LINKER SIDEBAR (Manuscript & Structuur) --- */}
      <nav className={`
        fixed inset-y-0 left-0 w-72 bg-white border-r border-[var(--stelr-primary)]/10 flex flex-col h-full z-50 transition-transform duration-300 ease-in-out pt-16 lg:pt-0
        lg:relative lg:translate-x-0 ${isLeftSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-4 border-b border-[var(--stelr-primary)]/10 font-serif font-bold text-base flex items-center justify-between lg:hidden">
          <span className="text-[var(--stelr-primary)]">Manuscripten</span>
          <button onClick={() => setIsLeftSidebarOpen(false)} className="p-1 text-[var(--stelr-primary)]/60"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {projects.map((p: any) => (
            <div key={p.id} className="space-y-1">
              <button onClick={() => selectProject(p)} className={`w-full text-left p-2 rounded text-sm hover:bg-[var(--stelr-bg)]/60 transition-colors ${selectedProject?.id === p.id ? "bg-[var(--stelr-bg)] font-bold text-[var(--stelr-primary)]" : "text-[var(--stelr-primary)]/80"}`}>
                {p.title}
              </button>

              {selectedProject?.id === p.id && chapters.map((c) => (
                <div key={c.id} className="ml-2 space-y-1">
                  <button onClick={() => toggleChapter(c.id)} className="w-full text-left text-xs font-semibold p-1 flex items-center gap-1 text-[var(--stelr-primary)]/80 truncate">
                    <ChevronDown size={12} className={`${expandedChapters.includes(c.id) ? "" : "-rotate-90"} transition-transform`} />
                    H{c.ord}: {c.title}
                  </button>

                  {expandedChapters.includes(c.id) && (
                    <div className="ml-3 border-l border-[var(--stelr-primary)]/20 pl-2 space-y-0.5">
                      {scenes[c.id]?.map((s: any) => (
                        <button key={s.id} onClick={() => handleSceneChange(s)} className={`w-full text-left p-1 text-xs rounded truncate flex items-center gap-2 transition-colors ${selectedScene?.id === s.id ? "font-bold text-[var(--stelr-accent)] bg-[var(--stelr-accent)]/10" : "text-[var(--stelr-primary)]/60 hover:text-[var(--stelr-primary)]"}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(s.status)}`} />
                          <span className="truncate">{s.title}</span>
                        </button>
                      ))}
                      <button onClick={() => addScene(c.id)} className="text-[11px] text-[var(--stelr-primary)]/40 hover:text-[var(--stelr-accent)] block pt-1 transition-colors">+ Scène</button>
                    </div>
                  )}
                </div>
              ))}
              {selectedProject?.id === p.id && (
                <button onClick={() => { const t = prompt("Titel:"); if(t) addChapter(t); }} className="text-[11px] text-[var(--stelr-primary)]/60 font-bold ml-2 pt-2 block hover:text-[var(--stelr-accent)] transition-colors">+ Hoofdstuk</button>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--stelr-primary)]/10 bg-[var(--stelr-bg)]/30 text-xs font-bold text-[var(--stelr-primary)]/70 flex justify-between">
          <span>TOTAAL:</span>
          <span>{totalWords.toLocaleString()} wrd</span>
        </div>
      </nav>

      {/* --- SUB-BLOK: DE HOOFDEDITOR --- */}
      <section className="flex-1 bg-[var(--stelr-bg)] p-4 md:p-8 overflow-y-auto min-w-0 h-full flex flex-col items-center">
        {selectedScene ? (
          <div className="w-full max-w-prose h-full flex flex-col select-text bg-white p-6 md:p-10 rounded-lg shadow-xs border border-[var(--stelr-primary)]/5">
            
            {/* Opmaak Toolbalk */}
            <div className="flex items-center justify-between border-b border-[var(--stelr-primary)]/5 pb-2 mb-4 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--stelr-primary)]/40 select-none">
              <div className="flex gap-3">
                <button type="button" onClick={() => applyStyle('gedachte')} className="hover:text-[var(--stelr-accent)] transition-colors">Gedachte</button>
                <button type="button" onClick={() => applyStyle('brief')} className="hover:text-[var(--stelr-accent)] transition-colors">Brief</button>
                <button type="button" onClick={() => applyStyle('whatsapp')} className="hover:text-[var(--stelr-accent)] transition-colors">WhatsApp</button>
              </div>
              <button onClick={() => setShowLegend(!showLegend)} className="hover:text-[var(--stelr-accent)] flex items-center gap-1 transition-colors"><Info size={12} /> Stijlgids</button>
            </div>

            {showLegend && (
              <div className="mb-4 p-3 bg-[var(--stelr-bg)]/50 border border-[var(--stelr-primary)]/10 rounded text-xs text-[var(--stelr-primary)]/80 grid grid-cols-2 gap-2 select-none">
                <div><span className="font-mono text-[var(--stelr-accent)]">*Tekst*</span> = Gedachte</div>
                <div><span className="font-mono text-[var(--stelr-accent)]">&gt;&gt;&gt; Tekst &lt;&lt;&lt;</span> = Brief</div>
              </div>
            )}

            {/* Textarea invoerveld */}
            <textarea 
              id="schrijfveld"
              className="flex-1 w-full border-none focus:ring-0 text-base md:text-lg leading-relaxed font-serif text-[var(--stelr-primary)] resize-none outline-none bg-transparent placeholder-[var(--stelr-primary)]/30"
              value={prose}
              onChange={(e) => { setProse(e.target.value); if (selectedScene?.id) saveProse(selectedScene.id, e.target.value); }}
              placeholder="Begin met schrijven... (Swipe vanaf de zijkanten voor navigatie/scènekaart)"
            />
          </div>
        ) : (
          /* Empty State Screen */
          <div className="my-auto text-[var(--stelr-primary)]/30 italic text-center p-4 select-none">
            <Book size={48} className="mx-auto mb-2 opacity-30" />
            <p>Swipe vanaf de linkerkant van je scherm naar rechts om je manuscripten te tonen.</p>
          </div>
        )}
      </section>

      {/* --- SUB-BLOK: RECHTER SIDEBAR (Scènekaart & Codex) --- */}
      <aside className={`
        fixed inset-y-0 right-0 w-80 border-l border-[var(--stelr-primary)]/10 bg-white flex flex-col h-full z-50 transition-transform duration-300 ease-in-out pt-16 xl:pt-0 shadow-xl xl:shadow-none
        xl:relative xl:translate-x-0 ${isRightSidebarOpen ? "translate-x-0" : "translate-x-full"}
      `}>
        <div className="flex border-b border-[var(--stelr-primary)]/10 bg-[var(--stelr-bg)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--stelr-primary)]/60 shrink-0">
          <button onClick={() => setActiveTab("kaart")} className={`flex-1 p-3 text-center transition-all ${activeTab === 'kaart' ? 'bg-white border-b-2 border-[var(--stelr-accent)] text-[var(--stelr-primary)] font-bold' : ''}`}>Scènekaart</button>
          <button onClick={() => setActiveTab("wereld")} className={`flex-1 p-3 text-center transition-all ${activeTab === 'wereld' ? 'bg-white border-b-2 border-[var(--stelr-accent)] text-[var(--stelr-primary)] font-bold' : ''}`}>Codex</button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto text-sm space-y-4">
          {selectedScene && activeTab === "kaart" ? (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--stelr-primary)]/40">Status</label>
                <select value={selectedScene.status || "Idee"} onChange={(e) => updateSceneField(selectedScene.id, 'status', e.target.value)} className="w-full text-xs mt-1 p-1.5 bg-[var(--stelr-bg)]/30 border border-[var(--stelr-primary)]/10 rounded text-[var(--stelr-primary)] focus:outline-none">
                  {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--stelr-primary)]/40">POV Personage</label>
                <select value={selectedScene.pov || ""} onChange={(e) => updateSceneField(selectedScene.id, 'pov', e.target.value)} className="w-full text-xs mt-1 p-1.5 bg-[var(--stelr-bg)]/30 border border-[var(--stelr-primary)]/10 rounded text-[var(--stelr-primary)] focus:outline-none">
                  <option value="">— Kies POV —</option>
                  {codexData.characters.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--stelr-primary)]/40">Doel van scène</label>
                <textarea value={selectedScene.purpose || ""} onChange={(e) => updateSceneField(selectedScene.id, 'purpose', e.target.value)} className="w-full text-xs mt-1 p-2 bg-[var(--stelr-bg)]/30 border border-[var(--stelr-primary)]/10 rounded h-16 resize-none text-[var(--stelr-primary)] focus:outline-none" />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--stelr-primary)]/40">Conflict</label>
                <textarea value={selectedScene.conflict || ""} onChange={(e) => updateSceneField(selectedScene.id, 'conflict', e.target.value)} className="w-full text-xs mt-1 p-2 bg-[var(--stelr-bg)]/30 border border-[var(--stelr-primary)]/10 rounded h-16 resize-none text-[var(--stelr-primary)] focus:outline-none" />
              </div>

              <button onClick={() => deleteScene(selectedScene.id, selectedScene.chapter_id)} className="text-xs text-red-500 flex items-center gap-1 pt-2 hover:underline"><Trash2 size={12} /> Scène verwijderen</button>
            </div>
          ) : (
            <div className="text-[var(--stelr-primary)]/40 italic text-xs">Selecteer een scène of bekijk de Codex locaties.</div>
          )}

          {activeTab === "wereld" && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase text-[var(--stelr-primary)]/40">Locaties</h4>
              {codexData.locations.map((l: any) => (
                <div key={l.id} className="p-2.5 bg-[var(--stelr-bg)]/20 border border-[var(--stelr-primary)]/5 rounded text-xs">
                  <div className="font-bold text-[var(--stelr-primary)]">{l.name}</div>
                  <div className="text-[var(--stelr-primary)]/60 mt-0.5">{l.description || 'Geen omschrijving.'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

    </div>
    
    {/* --- MOBIELE NAVIGATIEBALK ONDERAAN --- */}
<div className={`md:hidden h-16 bg-white border-t border-[var(--stelr-primary)]/10 flex items-center justify-around px-4 shadow-[0_-2px_10px_rgba(0,0,0,0.02)] ${isAiMenuOpen ? 'z-[60]' : 'z-40'}`}>
      <NavigationIcons />
    </div>
  </div>
);
}