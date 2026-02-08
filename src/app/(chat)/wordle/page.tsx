"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCw } from 'lucide-react';
import { isWordValid } from '@/lib/actions';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const Keyboard = ({ onKeyClick, letterStatuses, disabled }: { onKeyClick: (key: string) => void, letterStatuses: Record<string, string>, disabled: boolean }) => {
    const keys = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace']
    ];

    return (
        <div className="space-y-1">
            {keys.map((row, i) => (
                <div key={i} className="flex justify-center gap-1">
                    {row.map(key => {
                        const status = letterStatuses[key.toLowerCase()];
                        const keyClass = cn(
                            "h-12 flex-1 rounded-md font-bold uppercase flex items-center justify-center text-sm",
                            status === 'correct' ? 'bg-green-600 text-white' :
                            status === 'present' ? 'bg-yellow-500 text-white' :
                            status === 'absent' ? 'bg-zinc-700 text-white' : 'bg-zinc-500 text-white hover:bg-zinc-600',
                            key.length > 1 && 'px-2 text-xs'
                        );
                        return <button key={key} onClick={() => onKeyClick(key)} className={keyClass} disabled={disabled}>{key}</button>;
                    })}
                </div>
            ))}
        </div>
    );
};

const Grid = ({ guesses, currentGuess }: { guesses: {letter: string, status: string}[][], currentGuess: string }) => {
    const rows = Array.from({ length: MAX_GUESSES });
    
    return (
         <div className="grid grid-rows-6 gap-1.5 w-full max-w-sm mx-auto">
            {rows.map((_, rowIndex) => {
                const guess = guesses[rowIndex];
                const isCurrentRow = rowIndex === guesses.length;

                return (
                    <div key={rowIndex} className="grid grid-cols-5 gap-1.5">
                        {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => {
                            const letter = isCurrentRow ? currentGuess[colIndex] : guess?.[colIndex]?.letter;
                            const status = guess?.[colIndex]?.status;
                            const cellClass = cn(
                                "flex h-16 w-16 items-center justify-center rounded-md border-2 text-3xl font-bold uppercase",
                                "border-zinc-700",
                                letter && "border-zinc-500",
                                status === 'correct' && 'bg-green-600 border-green-600 text-white',
                                status === 'present' && 'bg-yellow-500 border-yellow-500 text-white',
                                status === 'absent' && 'bg-zinc-700 border-zinc-700 text-white',
                            );

                            return (
                                <div key={colIndex} className={cellClass}>
                                    {letter}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};


export default function WordlePage() {
    const [word, setWord] = useState('');
    const [guesses, setGuesses] = useState<{letter: string, status: string}[][]>([]);
    const [currentGuess, setCurrentGuess] = useState('');
    const [gameStatus, setGameStatus] = useState('PLAYING'); // PLAYING, WON, LOST
    const [letterStatuses, setLetterStatuses] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);
    const { toast } = useToast();

    const fetchWord = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/wordle-word', { cache: 'no-store' });
            if (!response.ok) throw new Error("Network response was not ok");
            const text = await response.text();
            const fetchedWord = text.trim().toUpperCase();
            if (fetchedWord.length !== 5 || !/^[A-Z]+$/.test(fetchedWord)) {
                throw new Error("Invalid word fetched");
            }
            setWord(fetchedWord);
        } catch (e) {
            console.error("Wordle fetch error:", e);
            toast({ variant: 'destructive', title: 'Error fetching word', description: "Could not fetch the word of the day. Using a fallback." });
            setWord("REACT");
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        fetchWord();
    }, [fetchWord]);

    const resetGame = useCallback(() => {
        setGuesses([]);
        setCurrentGuess('');
        setGameStatus('PLAYING');
        setLetterStatuses({});
        fetchWord();
    }, [fetchWord]);

    const processGuess = useCallback((guess: string) => {
        if (!word) return;

        const solutionFreq: { [key: string]: number } = {};
        for (const letter of word) {
            solutionFreq[letter] = (solutionFreq[letter] || 0) + 1;
        }

        const guessResult = Array.from({ length: WORD_LENGTH }, (_, i) => ({
            letter: guess[i],
            status: 'absent'
        }));

        // First pass for 'correct' (green)
        guessResult.forEach((item, index) => {
            if (word[index] === item.letter) {
                item.status = 'correct';
                solutionFreq[item.letter]--;
            }
        });

        // Second pass for 'present' (yellow)
        guessResult.forEach((item, index) => {
            if (item.status === 'correct') return;

            if (word.includes(item.letter) && solutionFreq[item.letter] > 0) {
                item.status = 'present';
                solutionFreq[item.letter]--;
            }
        });

        setGuesses(prev => [...prev, guessResult]);

        // Update keyboard statuses
        const newLetterStatuses = { ...letterStatuses };
        guessResult.forEach(({ letter, status }) => {
            const l = letter.toLowerCase();
            const currentStatus = newLetterStatuses[l];
            if (status === 'correct') {
                 newLetterStatuses[l] = 'correct';
            } else if (status === 'present' && currentStatus !== 'correct') {
                 newLetterStatuses[l] = 'present';
            } else if (!currentStatus) {
                 newLetterStatuses[l] = 'absent';
            }
        });
        setLetterStatuses(newLetterStatuses);

        if (guess === word) {
            setGameStatus('WON');
            setTimeout(() => toast({ title: "You won!", description: "Congratulations!" }), 500);
        } else if (guesses.length + 1 === MAX_GUESSES) {
            setGameStatus('LOST');
            setTimeout(() => toast({ variant: 'destructive', title: "You lost!", description: `The word was ${word}` }), 500);
        }
    }, [word, guesses.length, letterStatuses, toast]);


    const handleKey = useCallback(async (key: string) => {
        if (gameStatus !== 'PLAYING' || isVerifying) return;

        if (key === 'Enter') {
            if (currentGuess.length === WORD_LENGTH) {
                setIsVerifying(true);
                const isValid = await isWordValid(currentGuess);
                if (!isValid) {
                    toast({
                        variant: 'destructive',
                        title: 'Invalid Word',
                        description: `"${currentGuess}" is not a valid word.`,
                    });
                    setIsVerifying(false);
                    return;
                }
                processGuess(currentGuess);
                setCurrentGuess('');
                setIsVerifying(false);
            }
        } else if (key === 'Backspace') {
            setCurrentGuess(currentGuess.slice(0, -1));
        } else if (currentGuess.length < WORD_LENGTH && /^[a-zA-Z]$/.test(key)) {
            setCurrentGuess(currentGuess + key.toUpperCase());
        }
    }, [currentGuess, gameStatus, processGuess, toast, isVerifying]);
    
     useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            handleKey(e.key);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKey]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="flex flex-col items-center justify-center h-full gap-8 p-4 bg-background">
            <div className="flex flex-col items-center">
                <h2 className="text-3xl font-bold text-primary tracking-widest">WORDLE</h2>
                <p className="text-muted-foreground">Guess the {WORD_LENGTH}-letter word!</p>
            </div>
            <Grid guesses={guesses} currentGuess={currentGuess} />
            <div className="w-full max-w-lg mx-auto">
                <Keyboard onKeyClick={(key) => handleKey(key.length > 1 ? key : key.toUpperCase())} letterStatuses={letterStatuses} disabled={isVerifying} />
                <Button onClick={resetGame} className="w-full mt-4" disabled={isVerifying}><RefreshCw className="mr-2"/>New Game</Button>
            </div>
        </div>
    );
}
