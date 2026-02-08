"use client";

import { useState, useEffect } from 'react';
import type { Message } from '@/lib/definitions';

export function useMessages(chatId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) {
        setMessages([]);
        return;
    };

    let isActive = true;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/messages?chatId=${chatId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        const data: Message[] = await response.json();
        if (isActive) {
          setMessages(data);
        }
      } catch (err) {
        if (isActive && err instanceof Error) {
          setError(err.message);
        }
      }
    };

    fetchMessages(); // Initial fetch

    const intervalId = setInterval(fetchMessages, 1000); // Poll every second

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [chatId]);

  return { messages, error };
}
