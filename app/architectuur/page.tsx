"use client";

// ==========================================
// BLOK 1: IMPORTS (Bibliotheken, Icons & Config)
// ==========================================
import { supabase } from '../lib/supabase'; // Aangepast pad naar lib
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Book, ChevronDown, Menu, X, Sparkles, ArrowLeft, 
  LogOut, Globe, User, Trash2, GripVertical
} from 'lucide-react';
import Link from 'next/link';

// STELR ICON COMPONENTEN (Zelfde als hoofdpagina)
interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

function OriginalFeatherIcon({ size = 22, className = "", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path fill="currentColor" stroke="currentColor" strokeWidth="0.264583" d="m 2.5813051,22.63606 c 0.6705772,-0.494398 1.6561616,-2.346052 2.7576317,-2.784286 0.2598183,-0.103372 -0.1187159,-2.006829 1.5313059,-4.165382 3.1361043,-0.546495 4.9119383,-2.161774 6.5922563,-3.852101 -1.765578,0.54515 -2.041926,0.271772 -2.859292,0.07942 3.305525,-0.607924 5.071188,-1.591805 6.473119,-3.8918132 -1.350827,0.2208936 -3.274837,0.1935116 -3.693252,-10e-8 4.085078,-0.9016829 5.759559,-4.2062255 7.942477,-6.9099549 -4.098094,0.1993918 -6.946767,1.48477 -9.372122,2.9387166 C 10.604814,5.7268966 10.96206,5.9027284 10.722344,6.6716807 10.138224,6.5277407 10.26264,5.1590027 10.48407,4.2095129 9.0668648,5.6893066 7.6647629,7.4643483 7.6644904,10.563494 6.9980824,9.6875543 6.7707359,8.6141653 6.6716807,8.021902 4.9964045,10.139895 5.4145278,12.416739 5.4008845,14.534733 9.6565968,7.8827584 12.908156,6.2099478 16.242366,3.6535394 12.782898,6.7619523 9.0433413,10.004447 5.4803091,15.80553 Z" />
    </svg>
  );
}

function SceneBlocksIcon({ size = 22, className = "", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <g fill="currentColor">
        <rect x="3" y="18" width="4" height="2.5" rx="0.75" />
        <rect x="9" y="18" width="4" height="2.5" rx="0.75" />
        <rect x="15" y="18" width="4" height="2.5" rx="0.75" />
      </g>
    </svg>
  );
}

export default function ArchitectureApp() {
  
  // ==========================================
  // BLOK 2: APPLICATIE STATES
  // ==========================================
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [scenes, setScenes] = useState<Record<string, any>>({});
  const [selectedScene, setSelectedScene] = useState<any>(null);
  const [codexData, setCodexData] = useState<any>({ characters: [], locations: [] });
  
  // Menu & Sidebar navigation states (Gekopieerd van hoofdpagina)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);

  // NIEUW: Accordion states voor mobiel overzicht
  const [mobileExpandedChapters, setMobileExpandedChapters] = useState<Record<string, boolean>>({});
  const [mobileActiveSceneCard, setMobileActiveSceneCard] = useState<string | null>(null);
  const [draggedChapter, setDraggedChapter] = useState<string | null>(null);

  const STATUS_OPTIONS = ["Idee", "Outline", "Concept", "Eerste Versie", "Redactie", "Voltooid", "Archief"];
  const STELR_THEME = { bg: '#e9eae5', primary: '#334a56', accent: '#888268' };

  // ==========================================
  // BLOK 3: MOBILE GESTURES (Swipe naar links voor Scènekaart)
  // ==========================================
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStart.x - touchEndX;
    const diffY = touchStart.y - touchEndY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 60) {
      if (diffX > 0 && !isRightSidebarOpen) {
        setIsRightSidebarOpen(true); // Swipe naar links open details
      } else if (diffX < 0 && isRightSidebarOpen) {
        setIsRightSidebarOpen(false); // Swipe naar rechts sluit details
      }
    }
  };

  // ==========================================
  // BLOK 4: DATA FETCHING & SYNC
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
      fetchedChapters.forEach((ch: any) => {
        if (ch.scenes) {
          const sortedScenes = [...ch.scenes].sort((a: any, b: any) => (a.ord || 0) - (b.ord || 0));
          scenesMap[ch.id] = sortedScenes;
        }
      });
      setScenes(scenesMap);

      const [charRes, locRes] = await Promise.all([
        supabase.from('characters').select('*').eq('project_id', project.id).order('name'),
        supabase.from('locations').select('*').eq('project_id', project.id).order('name')
      ]);

      setCodexData({ characters: charRes.data || [], locations: locRes.data || [] });
    } catch (error) {
      console.error("Fout bij laden project data:", error);
    }
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

  // ==========================================
  // BLOK 5: DRAG AND DROP LOGICA (Hoofdstukken)
  // ==========================================
  const handleChapterMove = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    const updatedChapters = [...chapters];
    const draggedIdx = updatedChapters.findIndex(c => c.id === draggedId);
    const targetIdx = updatedChapters.findIndex(c => c.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const [removed] = updatedChapters.splice(draggedIdx, 1);
    updatedChapters.splice(targetIdx, 0, removed);

    const optimized = updatedChapters.map((ch, index) => ({ ...ch, ord: index + 1 }));
    setChapters(optimized);

    for (const ch of optimized) {
      await supabase.from('chapters').update({ ord: ch.ord }).eq('id', ch.id);
    }
  };

  const addScene = async (chapterId: string) => {
    const currentScenes = scenes[chapterId] || [];
    const { data } = await supabase.from('scenes').insert([{ chapter_id: chapterId, title: 'Nieuwe Scène', purpose: '', ord: currentScenes.length + 1 }]).select();
    if (data && data[0]) setScenes({ ...scenes, [chapterId]: [...currentScenes, data[0]] });
  };

  const deleteScene = async (sceneId: string, chapterId: string) => {
    if (!confirm("Weet je zeker dat je deze scène wilt verwijderen?")) return;
    const { error } = await supabase.from('scenes').delete().eq('id', sceneId);
    if (!error) {
      setScenes((prev: any) => ({ ...prev, [chapterId]: prev[chapterId].filter((s: any) => s.id !== sceneId) }));
      if (selectedScene?.id === sceneId) setSelectedScene(null);
    }
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

  useEffect(() => {
    const startup = async () => {
      const fetchedProjects = await fetchProjects();
      if (fetchedProjects && fetchedProjects.length > 0) await selectProject(fetchedProjects[0]);
    };
    startup();
  }, []);

  // Bottom Navigation Icons Component
const NavigationIcons = () => {
  const hasPrevious = currentSceneIndex > 0;
  const hasNext = currentSceneIndex !== -1 && currentSceneIndex < orderedScenes.length - 1;

  return (
    <div className="flex items-center gap-2 md:gap-4 relative z-[90]">
      
      {/* Pijl Links: Vorige Scène */}
      <button 
        onClick={handlePreviousScene}
        disabled={!hasPrevious}
        className={`p-2 rounded-md transition-colors ${hasPrevious ? "hover:bg-stone-150 cursor-pointer" : "opacity-20 cursor-not-allowed"}`}
        style={{ color: hasPrevious ? STELR_THEME.primary : undefined }}
        title={hasPrevious ? "Vorige scène" : "Eerste scène bereikt"}
      >
        <ArrowLeft size={22} />
      </button>

      {/* Middelste Knop: Link terug naar de Editor via de gelaagde STELR VEER */}
      <Link 
        href="/"
        className="p-2 rounded-md transition-all duration-300 bg-transparent relative group"
        title="Wissel naar Schrijf-editor"
      >
        <div className="relative w-[22px] h-[22px]">
          {/* LAAG 1: De basisveer (Subtiele primaire kleur op de achtergrond) */}
          <OriginalFeatherIcon 
            size={22} 
            style={{ color: STELR_THEME.primary }} 
            className="transition-colors duration-300 opacity-40 group-hover:opacity-100"
          />
          
          {/* LAAG 2: De Modus Overlay (De blokjes lichten op omdat we in Architectuur-modus zitten) */}
          <SceneBlocksIcon 
            size={22} 
            className="absolute top-0 left-0 transition-colors duration-300"
            style={{ color: STELR_THEME.accent }} 
          />
        </div>
      </Link>

      {/* Link 3: Sparkle met AI Submenu */}
      <div className="relative">
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            const nextState = !isAiMenuOpen; 
            setIsAiMenuOpen(nextState); 
            if (nextState) setIsMainMenuOpen(false);
          }}
          className={`p-2 rounded-md transition-colors ${isAiMenuOpen ? "text-purple-600 bg-purple-50" : "hover:bg-stone-150"}`}
          style={{ color: isAiMenuOpen ? undefined : STELR_THEME.primary }}
          title="AI Prompts"
        >
          <Sparkles size={22} />
        </button>

        {/* AI Prompts Submenu */}
        {isAiMenuOpen && (
          <div className="absolute bottom-14 right-0 md:bottom-auto md:top-12 w-48 bg-white border border-[var(--stelr-primary)]/10 rounded-md shadow-xl py-1.5 z-[100] pointer-events-auto">
            <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--stelr-accent)] border-b border-[var(--stelr-primary)]/5 mb-1">
              AI Schrijfhulp
            </div>
            <button onClick={() => { alert("Brainstormen..."); setIsAiMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-stone-50">Brainstorm ideeën</button>
            <button onClick={() => { alert("Structuur controleren..."); setIsAiMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-stone-50">Controleer plottempo</button>
            <button onClick={() => { alert("Samenvatten..."); setIsAiMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-stone-50">Genereer scène-outline</button>
          </div>
        )}
      </div>

      {/* Pijl Rechts: Volgende Scène */}
      <button 
        onClick={handleNextScene}
        disabled={!hasNext}
        className={`p-2 rounded-md transition-colors ${hasNext ? "hover:bg-stone-150 cursor-pointer" : "opacity-20 cursor-not-allowed"}`}
        style={{ color: hasNext ? STELR_THEME.primary : undefined }}
        title={hasNext ? "Volgende scène" : "Laatste scène bereikt"}
      >
        <ArrowRight size={22} />
      </button>

    </div>
  );
};

  // ==========================================
  // BLOK 7: INTERFACE RENDER (JSX)
  // ==========================================
  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        '--stelr-bg': '#e9eae5',
        '--stelr-primary': '#334a56',
        '--stelr-accent': '#888268',
      } as React.CSSProperties}
      className="flex flex-col h-screen bg-[var(--stelr-bg)] text-[var(--stelr-primary)] font-sans overflow-hidden select-none"
    >
      
      {/* APP HEADER */}
      <header className="h-16 border-b border-[var(--stelr-primary)]/10 bg-white flex items-center px-4 justify-between shadow-sm shrink-0 w-full relative z-40">
        <div className="flex items-center gap-3 flex-1">
          <img src="/images/StelrLogo.png" alt="STELR Logo" className="h-9 md:h-12 w-auto object-contain" />
        </div>

        <div className="flex flex-col items-center text-center">
          <span className="block text-[9px] md:text-[10px] uppercase tracking-widest text-[var(--stelr-primary)]/40 font-bold leading-none mb-1">
            {selectedProject ? selectedProject.title : "Geen manuscript"}
          </span>
          <h1 className="font-serif italic font-semibold text-[var(--stelr-primary)] text-sm md:text-base leading-tight">
            Manuscript Architectuur
          </h1>
        </div>

        <div className="flex items-center justify-end gap-3 flex-1">
          <div className="hidden md:block">
            <NavigationIcons />
          </div>
          <button 
            onClick={() => setIsMainMenuOpen(!isMainMenuOpen)} 
            className="p-2 text-[var(--stelr-primary)] hover:bg-[var(--stelr-primary)]/5 rounded-md transition-colors"
          >
            {isMainMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {isMainMenuOpen && (
            <div className="absolute right-0 top-12 w-56 bg-white border border-[var(--stelr-primary)]/10 rounded-md shadow-xl py-2 z-[70]">
              <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--stelr-accent)] border-b border-[var(--stelr-primary)]/5 mb-1">
                STELR Writer
              </div>
              <Link href="/" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[var(--stelr-primary)]/5">
                <ArrowLeft size={16} className="text-[var(--stelr-primary)]/50" />
                <span>Terug naar editor</span>
              </Link>
              <Link href="/wereldbeheer" className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[var(--stelr-primary)]/5">
                <Globe size={16} className="text-[var(--stelr-accent)]" />
                <span>Wereldbeheer</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* WORKSPACE BODY */}
      <div className="flex-1 flex overflow-hidden relative w-full">
        
        {isRightSidebarOpen && <div onClick={() => setIsRightSidebarOpen(false)} className="fixed inset-0 bg-[var(--stelr-primary)]/20 backdrop-blur-xs z-40 xl:hidden" />}

        {/* MIDDENVELD (HET PRIKBORD / ACCORDION) */}
        <section className="flex-1 p-4 md:p-6 overflow-y-auto lg:overflow-y-hidden lg:overflow-x-auto h-full w-full">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
            
            {chapters.map((c) => {
              const isChapterOpenOnMobile = mobileExpandedChapters[c.id] ?? false;
              const chapterScenes = scenes[c.id] || [];

              return (
                <div 
                  key={c.id}
                  draggable={false}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedChapter && draggedChapter !== c.id) {
                      handleChapterMove(draggedChapter, c.id);
                      setDraggedChapter(null);
                    }
                  }}
                  className="w-full lg:w-80 flex-shrink-0 bg-white lg:bg-stone-50/50 p-2 lg:p-4 rounded-xl border border-[var(--stelr-primary)]/10 shadow-sm"
                >
                  {/* HOOFDSTUK HEADER */}
                  <div className="flex items-center justify-between p-2 bg-stone-50 lg:bg-transparent rounded-lg lg:rounded-none">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Grip handle voor verplaatsen */}
                      <div 
                        draggable
                        onDragStart={() => setDraggedChapter(c.id)}
                        onDragEnd={() => setDraggedChapter(null)}
                        className="p-1 cursor-grab text-[var(--stelr-primary)]/40 hover:text-[var(--stelr-primary)] active:cursor-grabbing"
                      >
                        <GripVertical size={16} />
                      </div>
                      
                      <button 
                        onClick={() => setMobileExpandedChapters(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                        className="text-left font-serif font-bold text-sm lg:text-base text-[var(--stelr-primary)] truncate flex-1"
                      >
                        H{c.ord}: {c.title}
                        <span className="lg:hidden text-[10px] text-[var(--stelr-primary)]/40 ml-2">({chapterScenes.length})</span>
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => setMobileExpandedChapters(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                      className="lg:hidden p-1 text-[var(--stelr-primary)]/60"
                    >
                      <ChevronDown size={16} className={`transition-transform duration-200 ${isChapterOpenOnMobile ? "" : "-rotate-90"}`} />
                    </button>
                  </div>

                  {/* SCÈNES (Zichtbaar op desktop, óf opengeklapt op mobiel) */}
                  <div className={`${isChapterOpenOnMobile ? "block" : "hidden lg:block"} mt-3 space-y-2 pl-2 lg:pl-0`}>
                    {chapterScenes.length > 0 ? (
                      chapterScenes.map((s: any) => {
                        const isCardSelected = selectedScene?.id === s.id;
                        const isMobileCardDetailed = mobileActiveSceneCard === s.id;

                        return (
                          <div 
                            key={s.id}
                            onClick={() => {
                              setSelectedScene(s);
                              setMobileActiveSceneCard(isMobileCardDetailed ? null : s.id);
                            }}
                            className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                              isCardSelected 
                                ? "border-[var(--stelr-accent)] bg-[var(--stelr-accent)]/5 shadow-sm" 
                                : "border-[var(--stelr-primary)]/10 bg-white hover:border-[var(--stelr-primary)]/30"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-bold text-[var(--stelr-primary)] truncate">{s.title}</span>
                              <div className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(s.status)}`} />
                            </div>

                            {/* COMPACTE DETAILSTAND (Bij klik op mobiel, altijd op desktop) */}
                            <div className={`${isMobileCardDetailed ? "block" : "hidden lg:block"} mt-2 pt-2 border-t border-[var(--stelr-primary)]/5 space-y-2`}>
                              <p className="text-[11px] text-[var(--stelr-primary)]/70 italic line-clamp-2 leading-relaxed">
                                {s.purpose || "Geen doelsamenvatting..."}
                              </p>

                              <div className="flex flex-wrap gap-1.5 pt-1 text-[9px] font-mono font-bold text-[var(--stelr-primary)]/60">
                                <span className="bg-stone-100 px-1.5 py-0.5 rounded">👤 {s.character_id ? "POV Gekoppeld" : "Geen POV"}</span>
                                <span className="bg-stone-100 px-1.5 py-0.5 rounded">📍 {s.location_id ? "Locatie Gekoppeld" : "Geen Locatie"}</span>
                              </div>

                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const targetChId = prompt(`Verplaats "${s.title}" naar Hoofdstuk nummer:`);
                                  if (!targetChId) return;
                                  const targetCh = chapters.find(ch => ch.ord === parseInt(targetChId));
                                  if (targetCh) {
                                    supabase.from('scenes').update({ chapter_id: targetCh.id }).eq('id', s.id)
                                      .then(() => selectProject(selectedProject));
                                  } else {
                                    alert("Hoofdstuk niet gevonden.");
                                  }
                                }}
                                className="block lg:hidden w-full mt-2 text-center text-[10px] font-bold bg-[var(--stelr-primary)]/5 text-[var(--stelr-primary)] py-1 rounded"
                              >
                                ↕️ Verplaats Scène
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-[10px] text-[var(--stelr-primary)]/40 italic border border-dashed border-[var(--stelr-primary)]/10 rounded-lg">
                        Geen scènes
                      </div>
                    )}
                    
                    <button 
                      onClick={() => addScene(c.id)}
                      className="w-full text-center py-1.5 text-[10px] font-bold text-[var(--stelr-primary)]/40 border border-dashed border-[var(--stelr-primary)]/10 rounded-lg hover:text-[var(--stelr-accent)] transition-colors"
                    >
                      + Scène Toevoegen
                    </button>
                  </div>
                </div>
              );
            })}

          </div>
        </section>

        {/* RECHTER SIDEBAR (VOLLEDIGE SCÈNEKAART - SWIPE LINKS) */}
        <aside className={`
          fixed inset-y-0 right-0 w-80 border-l border-[var(--stelr-primary)]/10 bg-white flex flex-col h-full z-50 transition-transform duration-300 ease-in-out pt-16 xl:pt-0 shadow-xl xl:shadow-none
          xl:relative xl:translate-x-0 ${isRightSidebarOpen ? "translate-x-0" : "translate-x-full"}
        `}>
          <div className="p-3 border-b border-[var(--stelr-primary)]/10 bg-[var(--stelr-bg)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--stelr-primary)]/60 flex justify-between items-center">
            <span>Volledige Scènekaart</span>
            <button onClick={() => setIsRightSidebarOpen(false)} className="xl:hidden p-1 text-[var(--stelr-primary)]/60"><X size={14} /></button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto text-sm space-y-4 select-text">
            {selectedScene ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--stelr-primary)]/40">Titel</label>
                  <input type="text" value={selectedScene.title || ""} onChange={(e) => updateSceneField(selectedScene.id, 'title', e.target.value)} className="w-full text-xs mt-1 p-1.5 bg-[var(--stelr-bg)]/30 border border-[var(--stelr-primary)]/10 rounded focus:outline-none" />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--stelr-primary)]/40">Status</label>
                  <select value={selectedScene.status || "Idee"} onChange={(e) => updateSceneField(selectedScene.id, 'status', e.target.value)} className="w-full text-xs mt-1 p-1.5 bg-[var(--stelr-bg)]/30 border border-[var(--stelr-primary)]/10 rounded focus:outline-none">
                    {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--stelr-primary)]/40">POV Personage</label>
                  <select value={selectedScene.character_id || ""} onChange={(e) => updateSceneField(selectedScene.id, 'character_id', e.target.value || null)} className="w-full text-xs mt-1 p-1.5 bg-[var(--stelr-bg)]/30 border border-[var(--stelr-primary)]/10 rounded focus:outline-none">
                    <option value="">— Kies POV —</option>
                    {codexData.characters.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--stelr-primary)]/40">Locatie</label>
                  <select value={selectedScene.location_id || ""} onChange={(e) => updateSceneField(selectedScene.id, 'location_id', e.target.value || null)} className="w-full text-xs mt-1 p-1.5 bg-[var(--stelr-bg)]/30 border border-[var(--stelr-primary)]/10 rounded focus:outline-none">
                    <option value="">— Kies Locatie —</option>
                    {codexData.locations.map((l: any) => <option key={l.id} value={l.id}>📍 {l.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--stelr-primary)]/40">Doel van scène (Synopsis)</label>
                  <textarea value={selectedScene.purpose || ""} onChange={(e) => updateSceneField(selectedScene.id, 'purpose', e.target.value)} className="w-full text-xs mt-1 p-2 bg-[var(--stelr-bg)]/30 border border-[var(--stelr-primary)]/10 rounded h-24 resize-none focus:outline-none" />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--stelr-primary)]/40">Conflict</label>
                  <textarea value={selectedScene.conflict || ""} onChange={(e) => updateSceneField(selectedScene.id, 'conflict', e.target.value)} className="w-full text-xs mt-1 p-2 bg-[var(--stelr-bg)]/30 border border-[var(--stelr-primary)]/10 rounded h-24 resize-none focus:outline-none" />
                </div>

                <div className="pt-2 border-t border-stone-100 flex justify-between items-center">
                  <Link href="/" className="text-xs text-[var(--stelr-accent)] font-bold hover:underline">✍️ Open in Editor</Link>
                  <button onClick={() => deleteScene(selectedScene.id, selectedScene.chapter_id)} className="text-xs text-red-500 flex items-center gap-1 hover:underline"><Trash2 size={12} /> Verwijderen</button>
                </div>
              </div>
            ) : (
              <div className="text-[var(--stelr-primary)]/40 italic text-xs text-center pt-8">
                Tik op een scène of swipe naar links om gedetailleerde plotgegevens te bekijken en te bewerken.
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* MOBIELE NAVIGATIEBALK ONDERAAN */}
      <div className="md:hidden h-16 bg-white border-t border-[var(--stelr-primary)]/10 flex items-center justify-around px-4 shadow-[0_-2px_10px_rgba(0,0,0,0.02)] z-40">
        <NavigationIcons />
      </div>

    </div>
  );
}