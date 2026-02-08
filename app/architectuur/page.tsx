'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Layout, Save, MoveHorizontal, MapPin, User, Sword, Edit3, Share2, GripVertical } from 'lucide-react';
import Link from 'next/link';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ArchitectuurPage() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [draggedScene, setDraggedScene] = useState<any>(null);
  const [draggedChapter, setDraggedChapter] = useState<any>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(new Set());

  // 1. Data ophalen: Hoofdstukken + Scènes + POV + Locatie
// Voeg deze state toe bovenaan je component
const [unassignedScenes, setUnassignedScenes] = useState<any[]>([]);

const fetchStructure = async () => {
  try {
    const { data: allChapters, error: chapError } = await supabase
      .from('chapters')
      .select('*')
      .order('ord', { ascending: true });

    const { data: allScenes, error: sceneError } = await supabase
      .from('scenes')
      .select(`
        id, 
        title, 
        summary, 
        order_index, 
        chapter_id,
        status,
        pov,
        setting,
        purpose,
        conflict,
        outcome,
        prose
      `);

    if (chapError || sceneError) {
      console.error("Database details:", chapError || sceneError);
      return;
    }

    const formattedChapters = allChapters.map(ch => ({
      ...ch,
      scenes: (allScenes || [])
        .filter(s => s.chapter_id === ch.id)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    }));

    setChapters(formattedChapters);
    setUnassignedScenes((allScenes || []).filter(s => !s.chapter_id));
    
  } catch (err) {
    console.error("Systeemfout:", err);
  }
};

  useEffect(() => { fetchStructure(); }, []);

  // 2. Drag & Drop Logica
  const handleDragStart = (scene: any) => setDraggedScene(scene);

  const onDrop = (targetChapterId: string, targetIndex: number) => {
    if (!draggedScene) return;

    const newChapters = [...chapters];
    // Verwijder uit oud hoofdstuk
    newChapters.forEach(ch => {
      ch.scenes = ch.scenes.filter((s: any) => s.id !== draggedScene.id);
    });

    // Voeg toe aan nieuw hoofdstuk
    const targetChapter = newChapters.find(ch => ch.id === targetChapterId);
    if (targetChapter) {
      targetChapter.scenes.splice(targetIndex, 0, { ...draggedScene, chapter_id: targetChapterId });
      // Herindexeer
      targetChapter.scenes = targetChapter.scenes.map((s: any, i: number) => ({ ...s, order_index: i }));
    }

    setChapters(newChapters);
    setIsDirty(true);
    setDraggedScene(null);
  };
const onChapterDragStart = (chapter: any) => {
    setDraggedChapter(chapter);
    setDraggedScene(null); // Zorg dat we niet tegelijk een scene slepen
  };

  const onChapterDrop = (targetIndex: number) => {
    if (!draggedChapter) return;

    const newChapters = [...chapters];
    const currentIndex = newChapters.findIndex(ch => ch.id === draggedChapter.id);
    
    // Verplaats het hoofdstuk in de lijst
    newChapters.splice(currentIndex, 1);
    newChapters.splice(targetIndex, 0, draggedChapter);

    setChapters(newChapters);
    setIsDirty(true);
    setDraggedChapter(null);
  };
  // 3. Opslaan naar Database
const saveChanges = async () => {
  setIsSaving(true);
  try {
    // A. UPDATE HOOFDSTUK VOLGORDE
    // We maken een lijstje van alle hoofdstukken met hun nieuwe 'ord' (plek in de rij)
    const chapterUpdates = chapters.map((ch, i) => ({
      id: ch.id,
      title: ch.title,
      project_id: ch.project_id, // Zorg dat project_id mee gaat als dat verplicht is
      ord: i + 1                 // De nieuwe positie: 1, 2, 3...
    }));

    const { error: chError } = await supabase
      .from('chapters')
      .upsert(chapterUpdates, { onConflict: 'id' });

    if (chError) {
      console.error("Fout bij hoofdstukken:", chError.message);
      throw new Error("Hoofdstuk volgorde kon niet worden opgeslagen.");
    }

    // B. UPDATE SCENE VOLGORDE (Je bestaande logica, maar nu als stap 2)
const updates = chapters.flatMap((ch) =>
  ch.scenes.map((s: any, i: number) => ({
    ...s,            // Behoud alle bestaande velden (prose, titel, etc.)
    chapter_id: ch.id, // Koppel aan het huidige hoofdstuk in de lijst
    order_index: i,  // Geef de positie binnen het hoofdstuk
    ord: i           // Back-up volgorde kolom
  }))
);

    const { error: scError } = await supabase
      .from('scenes')
      .upsert(updates, { onConflict: 'id' });

    if (scError) throw new Error(scError.message);

    setIsDirty(false);
    alert('Alles succesvol opgeslagen: Hoofdstukken én scènes!');
  } catch (err: any) {
    console.error("Volledig foutobject:", err);
    alert(`Fout bij opslaan: ${err.message || 'Onbekende fout'}`);
  } finally {
    setIsSaving(false);
  }
};


// 1. Jouw originele kleurfunctie (voor de felle accenten)
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

// 2. De nieuwe functie voor de lichte kaart-achtergronden
const getCardStyle = (status: string) => {
  switch (status) {
    case 'Idee': return 'bg-purple-50 border-purple-200 text-purple-900';
    case 'Outline': return 'bg-blue-50 border-blue-200 text-blue-900';
    case 'Concept': return 'bg-amber-50 border-amber-200 text-amber-900';
    case 'Eerste Versie': return 'bg-stone-100 border-stone-300 text-stone-900';
    case 'Redactie': return 'bg-orange-50 border-orange-200 text-orange-900';
    case 'Voltooid': return 'bg-green-50 border-green-200 text-green-900';
    case 'Archief': return 'bg-red-50 border-red-200 text-red-900';
    default: return 'bg-white border-stone-200 text-stone-900';
  }
};

const copySelectedForAI = () => {
  // De nieuwe instructies als header van de kopieerslag
  let exportText = `Analyseer de volgende scènes op tempo, logica en narratieve spanning.
Hanteer de volgende spelregels:

1. Behoud de status quo tenzij: Stel alleen een verschuiving voor als de huidige volgorde de spanning doodt, de logica breekt of een emotionele pay-off te vroeg weggeeft.
2. Toets aan de 'Vise-methode': Wordt de druk op de hoofdpersoon per scène groter? Zo niet, hoe repareren we dat met de minste impact op de tijdlijn?
3. Tijd-efficiëntie: Is de fysieke tijd (middag/avond) geloofwaardig voor de acties die plaatsvinden?
4. Keuze-verantwoording: Als je adviseert om de volgorde te behouden, leg dan uit waarom deze opbouw juist sterk is.

Hier zijn de scènes:
\n# AI ANALYSE VERZOEK - SELECTIE\n\n`;
  
  chapters.forEach(chapter => {
const selectedInChapter = chapter.scenes.filter((s: any) => selectedSceneIds.has(s.id));
    if (selectedInChapter.length > 0) {
      exportText += `## HOOFDSTUK ${chapter.ord}: ${chapter.title || 'Naamloos'}\n`;
      selectedInChapter.forEach((scene: any) => {
        exportText += `### SCÈNE: ${scene.title}\n`;
        exportText += `- POV: ${scene.pov || 'Onbekend'}\n`;
        exportText += `- Setting: ${scene.setting || 'onbekend'}\n`;
        exportText += `- Conflict: ${scene.conflict || 'onbekend'}\n`;
        exportText += `- Context: ${scene.summary || 'Geen samenvatting'}\n\n`;
      });
    }
  });

  if (selectedSceneIds.size === 0) {
    alert("Selecteer eerst een paar scènes door de vinkjes aan te zetten.");
    return;
  }

  navigator.clipboard.writeText(exportText);
  alert(`Succes! ${selectedSceneIds.size} scènes inclusief analyse-instructies gekopieerd.`);
};

const exportToWord = (type: 'summary' | 'prose') => {
  if (selectedSceneIds.size === 0) {
    alert("Selecteer eerst de scènes die je wilt exporteren via de AI Selectie Modus.");
    return;
  }

  // Header van het document
  let content = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Export Codex</title></head>
    <body style="font-family: 'Times New Roman', serif;">
      <h1 style="text-align: center;">Codex Export: ${type === 'summary' ? 'Samenvattingen' : 'Integrale Proza'}</h1>
      <hr>
  `;

  // Loop door hoofdstukken en scènes
  chapters.forEach((chapter) => {
    const selectedInChapter = chapter.scenes.filter((s: any) => selectedSceneIds.has(s.id));
    
    if (selectedInChapter.length > 0) {
      content += `<h2 style="color: #444; margin-top: 30px;">Hoofdstuk ${chapter.ord}: ${chapter.title || 'Naamloos'}</h2>`;
      
      selectedInChapter.forEach((scene: any, index: number) => {
        content += `
          <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            <h3 style="font-size: 14pt;">Scène ${chapter.ord}.${index + 1}: ${scene.title}</h3>
            <p style="font-size: 10pt; color: #888;">POV: ${scene.pov || 'Onbekend'} | Setting: ${scene.setting || 'Onbekend'}</p>
            <div style="margin-top: 10px; line-height: 1.6;">
              ${type === 'summary' 
                ? `<p><i>${scene.summary || 'Geen samenvatting beschikbaar.'}</i></p>` 
                : scene.prose || '<i>(Nog geen proza geschreven voor deze scène)</i>'}
            </div>
          </div>
        `;
      });
    }
  });

  content += `</body></html>`;

  // Bestand downloaden
  const fileName = `Export_${type}_${new Date().toISOString().split('T')[0]}.doc`;
  const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
};

const toggleChapterSelection = (chapter: any) => {
  const sceneIdsInChapter = chapter.scenes.map((s: any) => s.id);
  const newSelection = new Set(selectedSceneIds);
  
  // Check of alle scenes van dit hoofdstuk al geselecteerd zijn
  const allSelected = sceneIdsInChapter.every((id: string) => selectedSceneIds.has(id));

  if (allSelected) {
    // Deselecteer alles van dit hoofdstuk
    sceneIdsInChapter.forEach((id: string) => newSelection.delete(id));
  } else {
    // Selecteer alles van dit hoofdstuk
    sceneIdsInChapter.forEach((id: string) => newSelection.add(id));
  }

  setSelectedSceneIds(newSelection);
};

return (
  <div className="flex h-screen bg-stone-100 font-sans text-stone-900 overflow-hidden">
    
    {/* 1. DE ZIJBALK (Deze staat goed) */}
    <aside className="w-20 bg-stone-900 flex flex-col items-center py-6 gap-8 border-r border-stone-800 h-screen flex-shrink-0">
<Link 
  href="/" 
  title="Terug naar Editor"
  onClick={(e) => {
    e.preventDefault(); // Voorkom de standaard Next.js navigatie
    window.location.href = "/"; // Forceer een volledige pagina-herlaad
  }}
>
  <div className="p-3 rounded-xl text-stone-500 hover:text-white hover:bg-stone-800 transition-all cursor-pointer">
    <Edit3 size={24} />
  </div>
</Link>
      <div className="flex flex-col gap-6">
        {/* Hier kunnen je andere knoppen later in */}
      </div>
    </aside>

    {/* 2. DE NIEUWE WRAPPER VOOR DE INHOUD */}
    <main className="flex-1 flex flex-col overflow-hidden p-10">
      
      {/* Header (Blijft bovenin staan) */}
<div className="flex justify-between items-center mb-10 border-b border-stone-200 pb-6 flex-shrink-0">
  {/* Linkerkant: Info */}
  <div>
    <h1 className="text-3xl font-serif font-bold text-stone-900">Architectuur</h1>
    <p className="text-stone-500 italic text-sm">Sleep scènes om te schuiven, of gebruik de AI Selectie voor advies.</p>
  </div>
  
  {/* Rechterkant: Beide functies naast elkaar */}
  <div className="flex gap-4 items-center">
    
    {/* GROEP 1: AI FUNCTIES */}
    <div className="flex gap-2 bg-stone-100 p-1.5 rounded-full border border-stone-200">
      <button 
        onClick={() => setIsSelectionMode(!isSelectionMode)}
        className={`px-4 py-1.5 rounded-full font-bold text-[11px] transition-all ${
          isSelectionMode 
            ? 'bg-orange-800 text-white shadow-inner' 
            : 'bg-white text-stone-600 hover:bg-stone-50'
        }`}
      >
        {isSelectionMode ? 'Selectie stoppen' : 'AI Selectie Modus'}
      </button>

{isSelectionMode && (
  <div className="flex gap-2 animate-in fade-in slide-in-from-right-4">
    {/* Bestaande AI Knop */}
    <button 
      onClick={copySelectedForAI}
      className="bg-stone-900 text-white px-4 py-1.5 rounded-full font-bold text-[11px] shadow-md hover:bg-black transition-all flex items-center gap-2"
    >
      <Share2 size={12} /> Voor Gemini
    </button>

    {/* NIEUW: Word Export Samenvatting */}
    <button 
      onClick={() => exportToWord('summary')}
      className="bg-white border border-stone-300 text-stone-700 px-4 py-1.5 rounded-full font-bold text-[11px] shadow-sm hover:bg-stone-50 transition-all flex items-center gap-2"
    >
      <Layout size={12} /> Word (Samenvatting)
    </button>

    {/* NIEUW: Word Export Proza */}
    <button 
      onClick={() => exportToWord('prose')}
      className="bg-white border border-stone-300 text-stone-700 px-4 py-1.5 rounded-full font-bold text-[11px] shadow-sm hover:bg-stone-50 transition-all flex items-center gap-2"
    >
      <Edit3 size={12} /> Word (Proza)
    </button>
  </div>
)}
    </div>

    {/* GROEP 2: OPSLAAN (Alleen bij wijziging) */}
    {isDirty && (
      <button 
        onClick={saveChanges}
        disabled={isSaving}
        className="flex items-center gap-2 bg-orange-800 text-white px-6 py-2.5 rounded-full font-bold shadow-lg hover:bg-orange-900 transition-all scale-105 text-xs"
      >
        <Save size={16} />
        {isSaving ? 'Bezig...' : 'Structuur Vastleggen'}
      </button>
    )}
  </div>
</div>

      {/* 3. HET SCROLLBARE BOARD (Vangnet + Hoofdstukken) */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-10 items-start">
        
        {/* De Hoofdstukken */}
{chapters.map((chapter, idx) => (
          <div 
            key={chapter.id} 
            // 1. De hoofddiv is niet meer draggable om scenes de ruimte te geven
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedChapter) {
                onChapterDrop(idx);
              } else if (draggedScene) {
                onDrop(chapter.id, chapter.scenes.length);
              }
            }}
            className={`w-80 flex-shrink-0 bg-stone-200/50 p-4 rounded-2xl border-2 transition-all duration-200 ${
              draggedChapter?.id === chapter.id 
                ? 'opacity-20 border-dashed border-orange-400 scale-95' 
                : 'border-stone-200'
            }`}
          >
            <div className="mb-4 px-2">
              <div className="flex items-center gap-2 mb-1">
                {/* 2. Alleen de badge is draggable: de 'Handgreep' */}
                <div 
                  draggable={!isSelectionMode}
                  onDragStart={(e) => {
                    e.stopPropagation(); // Voorkom dat scenes mee-draggen
                    onChapterDragStart(chapter);
                  }}
                  onClick={() => isSelectionMode && toggleChapterSelection(chapter)}
                  className={`flex items-center gap-2 px-2 py-0.5 rounded shadow-sm uppercase tracking-tighter transition-all cursor-grab active:cursor-grabbing ${
                    isSelectionMode 
                      ? 'hover:bg-orange-700 bg-orange-800' 
                      : 'bg-orange-800'
                  } text-white`}
                >
                  {/* Grip icoon voor visuele feedback */}
                  {!isSelectionMode && <GripVertical size={12} className="opacity-50" />}
                  
                  {isSelectionMode && (
                    <div className={`w-3 h-3 rounded-sm border border-white/40 flex items-center justify-center transition-colors ${
                      chapter.scenes.length > 0 && chapter.scenes.every((s: any) => selectedSceneIds.has(s.id)) 
                      ? 'bg-white' 
                      : 'bg-transparent'
                    }`}>
                      {chapter.scenes.length > 0 && chapter.scenes.every((s: any) => selectedSceneIds.has(s.id)) && (
                        <div className="w-1.5 h-1.5 bg-orange-800 rounded-full" />
                      )}
                    </div>
                  )}
                  <span className="text-[10px] font-black">
                    Hoofdstuk {chapter.ord}
                  </span>
                </div>
              </div>

              <h3 className="font-serif font-bold text-stone-800 text-lg leading-tight">
                {chapter.title || "Naamloos"}
              </h3>
            </div>

            {/* SCENES CONTAINER */}
            <div className="space-y-3 min-h-[100px] bg-stone-100/30 rounded-xl p-2">
              {chapter.scenes && chapter.scenes.length > 0 ? (
                chapter.scenes.map((scene: any, sIdx: number) => (
                  <div
                    key={scene.id}
                    draggable
                    onDragStart={() => handleDragStart(scene)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { 
                      e.stopPropagation(); 
                      onDrop(chapter.id, sIdx); 
                    }}
                    className={`p-4 rounded-xl border-2 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative ${getCardStyle(scene.status)}`}
                  >
                    {isSelectionMode && (
                      <div className="absolute top-3 left-3 z-20">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 cursor-pointer accent-orange-800 border-2 border-orange-800 rounded shadow-md"
                          checked={selectedSceneIds.has(scene.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newSelected = new Set(selectedSceneIds);
                            if (newSelected.has(scene.id)) newSelected.delete(scene.id);
                            else newSelected.add(scene.id);
setSelectedSceneIds(newSelected);
                          }}
                        />
                      </div>
                    )}
                    <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full shadow-sm ${getStatusColor(scene.status)}`} />
                    
                    <p className={`text-sm font-bold mb-1 pr-6 leading-tight ${isSelectionMode ? 'pl-7' : ''}`}>
                      {scene.title}
                    </p>

                    <details className="cursor-pointer mb-3 outline-none">
                      <summary className="list-none outline-none">
                        <p className="text-[10px] opacity-80 line-clamp-3 italic font-medium">
                          {scene.summary || "Geen samenvatting..."}
                        </p>
                        <span className="text-[9px] text-orange-800 font-bold">
                          [ Klik voor volledige tekst ]
                        </span>
                      </summary>
                      <div className="text-[10px] text-stone-700 leading-relaxed pt-2 mt-2 border-t border-orange-200/30">
                        <p className="italic">{scene.summary}</p>
                        <p className="text-[9px] text-stone-400 font-bold mt-2 uppercase tracking-tighter">
                          [ Klik hierboven om te sluiten ]
                        </p>
                      </div>
                    </details>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-black/5">
                      {scene.pov && <span className="text-[9px] font-bold bg-white/50 px-2 py-0.5 rounded">👤 {scene.pov}</span>}
                      {scene.setting && <span className="text-[9px] font-bold bg-white/50 px-2 py-0.5 rounded">📍 {scene.setting}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-[10px] text-stone-400 italic border-2 border-dashed border-stone-200 rounded-xl">
                  Sleep scènes hierheen
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  </div>
);
} // Deze sluit de export default function ArchitectuurPage