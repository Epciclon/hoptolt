'use client';

import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { Button } from './Button';
import { Dialog } from './Dialog';

interface TutorialButtonProps {
  videoUrl: string;
}

export function TutorialButton({ videoUrl }: Readonly<TutorialButtonProps>) {
  const [open, setOpen] = useState(false);

  const getEmbedUrl = (url: string) => {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('youtube.com/watch')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      videoId = urlParams.get('v') || '';
    }
    
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    return url; // Fallback por si acaso envían el embed directo
  };

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <>
      <Button 
        variant="outline" 
        className="text-main border-strong hover:bg-theme-hover"
        icon={<PlayCircle size={16} />} 
        onClick={() => setOpen(true)}
      >
        Ver Tutorial
      </Button>
      
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tutorial del Módulo"
        size="3xl"
      >
        <div className="relative w-full overflow-hidden pt-[56.25%] rounded-lg bg-black">
          {open && (
            <iframe
              className="absolute top-0 left-0 w-full h-full border-0"
              src={embedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Tutorial"
            />
          )}
        </div>
      </Dialog>
    </>
  );
}
