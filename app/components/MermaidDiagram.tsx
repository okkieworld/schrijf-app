'use client';
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

export default function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // We configureren mermaid om de breedte van de container te volgen
    mermaid.initialize({ 
      startOnLoad: true, 
      theme: 'neutral',
      securityLevel: 'loose',
      // Deze instelling helpt bij het schalen:
      flowchart: {
        useMaxWidth: false, // Dit zorgt dat hij niet geforceerd 'klein' blijft
        htmlLabels: true,
      }
    });
    
    if (ref.current) {
      ref.current.removeAttribute('data-processed');
      mermaid.contentLoaded();
    }
  }, [chart]);

  return (
    // We voegen 'w-full' en een flinke 'min-h' toe
    <div className="flex justify-center w-full overflow-x-auto overflow-y-hidden py-10">
      <div 
        key={chart} 
        ref={ref} 
        className="mermaid flex justify-center min-w-[800px] min-h-[500px]"
      >
        {chart}
      </div>
    </div>
  );
}