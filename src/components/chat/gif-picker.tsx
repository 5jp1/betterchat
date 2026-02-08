"use client";

import { useState, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

const GIPHY_API_KEY = 'EEFQQHIqBySSHhvmP4ugQO9Apf0jrllB';

interface GifPickerProps {
  onGifSelect: (url: string) => void;
  isLocked?: boolean;
}

export function GifPicker({ onGifSelect, isLocked }: GifPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGifs = useCallback(async (searchQuery: string) => {
    const endpoint = searchQuery 
      ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=24&rating=g`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;
      
    setLoading(true);
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      setGifs(data.data);
    } catch (error) {
      console.error('Error fetching GIFs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch trending GIFs when popover opens
    if (open && query === '' && gifs.length === 0) {
        fetchGifs('');
    }
  }, [open, query, gifs.length, fetchGifs]);

  useEffect(() => {
    const handler = setTimeout(() => {
        if (query) {
            fetchGifs(query);
        }
    }, 500); // Debounce for 500ms

    return () => {
      clearTimeout(handler);
    };
  }, [query, fetchGifs]);

  const handleSelect = (gifUrl: string) => {
    onGifSelect(gifUrl);
    setOpen(false);
  };
  
  const handleOpenChange = (isOpen: boolean) => {
      setOpen(isOpen);
      if(!isOpen) {
          setQuery('');
          setGifs([]);
      }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isLocked} className="group">
            <span className="font-bold text-muted-foreground group-hover:text-primary transition-colors">GIF</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Giphy</h4>
            <p className="text-sm text-muted-foreground">Search for a GIF.</p>
          </div>
          <Input
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ScrollArea className="h-64">
            {loading && <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
            <div className="grid grid-cols-3 gap-2 pr-4">
              {gifs.map((gif) => (
                <div key={gif.id} className="aspect-square relative group cursor-pointer" onClick={() => handleSelect(gif.images.original.url)}>
                    <img
                      src={gif.images.fixed_width.url}
                      alt={gif.title}
                      className="w-full h-full object-cover rounded"
                    />
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                        <span className="text-white text-xs text-center p-1">Send</span>
                    </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
