'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Layout, Save, MoveHorizontal, MapPin, User, 
  Clock, Link as LinkIcon, Settings, X, ChevronRight, 
  Layers, ArrowRight
} from 'lucide-react';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const hours = Array.from({ length: 24 }, (_, i) => i);

export default function MontageKamer() {
  const [scenes, setScenes] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);


const fetchData = async () => {
  // 1. Project ophalen
  const { data: proj } = await supabase.from('projects').select('*').limit(1).single();
  if (!proj) return;
  setSelectedProject(proj);

  // 2. Hoofdstukken ophalen
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id')
    .eq('project_id', proj.id);

  if (!chapters || chapters.length === 0) return;
  const chapterIds = chapters.map(c => c.id);

  // 3. Parallel alles ophalen (NU pas maken we scns en chars aan)
  const [scenesRes, charsRes, locsRes] = await Promise.all([
    supabase.from('scenes').select('*').in('chapter_id', chapterIds).order('order_index', { ascending: true }),
    supabase.from('characters').select('id, name').eq('project_id', proj.id),
    supabase.from('locations').select('*').eq('project_id', proj.id)
  ]);

  const scns = scenesRes.data || [];
  const chars = charsRes.data || [];
  const locs = locsRes.data || [];

  // --- DEBUGGING (Nu staan ze op de juiste plek) ---
  if (scns.length > 0 && chars.length > 0) {
    console.log("DEBUG: Eerste waarde in 'pov' kolom van scenes:", scns[0].pov);
    console.log("DEBUG: Eerste ID in characters tabel:", chars[0].id);
  }

  // 4. De koppeling met fallback
  const scenesWithPov = scns.map(scene => {
    const rawPovValue = scene.pov;
    
    // Probeer match op ID
    const charMatch = chars.find(c => 
      String(c.id).trim().toLowerCase() === String(rawPovValue).trim().toLowerCase()
    );

    return {
      ...scene,
      // Als er geen match is, tonen we de ruwe waarde uit de DB zodat we zien wat er staat
      pov_name: charMatch ? charMatch.name : (rawPovValue ? `DB: ${rawPovValue}` : "GEEN DATA")
    };
  });

  console.log("Matches gevonden:", scenesWithPov.filter(s => !s.pov_name.startsWith('DB:')).length);

  setScenes(scenesWithPov);
  setLocations(locs);
};



  useEffect(() => { fetchData(); }, []);

  // 2. LOGICA VOOR LANES
// 2. LOGICA VOOR LANES (Geoptimaliseerd voor dynamische tijdlijn)
  const lanes = useMemo(() => {
    if (scenes.length > 0) {
    console.log("Scene check in Memo:", scenes[0]);
  }// Haal de hoofdlocaties op
    const majorLocations = locations.filter(l => l.is_major_location);
    const groups: Record<string, any[]> = { "Onbekend": [] };
    
    // Initialiseer de groepen
    majorLocations.forEach(ml => { groups[ml.name] = []; });

    // BELANGRIJK: Sorteer scènes eerst chronologisch op tijd
    const sortedScenes = [...scenes].sort((a, b) => {
      const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
      const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
      return timeA - timeB;
    });

    sortedScenes.forEach(scene => {
      const loc = locations.find(l => l.id === scene.location_id);
      
      if (!loc) {
        groups["Onbekend"].push(scene);
      } else {
        // Zoek de ouder (Major Location)
        const parent = loc.is_major_location 
          ? loc 
          : locations.find(l => l.id === loc.parent_location_id);
        
        const laneName = parent ? parent.name : "Onbekend";
        
        if (!groups[laneName]) groups[laneName] = [];
        groups[laneName].push(scene);
      }
    });

    return groups;
  }, [scenes, locations]);

  // 3. OPSLAAN
  const saveChanges = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('scenes').upsert(scenes);
    if (!error) {
      setIsDirty(false);
      alert("Montage opgeslagen!");
    }
    setIsSaving(false);
  };
// DEBUG HULPMIDDEL: Verwijder dit nadat het werkt
useEffect(() => {
  if (scenes.length > 0) {
    console.log("--- DEBUG DATA CHECK ---");
    console.log("Aantal scenes:", scenes.length);
    console.log("Eerste scene data:", {
      titel: scenes[0].title,
      location_id: scenes[0].location_id,
      start_time: scenes[0].start_time,
      is_flashback: scenes[0].is_flashback
    });
    console.log("Aantal locaties:", locations.length);
    if (locations.length > 0) {
      console.log("Eerste locatie:", {
        naam: locations[0].name,
        is_major: locations[0].is_major_location,
        parent: locations[0].parent_location_id
      });
    }
  }
}, [scenes, locations]);


// 1. Sleep-logica voor de Master Cut
const handleDragStart = (e: React.DragEvent, index: number) => {
  e.dataTransfer.setData('sceneIndex', index.toString());
};

const handleDrop = (e: React.DragEvent, targetIndex: number) => {
  const sourceIndex = parseInt(e.dataTransfer.getData('sceneIndex'));
  if (sourceIndex === targetIndex) return;

  const newScenes = [...scenes];
  const [movedScene] = newScenes.splice(sourceIndex, 1);
  newScenes.splice(targetIndex, 0, movedScene);

  // Update de order_index voor alle scènes op basis van hun nieuwe positie
  const updatedScenes = newScenes.map((scene, index) => ({
    ...scene,
    order_index: index
  }));

  setScenes(updatedScenes);
  setIsDirty(true);
};

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault(); // Nodig om drop toe te staan
};

// 3. BEREKEN UNIEKE TIJDSTIPPEN (De rijen voor je tijdlijn)
  const uniqueTimes = useMemo(() => {
    const times = new Set<string>();
    
    scenes.forEach(s => {
      if (s.start_time) {
        // We slaan de volledige tijd op zodat we per minuut kunnen groeperen
        times.add(new Date(s.start_time).toISOString());
      }
    });

    // Sorteer de tijden chronologisch
    return Array.from(times).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [scenes]);

  return (
    <div className="flex h-screen bg-stone-900 text-stone-200 overflow-hidden flex-col">
      
      {/* HEADER & CONTROLS */}
      <header className="h-16 border-b border-stone-800 flex items-center justify-between px-6 bg-stone-950/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-stone-800 rounded-lg transition-all text-stone-500 hover:text-white">
            <ArrowRight className="rotate-180" size={20} />
          </Link>
          <h1 className="font-serif text-xl font-bold tracking-tight">Montagekamer <span className="text-stone-600 text-sm font-sans ml-2">/ {selectedProject?.title}</span></h1>
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <button onClick={saveChanges} disabled={isSaving} className="bg-orange-700 hover:bg-orange-600 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-900/20">
              <Save size={14} /> {isSaving ? 'Opslaan...' : 'Vastleggen'}
            </button>
          )}
        </div>
      </header>

{/* MASTER CUT (Sticky Top) */}
<section className="h-48 border-b border-stone-800 bg-stone-900/80 p-4 overflow-x-auto flex items-center gap-4 no-scrollbar">
  <div className="flex-shrink-0 w-32 border-r border-stone-800 h-full flex flex-col justify-center">
    <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Master Cut</span>
    <p className="text-[10px] text-stone-500 leading-tight">De volgorde van je manuscript</p>
  </div>
  
  <div className="flex gap-3 h-full items-center">
    {scenes.map((scene, i) => (
      <div 
        key={scene.id} 
        draggable
        onDragStart={(e) => handleDragStart(e, i)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, i)}
        className="w-48 h-32 bg-stone-800 border border-stone-700 rounded-xl p-3 flex-shrink-0 relative group hover:border-orange-800/50 transition-all cursor-move active:scale-95 active:rotate-2 shadow-lg hover:shadow-orange-900/10"
      >
        {/* Positie nummering */}
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-stone-950 rounded-full border border-stone-800 flex items-center justify-center text-[10px] font-bold text-stone-500 group-hover:text-orange-500 group-hover:border-orange-500 transition-colors z-10">
          {i + 1}
        </div>

        <h4 className="text-xs font-bold line-clamp-2 mb-1 text-stone-200">
          {scene.title || "Naamloze scène"}
        </h4>
        
        <p className="text-[10px] text-stone-500 line-clamp-2 italic leading-tight">
          {scene.summary || "Geen samenvatting..."}
        </p>

        {/* Status Indicators */}
        <div className="absolute bottom-2 left-3 flex items-center gap-2">
           {scene.is_flashback && (
             <span className="text-[8px] text-blue-400 font-bold uppercase tracking-tighter">Flashback</span>
           )}
        </div>
        
        <div className="absolute bottom-2 right-2 flex gap-1 items-center">
          <span className="text-[8px] text-stone-600 font-mono mr-1">
            {scene.duration_mins ? `${scene.duration_mins}m` : ''}
          </span>
          <div className={`w-1.5 h-1.5 rounded-full ${scene.is_flashback ? 'bg-blue-400 animate-pulse' : 'bg-green-500'}`} />
        </div>
      </div>
    ))}
  </div>
</section>

{/* LANES (Scrollable Body met Tijd-as) */}
<main className="flex-1 overflow-auto bg-stone-900/50 relative no-scrollbar">
  {/* TIJD-BALK BOVENIN (Sticky) */}
  <div className="sticky top-0 z-30 flex bg-stone-950/90 backdrop-blur-md border-b border-stone-800 ml-48">
    {uniqueTimes.map(time => (
      <div key={time} className="w-72 flex-shrink-0 p-4 border-r border-stone-800/50">
        <span className="text-[10px] font-black text-orange-600 uppercase block">
          {new Date(time).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric' })}
        </span>
        <span className="text-sm font-mono text-stone-200">
          {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    ))}
  </div>

  {/* DE RIJEN (Locaties) */}
  <div className="flex flex-col">
    {Object.entries(lanes).map(([laneName, laneScenes]) => (
      <div key={laneName} className="flex border-b border-stone-800/50 group min-h-[160px]">
        
        {/* LOCATIE LABEL (Sticky Links) */}
        <div className="w-48 flex-shrink-0 sticky left-0 z-20 bg-stone-900 border-r border-stone-700 p-4 flex flex-col justify-center shadow-xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400 group-hover:text-orange-500 transition-colors flex items-center gap-2">
            <MapPin size={12} /> {laneName}
          </h3>
          <span className="text-[9px] text-stone-600 mt-1 font-mono">{laneScenes.length} scènes</span>
        </div>

        {/* DE SCÈNES (Horizontaal) */}
<div className="flex relative">
  {/* Verbindingslijn die door de hele rij loopt (achter de kaartjes langs) */}
  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-stone-800/40 z-0"></div>

  {uniqueTimes.map(time => {
    const scene = laneScenes.find(s => s.start_time && new Date(s.start_time).toISOString() === time);
    
    // We gebruiken hier de pov_name die we in de fetchData handmatig hebben gekoppeld
    const povName = scene?.pov_name;

    return (
      <div key={time} className="w-72 flex-shrink-0 p-3 relative flex items-center justify-center border-r border-stone-800/10 z-10">
        {scene ? (
          <div className={`w-full h-36 p-4 rounded-2xl border transition-all hover:scale-[1.05] hover:z-50 cursor-pointer shadow-2xl relative flex flex-col justify-between
            ${scene.is_flashback 
              ? 'border-dashed border-blue-900/40 bg-blue-950/20 shadow-blue-900/10' 
              : 'bg-stone-800 border-stone-700 hover:border-orange-500/50 hover:bg-stone-800/90'}`}
          >
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[8px] font-bold text-orange-600">CUT #{scenes.findIndex(s => s.id === scene.id) + 1}</span>
                <span className="text-[8px] text-stone-600 font-mono">{scene.duration_mins}m</span>
              </div>
              <h5 className="text-[11px] font-bold text-stone-100 line-clamp-2 leading-tight group-hover:text-orange-100">
                {scene.title || "Naamloze scène"}
              </h5>
            </div>
            
            {/* ONDERKANT KAARTJE: POV + Status */}
            <div className="flex justify-between items-end gap-2">
              <div className="flex items-center gap-1.5 bg-stone-900/80 px-2 py-1 rounded-lg border border-stone-700/50 shadow-inner max-w-[85%] overflow-hidden">
                <User size={10} className={povName ? "text-orange-500" : "text-stone-600"} />
                <span className={`text-[8px] font-black uppercase tracking-tighter truncate ${povName ? "text-stone-300" : "text-stone-600"}`}>
                  {scene.pov_name || "POV ONBEKEND"}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1">
                {scene.is_flashback && <Layers size={10} className="text-blue-500" />}
                <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)] ${scene.is_flashback ? 'bg-blue-500 shadow-blue-500/40' : 'bg-green-600 shadow-green-600/40'}`} />
              </div>
            </div>
          </div>
        ) : (
          /* Verbindingsknooppunt op de lijn als er geen scène is */
          <div className="w-1.5 h-1.5 rounded-full bg-stone-800 border border-stone-700/50 z-0" />
        )}
      </div>
    );
  })}
</div>
      </div>
    ))}
  </div>
</main>

    </div>
  );
}