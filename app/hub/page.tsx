"use client";

import React, { useState, useEffect } from 'react';
import { Book, Plus, Feather, ArrowRight, Clock, Loader2, Menu, X } from 'lucide-react';
// We gebruiken tijdelijk geen Image van 'next/image' om Next.js-optimalisatieproblemen uit te sluiten
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function StelrHub() {
  const router = useRouter();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastSession, setLastSession] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    synopsis: '',
    writing_style: 'Standaard'
  });

  useEffect(() => {
    fetchHubData();
  }, []);

  async function fetchHubData() {
    try {
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;

      const { data: projectData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projError) throw projError;
      setProjects(projectData || []);

      const { data: profileData, error: profError } = await supabase
        .from('profiles')
        .select('last_active_project_id, last_active_scene_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profError) throw profError;

      if (profileData && profileData.last_active_project_id && profileData.last_active_scene_id) {
        const { data: sceneData } = await supabase
          .from('scenes')
          .select(`
            title, 
            chapters (
              project_id, 
              projects (title)
            )
          `)
          .eq('id', profileData.last_active_scene_id)
          .maybeSingle();

        if (sceneData) {
          setLastSession({
            projectId: profileData.last_active_project_id,
            sceneId: profileData.last_active_scene_id,
            projectTitle: sceneData.chapters?.projects?.title || 'Onbekend project',
            sceneTitle: sceneData.title || 'Onbekende scène'
          });
        }
      }
    } catch (error: any) {
      console.error('Fout bij het laden van de STELR Hub:', error?.message || error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const { data, error } = await supabase
        .from('projects')
        .insert([
          { 
            title: formData.title, 
            synopsis: formData.synopsis,
            writing_style: formData.writing_style,
            user_id: user.id 
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      setProjects([data, ...projects]);
      setFormData({ title: '', synopsis: '', writing_style: 'Standaard' });
      setIsCreating(false);
      
      router.push(`/?project=${data.id}`);
    } catch (error: any) {
      alert('Fout bij aanmaken manuscript: ' + (error?.message || error));
    }
  }

  if (loading) {
    return (
      <div className="h-screen bg-[#F7F9FA] flex flex-col items-center justify-center font-sans">
        <Loader2 className="text-[#3D5A6C] animate-spin mb-4" size={32} />
        <div className="text-[#3D5A6C] font-['Montserrat'] text-xs font-semibold tracking-widest uppercase">STELR WORDT GELADEN...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FA] text-[#2B3A42] font-sans antialiased">
      
      {/* RESPONSIVE HEADER */}
{/* RESPONSIVE HEADER (LOGO ALTIJD PERFECT IN HET MIDDEN) */}
      <header className="relative w-full max-w-7xl mx-auto px-6 pt-6 md:pt-10 flex items-center justify-between border-b border-gray-200/60 pb-6 mb-12 min-h-[80px]">
        
        {/* Linkerkant leeg houden (of hier later iets plaatsen, bijv. een terug-knop) */}
        <div className="flex-1"></div>

        {/* LOGO SECTIE (Zweeft absoluut in het exacte midden van de header) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="pointer-events-auto">
            <img 
              src="/images/StelrLogo.png" 
              alt="STELR Logo"
              className="h-16 md:h-24 w-auto object-contain block" // h-16 op mobiel, h-20 op grotere schermen
              style={{ minWidth: '140px' }}
              onError={(e) => {
                console.error("Afbeelding kon niet geladen worden vanaf /images/StelrLogo.png");
              }}
            />
          </div>
        </div>

        {/* HAMBURGER MENU BUTTON (Rechtsboven, flex-1 zorgt dat hij netjes rechts uitlijnt) */}
        <div className="flex-1 flex justify-end relative z-20">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-[#3D5A6C] hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Dropdown menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-[4px] shadow-lg py-2 z-50 animate-fadeIn">
              <div className="px-4 py-2 text-xs font-['Montserrat'] font-semibold uppercase text-gray-400 border-b border-gray-100">Menu</div>
              <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-[#2B3A42] transition-colors">Profiel</button>
              <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-[#2B3A42] transition-colors">Instellingen</button>
              <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 transition-colors border-t border-gray-100">Uitloggen</button>
            </div>
          )}
        </div>
      </header>

      {/* HOOFD-FUNCTIONALITEIT COMPONENTEN */}
      <main className="max-w-5xl mx-auto px-6 pb-12">
        
        {/* RECENTE SESSIE (SCHRIJF VERDER BANNER) */}
        {lastSession && !isCreating && (
          <div className="bg-white border border-gray-200 border-l-4 border-l-[#9FA084] p-6 rounded-[4px] shadow-sm mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start space-x-4">
              <Clock className="text-[#3D5A6C] shrink-0 mt-0.5" size={20} />
              <div>
                <h2 className="text-[11px] font-['Montserrat'] tracking-wider font-semibold uppercase text-[#3D5A6C] mb-1">Waar je gebleven bent</h2>
                <p className="text-sm text-[#2B3A42]">
                  Je werkte laatst aan <strong className="font-semibold">"{lastSession.sceneTitle}"</strong> in <em className="italic text-gray-500">{lastSession.projectTitle}</em>.
                </p>
              </div>
            </div>
            <button 
              onClick={() => router.push(`/?project=${lastSession.projectId}&scene=${lastSession.sceneId}`)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-[#3D5A6C] text-white font-['Montserrat'] text-xs font-semibold uppercase tracking-wider rounded-[4px] hover:bg-[#3D5A6C]/90 transition-colors whitespace-nowrap self-start sm:self-center shadow-sm"
            >
              <span>Hervatten</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* SECTIE HEADER */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-lg font-['Montserrat'] tracking-wider font-semibold uppercase text-[#3D5A6C]">Mijn Manuscripten</h1>
          {!isCreating && (
            <button 
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-[#3D5A6C] text-white font-['Montserrat'] text-xs font-semibold uppercase tracking-wider rounded-[4px] hover:bg-[#3D5A6C]/90 transition-colors shadow-sm"
            >
              <Plus size={14} />
              <span>Nieuw Manuscript</span>
            </button>
          )}
        </div>

        {/* NIEUW MANUSCRIPT FORMULIER */}
        {isCreating ? (
          <div className="bg-white p-8 rounded-[4px] border border-gray-200 shadow-sm max-w-2xl animate-fadeIn">
            <h2 className="text-sm font-['Montserrat'] tracking-wider font-semibold uppercase text-[#3D5A6C] mb-6 pb-2 border-b border-gray-100">
              Nieuw Verhaal Starten
            </h2>
            
            <form onSubmit={handleCreateProject} className="space-y-5">
              <div>
                <label className="block text-[11px] font-['Montserrat'] font-semibold uppercase text-gray-400 mb-1.5">Titel van het Boek *</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  placeholder="Bijv. De Laatste Veer, Schaduw over Rotterdam..."
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full text-sm border border-gray-200 rounded-[4px] p-2.5 focus:outline-none focus:border-[#3D5A6C] focus:ring-1 focus:ring-[#3D5A6C] transition-all bg-[#F7F9FA]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-['Montserrat'] font-semibold uppercase text-gray-400 mb-1.5">Synopsis / Korte Samenvatting</label>
                <textarea 
                  rows={4}
                  placeholder="Waar gaat je verhaal in grote lijnen over? (Dit kun je later altijd aanpassen)"
                  value={formData.synopsis}
                  onChange={(e) => setFormData({...formData, synopsis: e.target.value})}
                  className="w-full text-sm border border-gray-200 rounded-[4px] p-2.5 focus:outline-none focus:border-[#3D5A6C] focus:ring-1 focus:ring-[#3D5A6C] transition-all bg-[#F7F9FA] resize-none h-28"
                />
              </div>

              <div>
                <label className="block text-[11px] font-['Montserrat'] font-semibold uppercase text-gray-400 mb-1.5">Schrijfstijl (Preset)</label>
                <select 
                  value={formData.writing_style}
                  onChange={(e) => setFormData({...formData, writing_style: e.target.value})}
                  className="text-sm border border-gray-200 rounded-[4px] p-2.5 focus:outline-none focus:border-[#3D5A6C] bg-[#F7F9FA]"
                >
                  <option value="Standaard">Standaard / Neutraal</option>
                  <option value="Rauw & Filmisch">Rauw & Filmisch</option>
                  <option value="Poëtisch">Poëtisch & Beschrijvend</option>
                  <option value="Snel & Dialogen">Snelle Actie & Veel Dialogen</option>
                </select>
              </div>

              <div className="flex space-x-3 justify-end pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)} 
                  className="px-4 py-2 text-xs font-['Montserrat'] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Annuleren
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-[#9FA084] text-white font-['Montserrat'] text-xs font-semibold uppercase tracking-wider rounded-[4px] hover:bg-[#9FA084]/90 transition-colors shadow-sm"
                >
                  Manuscript Aanmaken
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* MANUSCRIPTEN OVERZICHT GRID */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div 
                key={project.id}
                onClick={() => router.push(`/?project=${project.id}`)}
                className="bg-white p-6 rounded-[4px] border border-gray-200/80 shadow-sm hover:border-[#9FA084] hover:shadow-md cursor-pointer transition-all flex flex-col justify-between h-52 group relative overflow-hidden"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <Book className="text-[#3D5A6C] group-hover:text-[#9FA084] transition-colors" size={24} />
                    <span className="text-[9px] font-['Montserrat'] font-semibold uppercase bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                      {project.writing_style || 'Standaard'}
                    </span>
                  </div>
                  <h2 className="font-['Montserrat'] font-semibold text-sm text-[#2B3A42] line-clamp-2 uppercase tracking-wide group-hover:text-[#3D5A6C] transition-colors">
                    {project.title}
                  </h2>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-3 font-sans leading-relaxed">
                    {project.synopsis || 'Geen synopsis ingevoerd. Klik om te beginnen met structureren.'}
                  </p>
                </div>
                
                <div className="text-[10px] text-gray-400 font-sans border-t border-gray-100 pt-3 mt-4 flex justify-between items-center">
                  <span>Aangemaakt: {new Date(project.created_at).toLocaleDateString('nl-NL')}</span>
                  <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#9FA084]" />
                </div>
              </div>
            ))}

            {/* LEGE STAAT */}
            {projects.length === 0 && (
              <div className="col-span-full bg-white p-16 text-center border border-gray-200 rounded-[4px] shadow-sm">
                <Feather className="text-gray-300 mx-auto mb-4" size={40} />
                <p className="text-gray-400 text-sm mb-4 font-sans">Je hebt momenteel nog geen actieve manuscripten klaarstaan.</p>
                <button 
                  onClick={() => setIsCreating(true)} 
                  className="px-5 py-2.5 bg-[#3D5A6C] text-white font-['Montserrat'] text-xs font-semibold uppercase tracking-wider rounded-[4px] shadow-sm"
                >
                  Start je eerste boek
                </button>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}