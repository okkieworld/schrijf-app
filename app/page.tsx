"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { debounce } from 'lodash';
import { Book, ChevronDown, Layout, Info, PenTool, Users, MapPin, Archive, Trash2 } from 'lucide-react';
import Link from 'next/link';

// test commit
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
  const [totalWords, setTotalWords] = useState(0);
  // Tabs & Codex State
  const [activeTab, setActiveTab] = useState("kaart"); // "kaart" of "wereld"
  const [codexData, setCodexData] = useState<any>({ characters: [], locations: [], items: [] });
  const [showLegend, setShowLegend] = useState(false);




// Zorg dat 'async' hier staat voor (project: any)
const selectProject = async (project: any) => {
  setSelectedProject(project);

  // 1. Haal de hoofdstukken op inclusief de proza
  const { data: chaptersData } = await supabase
    .from('chapters')
    .select(`
      *,
      scenes (
        prose
      )
    `)
    .eq('project_id', project.id)
    .order('ord');
  
  const fetchedChapters = chaptersData || [];
  setChapters(fetchedChapters);

  // 2. Bereken totaal
  let totaal = 0;
  fetchedChapters.forEach(ch => {
    ch.scenes?.forEach((s: any) => {
      if (s.prose) {
        totaal += s.prose.trim().split(/\s+/).filter(Boolean).length;
      }
    });
  });
  setTotalWords(totaal);

  // 3. Haal de Codex data op
  const { data: characters } = await supabase.from('characters').select('*').eq('project_id', project.id);
  const { data: locations } = await supabase.from('locations').select('*').eq('project_id', project.id);
  const { data: items } = await supabase.from('items').select('*').eq('project_id', project.id);
  
  setCodexData({
    characters: characters || [],
    locations: locations || [],
    items: items || []
  });
}; // Zorg dat dit afsluitende haakje goed staat

const toggleChapter = async (chapterId: string) => {
  // 1. Data ophalen als we die nog niet hebben
// We halen de data ALTIJD op (of we maken de check slimmer)
const { data, error } = await supabase
  .from('scenes')
  .select('*')
  .eq('chapter_id', chapterId)
  .order('order_index', { ascending: true }); // We gebruiken nu de juiste kolom

if (!error && data) {
  setScenes((prev: any) => ({ 
    ...prev, 
    [chapterId]: data 
  }));
}

  // 2. De visuele status toggelen (open/dicht)
  setExpandedChapters((prev) => 
    prev.includes(chapterId) 
      ? prev.filter(id => id !== chapterId) // Verwijder uit lijst = inklappen
      : [...prev, chapterId]               // Voeg toe aan lijst = uitklappen
  );
};

const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    setProjects(data || []);
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
  const prompt = `Je bent een redacteur die bestaand proza terugvertaalt naar een compacte scènekaart.
Geef de output uitsluitend als geldig JSON. Schrijf in het Nederlands.

INSTRUCTIE VOOR SETTING: 
Houd de 'setting' extreem kort en krachtig. 
Format: [Fysieke Locatie], [Tijdstip]. 
Voorbeelden: "Veldlab, middag", "Studeerkamer Hugo, nacht", "Opgraving Milos, ochtendschemer".

Gebruik exact dit schema:
{
  "pov": "Naam personage", 
  "setting": "Locatie, Tijdstip", 
  "purpose": "Doel van de scène", 
  "conflict": "Het obstakel", 
  "outcome": "Resultaat", 
  "setup": "Geplante aanwijzing", 
  "payoff": "Inlossing van eerdere aanwijzing", 
  "summary": "Beknopte samenvatting van max 4 regels"
}

Proza:
"""${prose}"""`;

  navigator.clipboard.writeText(prompt);
  alert("Prompt gekopieerd!");
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

const deleteScene = async (sceneId: string, chapterId: string) => {
  // Bevestiging vragen aan de gebruiker
  if (!confirm("Weet je zeker dat je deze scène wilt verwijderen?")) return;

  const { error } = await supabase
    .from('scenes')
    .delete()
    .eq('id', sceneId);

  if (!error) {
    // 1. Update de zijbalk state
    setScenes((prev: any) => ({
      ...prev,
      [chapterId]: prev[chapterId].filter((s: any) => s.id !== sceneId)
    }));

    // 2. Als de verwijderde scène geselecteerd was, deselecteer deze
    if (selectedScene?.id === sceneId) {
      setSelectedScene(null);
      setProse("");
    }
  } else {
    console.error("Fout bij verwijderen scène:", error.message);
    alert("Verwijderen mislukt.");
  }
};

  useEffect(() => { fetchProjects(); }, []);
const handleSceneChange = async (newScene: any) => {
  // 1. Sla de huidige tekst op (van de scene waar we NU nog zijn)
  if (selectedScene?.id) {
    await supabase
      .from('scenes')
      .update({ prose: prose })
      .eq('id', selectedScene.id);
  }

  // 2. Selecteer de nieuwe scene
  setSelectedScene(newScene);

  // 3. Haal de verse tekst op voor de nieuwe scene
  const { data } = await supabase
    .from('scenes')
    .select('prose')
    .eq('id', newScene.id)
    .single();

  if (data) {
    setProse(data.prose || "");
  } else {
    setProse(newScene.prose || "");
  }
};

const applyStyle = (type: 'gedachte' | 'brief' | 'whatsapp') => {
  // We zoeken nu specifiek naar jouw schrijfveld
  const textarea = document.getElementById('schrijfveld') as HTMLTextAreaElement;
  if (!textarea) return;

  textarea.focus();

  let textToInsert = "";
  let startOffset = 0; // Hoeveel tekens vanaf het begin van de invoeging
  let endOffset = 0;   // Hoeveel tekens vanaf het einde weg

  switch(type) {
    case 'gedachte':
      textToInsert = "*gedachte*";
      startOffset = 1; endOffset = 1; 
      break;
    case 'brief':
      textToInsert = ">>> brief <<<";
      startOffset = 4; endOffset = 4;
      break;
    case 'whatsapp':
      textToInsert = "> **Naam:** bericht";
      startOffset = 11; endOffset = 0;
      break;
  }

  // Voeg in op cursorpositie
  document.execCommand('insertText', false, textToInsert);

  // Selecteer automatisch het placeholder-woord
  const currentPos = textarea.selectionStart;
  textarea.setSelectionRange(
    currentPos - textToInsert.length + startOffset, 
    currentPos - endOffset
  );
};


const generateProsePrompt = () => {
  if (!selectedScene) {
    alert("Selecteer eerst een scène.");
    return;
  }

  // 1. Zoek de karakterschets van de POV in de Codex
  const povCharacter = codexData.characters.find(
    (c: any) => c.name === selectedScene.pov
  );
  
  // 2. Zoek de karakterschetsen van alle overige aanwezigen
  const involvedCharacters = codexData.characters.filter((c: any) => 
    selectedScene.involved_characters?.includes(c.name) && c.name !== selectedScene.pov
  );

  // 3. De prompt met jouw specifieke Nederlandse tekst en de data-koppeling
  const prompt = `
"Opdracht: Herschrijf de volgende scène in een strakke, moderne thriller-stijl à la Dan Brown. Gebruik hiervoor de volgende strikte richtlijnen:

Geen Personificatie: Levenloze objecten mogen geen menselijke eigenschappen hebben. Ze 'ademen', 'fluisteren' of 'wachten' niet.

Focus op Materie & POV-Filter: Beschrijf objecten op basis van hun fysieke eigenschappen (textuur, temperatuur, staat). De selectie van details komt voort uit de expertise van het POV-personage (Damiano ziet lichaam/actie; Hugo ziet systemen/logica).

Karakter-gedreven Dialoog: Dialogen weerspiegelen de Codex. Laat de intellectuele of instinctieve aard van het personage horen in hun woordkeuze.

Thriller-tempo boven Jargon: Vermijd te wetenschappelijke of abstracte termen (zoals 'transactioneel', 'extraheren', 'fysiologisch'). Gebruik actieve taal die de urgentie en de inzet van het moment beschrijft.

Expert-perspectief: Schrijf vanuit de blik van een nuchtere expert die naar feiten zoekt, maar behoud de spanning van een achtervolging of onderzoek.

Blacklist (verboden woorden): ademen, fluisteren, aura, essence, mysterieus, voorbestemd, ziel, trillen.
RELEVANTE FEITEN UIT DE CODEX:
- POV PERSONAGE: ${selectedScene.pov || "Onbekend"}
  ${povCharacter ? `FYSIEKE SCHETS: ${povCharacter.description}` : "Geen schets beschikbaar."}

- OVERIGE AANWEZIGEN: 
${involvedCharacters.length > 0 
  ? involvedCharacters.map((c: any) => `  * ${c.name}: ${c.description}`).join('\n')
  : "Geen andere personages aanwezig."}

- LOCATIE: ${selectedScene.setting || "Niet gespecificeerd"}

Hieronder volgt de scène:
"""${prose}"""
`;

  navigator.clipboard.writeText(prompt);
  alert("Schrijf-prompt inclusief karakterschetsen gekopieerd!");
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
onClick={() => handleSceneChange(s)}
  className={`flex-1 text-left p-1 text-xs rounded truncate flex items-center gap-2 ${
    selectedScene?.id === s.id ? "font-bold text-orange-900" : "text-stone-500"
  }`}
>
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
{/* Compacte Woordenteller onderaan de zijbalk */}
<div className="mt-auto py-3 px-6 border-t border-stone-200 bg-stone-50">
  <div className="flex justify-between items-center">
    <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
      Totaal
    </span>
    <span className="text-sm font-serif font-bold text-stone-700">
      {totalWords.toLocaleString()} <span className="text-[10px] font-sans font-normal text-stone-400">wrd</span>
    </span>
  </div>
</div>

  {/* Footer Beheer Link */}
 {/* Gecombineerde Footer Navigatie */}
<div className="mt-auto border-t border-stone-300 bg-stone-200/50 p-2 space-y-1">
  <Link
    href="/architectuur"
    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-300 hover:text-orange-900 transition-all"
  >
    <Layout size={14} />
    <span>Architectuur</span>
  </Link>

  <Link
    href="/beheer"
    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-300 hover:text-orange-900 transition-all"
  >
    <Layout size={14} />
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
                {/* HEADER MET DELETE KNOP */}
                <div className="flex items-center justify-between border-b pb-2 mb-4">
                  <div className="flex items-center gap-2 text-stone-400 uppercase text-[10px] font-bold tracking-widest">
                    <Info size={14} /> 
                    Scène-Analyse
                  </div>
                  <button 
                    onClick={() => deleteScene(selectedScene.id, selectedScene.chapter_id)}
                    className="text-stone-300 hover:text-red-500 transition-colors p-1"
                    title="Verwijder scène"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* STATUS SELECTIE */}
                <section className="group border-b border-stone-100 pb-4">
                  <div className="flex items-center gap-2 mt-2">
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Status:</label>
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
                      <div className={`w-2 h-2 rounded-full shadow-sm ${getStatusColor(selectedScene?.status || "Idee")}`} />
                    </div>
                  </div>
                </section>

<div className="space-y-4">
  {/* POV */}
  <section className="group">
{/* POV SECTIE */}
<section className="group">
  <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">POV</label>
  <select 
    className="w-full text-sm p-1 bg-white border border-stone-200 rounded outline-none mt-1"
    value={selectedScene.pov || ""}
    onChange={(e) => updateSceneField(selectedScene.id, 'pov', e.target.value)}
  >
    <option value="">— Selecteer POV —</option>
    {codexData.characters.map((char: any) => (
      <option key={char.id} value={char.name}>{char.name}</option>
    ))}
  </select>
</section>

{/* BETROKKEN KARAKTERS (Nieuw) */}
<section className="group mt-4">
  <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-2">Aanwezige Karakters</label>
  <div className="flex flex-wrap gap-2">
    {codexData.characters.map((char: any) => {
      // We checken of de naam in de 'involved' array van de scene staat
      const isInvolved = selectedScene.involved_characters?.includes(char.name);
      
      return (
        <button
          key={char.id}
          onClick={() => {
            const currentList = selectedScene.involved_characters || [];
            const newList = isInvolved 
              ? currentList.filter((n: string) => n !== char.name)
              : [...currentList, char.name];
            updateSceneField(selectedScene.id, 'involved_characters', newList);
          }}
          className={`px-2 py-1 rounded-full text-[10px] border transition-all ${
            isInvolved 
              ? "bg-orange-100 border-orange-300 text-orange-900 font-bold" 
              : "bg-stone-100 border-stone-200 text-stone-400 opacity-60 hover:opacity-100"
          }`}
        >
          {char.name}
        </button>
      );
    })}
  </div>
</section>
    {editingId === `edit-pov` ? (
      <input autoFocus className="w-full text-sm p-1 bg-white border border-orange-300 rounded outline-none" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} onBlur={() => updateSceneField(selectedScene.id, 'pov', tempTitle)} onKeyDown={(e) => e.key === 'Enter' && updateSceneField(selectedScene.id, 'pov', tempTitle)} />
    ) : (
      <p className="text-sm text-stone-700 mt-0.5">{selectedScene.pov || "—"}</p>
    )}
  </section>

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

                <div className="space-y-4">
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
                      <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Uitkomst</label>
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

<div className="space-y-4">
  {/* SETUP */}
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

  {/* PAYOFF */}
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
</div>

                  {/* SAMENVATTING */}
                  <section className="group bg-orange-50/40 p-3 rounded border border-orange-100/50 shadow-sm">
                    <label className="text-[10px] uppercase font-bold text-orange-800/50 tracking-wider block">Samenvatting</label>
                    <p className="text-xs text-stone-600 mt-1 italic leading-relaxed">{selectedScene.summary || "Geen samenvatting."}</p>
                  </section>

                  {/* AI TOOLS */}
                  <div className="pt-4 border-t border-stone-200 space-y-2">
                    <button onClick={copyAiPrompt} className="w-full py-2 bg-stone-800 text-white text-[10px] uppercase font-bold tracking-widest rounded hover:bg-black">
                      Copy AI Prompt
                    </button>
                    <textarea 
                      placeholder="Plak JSON hier..."
                      className="w-full h-20 text-[10px] p-2 bg-white border border-stone-200 rounded font-mono outline-none shadow-inner"
                      value={importText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setImportText(val);
                        if (val.trim().endsWith('}')) handleJsonImport(val);
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <section>
                  <h3 className="text-[10px] font-bold uppercase text-stone-400 mb-3 border-b pb-1">Locaties</h3>
                  {codexData.locations.map((loc: any) => (
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
  <div className="max-w-prose mx-auto mb-4 flex items-center justify-between border-b border-stone-200 pb-2">
    <div className="flex gap-4 items-center text-[10px] uppercase tracking-widest text-stone-400 font-bold">
      {/* Bestaande stijlknoppen */}
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyStyle('gedachte')} className="hover:text-orange-900 transition-colors">
        Gedachte (*)
      </button>
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyStyle('brief')} className="hover:text-orange-900 transition-colors">
        Brief ({" >>> "})
      </button>
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyStyle('whatsapp')} className="hover:text-orange-900 transition-colors">
        WhatsApp ({" > "})
      </button>

      {/* DE NIEUWE AI PROMPT KNOP - Visueel onderscheiden door kleur en een lijntje */}
      <div className="h-4 w-px bg-stone-200 mx-1" /> {/* Divider */}
      <button 
        type="button"
        onClick={generateProsePrompt} 
        className="flex items-center gap-1.5 text-orange-700 hover:text-orange-900 transition-all bg-orange-50 px-2 py-1 rounded-md"
      >
        <PenTool size={12} />
        AI Schrijf-Prompt
      </button>
    </div>
    
    <button 
      onClick={() => setShowLegend(!showLegend)}
      className="text-stone-400 hover:text-stone-600 flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest"
    >
      <Info size={12} /> Schrijfstijl-gids
    </button>
  </div>

  {/* De rest van je code (Legenda & Textarea) blijft hetzelfde */}
  {showLegend && (
    <div className="max-w-prose mx-auto mb-6 p-4 bg-stone-100 border border-stone-200 rounded-lg text-xs text-stone-600 shadow-inner animate-in fade-in slide-in-from-top-2">
      <h4 className="font-bold uppercase mb-2 text-stone-800">Mijn Schrijfstijl-gids</h4>
      <ul className="grid grid-cols-2 gap-2">
        <li><span className="font-mono text-orange-700">*Gedachte*</span> → Cursief</li>
        <li><span className="font-mono text-orange-700">Enter</span> → Nieuwe alinea (inspring)</li>
        <li><span className="font-mono text-orange-700">{" >>> Brief <<< "}</span> → Citaatblok</li>
        <li><span className="font-mono text-orange-700">2x Enter</span> → Scène-overgang</li>
        <li><span className="font-mono text-orange-700">{" > **Naam:** tekst "}</span> → WhatsApp</li>
        <li><span className="font-mono text-orange-700">**Nadruk**</span> → Vetgedrukt</li>
      </ul>
    </div>
  )}


<textarea 
  id="schrijfveld"
  className="w-full h-full border-none focus:ring-0 text-xl leading-relaxed font-serif text-stone-800 resize-none max-w-prose mx-auto block [text-indent:1.2em] [&:first-line]:indent-0 placeholder:indent-0"
  value={prose}
  onChange={(e) => {
    const val = e.target.value;
    setProse(val);
    if (selectedScene?.id) {
      // Dit zorgt ervoor dat je tekst direct wordt opgeslagen in de database
      saveProse(selectedScene.id, val);
    }
  }}
  onKeyDown={(e) => {
    // Sneltoetsen voor styling
    if (e.ctrlKey && e.key === 'i') { 
      e.preventDefault(); 
      applyStyle('gedachte'); 
    }
    if (e.ctrlKey && e.key === 'q') {
      e.preventDefault();
      applyStyle('brief');
    }
  }}
  placeholder="Begin met schrijven..."
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