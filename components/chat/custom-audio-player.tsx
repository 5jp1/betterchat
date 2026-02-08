"use client";

import { Play, Pause } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface CustomAudioPlayerProps {
  src: string;
}

export function CustomAudioPlayer({ src }: CustomAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const handlePlayPause = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) {
        return "0:00";
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const setAudioData = () => {
        if(isFinite(audio.duration)) {
            setDuration(audio.duration);
        }
        setCurrentTime(audio.currentTime);
      }

      const setAudioTime = () => setCurrentTime(audio.currentTime);

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      audio.addEventListener('loadedmetadata', setAudioData);
      audio.addEventListener('timeupdate', setAudioTime);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handlePause);

      return () => {
        audio.removeEventListener('loadedmetadata', setAudioData);
        audio.removeEventListener('timeupdate', setAudioTime);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handlePause);
      };
    }
  }, []);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressContainer = e.currentTarget;
    const rect = progressContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = x / width;
    const newTime = duration * percentage;
    
    if (audioRef.current && isFinite(newTime)) {
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    }
  };

  const progressPercentage = duration > 0 && isFinite(duration) ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mt-2 flex items-center gap-2 w-full max-w-xs p-2 rounded-lg bg-secondary">
      <audio ref={audioRef} src={src} preload="metadata" />
      <Button variant="ghost" size="icon" onClick={handlePlayPause} className="h-8 w-8 flex-shrink-0">
        {isPlaying ? <Pause className="h-5 w-5 text-primary" /> : <Play className="h-5 w-5 text-primary" />}
      </Button>
      <div className="flex-grow flex items-center gap-2">
        <div className="w-12 text-xs text-muted-foreground">{formatTime(currentTime)}</div>
        <div className="w-full cursor-pointer py-2 group" onClick={handleProgressClick}>
          <Progress value={progressPercentage} className="h-1.5 group-hover:h-2 transition-all" />
        </div>
        <div className="w-12 text-xs text-muted-foreground text-right">{formatTime(duration)}</div>
      </div>
    </div>
  );
}
