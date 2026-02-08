"use client";

import React, { useRef, useState } from 'react';
import { sendMessage } from '@/lib/actions';
import { useAuth } from '@/components/auth-provider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Paperclip, Mic, Send, StopCircle, Lock } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Room } from '@/lib/definitions';
import { GifPicker } from './gif-picker';

interface MessageInputProps {
  chatId: string;
  room?: Room;
}

export function MessageInput({ chatId, room }: MessageInputProps) {
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const params = useParams();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const channelName = params.id as string;
  const isLocked = room?.isLocked && user?.role !== 'admin';


  const handleFormSubmit = async (formData: FormData) => {
    if (!user || isLocked) return;

    const content = formData.get('content') as string;
    const file = formData.get('attachment') as File;

    if (!content && (!file || file.size === 0)) {
      return; // Don't send empty messages
    }
    
    formData.append('userId', user.id);
    formData.append('chatId', chatId);

    formRef.current?.reset();

    try {
        await sendMessage(formData);
    } catch(e) {
        const error = e instanceof Error ? e.message : 'Could not send message';
        toast({
            variant: 'destructive',
            title: 'Error sending message',
            description: error
        });
    }
  };

  const handleGifSend = async (gifUrl: string) => {
    if (!user || isLocked) return;

    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('chatId', chatId);
    formData.append('gifUrl', gifUrl);

    try {
        await sendMessage(formData);
    } catch(e) {
        const error = e instanceof Error ? e.message : 'Could not send message';
        toast({
            variant: 'destructive',
            title: 'Error sending message',
            description: error
        });
    }
  }

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && formRef.current) {
          const formData = new FormData();
          formData.append('attachment', file);
          handleFormSubmit(formData);
      }
  }

  const handleMicClick = async () => {
    if (isRecording) {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
                
                const formData = new FormData();
                formData.append('attachment', audioFile);
                handleFormSubmit(formData);
                
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Failed to start recording", err);
            toast({
                variant: 'destructive',
                title: 'Recording Error',
                description: 'Could not access microphone. Please check permissions.',
            });
        }
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 bg-secondary/50 border-t border-border">
       {isLocked && (
        <div className="text-center text-sm text-muted-foreground mb-2">
          <Lock className="inline-block h-4 w-4 mr-1" />
          This channel is locked. Only admins can send messages.
        </div>
      )}
      <form
        ref={formRef}
        action={handleFormSubmit}
        className="flex items-center space-x-2 rounded-lg bg-background p-1 glow-on-focus"
      >
        <input type="file" name="attachment" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,audio/*,video/*" />
        <Button variant="ghost" size="icon" type="button" onClick={handleAttachmentClick} disabled={isLocked}>
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Input
          name="content"
          placeholder={isRecording ? "Recording... Click mic to stop." : isLocked ? "Channel is locked" :`Message #${channelName}`}
          autoComplete="off"
          disabled={isRecording || isLocked}
          className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <GifPicker onGifSelect={handleGifSend} isLocked={isLocked} />
        <Button variant="ghost" size="icon" type="button" onClick={handleMicClick} disabled={isLocked}>
            {isRecording ? <StopCircle className="h-5 w-5 text-red-500 animate-pulse" /> : <Mic className="h-5 w-5 text-muted-foreground" />}
        </Button>
        <Button variant="ghost" size="icon" type="submit" disabled={isLocked}>
          <Send className="h-5 w-5 text-primary" />
        </Button>
      </form>
    </div>
  );
}
