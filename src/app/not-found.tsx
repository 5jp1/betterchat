'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Blockblast from '@/components/blockblast';

export default function NotFound() {
  const [clickCount, setClickCount] = useState(0);
  const [showGame, setShowGame] = useState(false);

  const handleFirst4Click = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 3) {
      setShowGame(true);
    }
  };
  
  if (showGame) {
    return <Blockblast />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="flex items-center text-9xl font-bold text-primary">
        <span onClick={handleFirst4Click} className="cursor-pointer">4</span>
        <span>0</span>
        <span>4</span>
      </div>
      <h2 className="mt-4 text-2xl font-semibold">Page Not Found</h2>
      <p className="mt-2 text-muted-foreground">Sorry, the page you are looking for does not exist.</p>
      <Button asChild className="mt-6">
        <Link href="/">Go back to Home</Link>
      </Button>
    </div>
  );
}
