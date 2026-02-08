'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Play, RotateCcw } from 'lucide-react';

// --- Game Constants ---
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 10;

const RAINBOW_COLORS = [
  'hsl(348, 83%, 61%)', // Red
  'hsl(29, 95%, 63%)',  // Orange
  'hsl(54, 100%, 62%)', // Yellow
  'hsl(145, 63%, 49%)', // Green
  'hsl(204, 70%, 53%)', // Blue
  'hsl(262.1, 83.3%, 57.8%)', // Indigo
  'hsl(314, 79%, 60%)',  // Violet
];

const PIECE_SHAPES: Record<string, { shape: number[][] }> = {
  // 1x
  A1: { shape: [[1]] },
  A2: { shape: [[1, 1]] },
  A3: { shape: [[1, 1, 1]] },
  A4: { shape: [[1, 1, 1, 1]] },
  A5: { shape: [[1, 1, 1, 1, 1]] },
  // 2x
  B1: { shape: [[1], [1]] },
  B2: { shape: [[1], [1], [1]] },
  B3: { shape: [[1], [1], [1], [1]] },
  B4: { shape: [[1], [1], [1], [1], [1]] },
  // Square
  C1: { shape: [[1, 1], [1, 1]] },
  C2: { shape: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
  // L-shapes
  D1: { shape: [[1, 0], [1, 0], [1, 1]] },
  D2: { shape: [[0, 0, 1], [1, 1, 1]] },
  D3: { shape: [[1, 1], [0, 1], [0, 1]] },
  D4: { shape: [[1, 1, 1], [1, 0, 0]] },
  // Mirrored L-shapes
  E1: { shape: [[0, 1], [0, 1], [1, 1]] },
  E2: { shape: [[1, 1, 1], [0, 0, 1]] },
  E3: { shape: [[1, 1], [1, 0], [1, 0]] },
  E4: { shape: [[1, 0, 0], [1, 1, 1]] },
};

type PieceKey = keyof typeof PIECE_SHAPES;
const PIECE_KEYS = Object.keys(PIECE_SHAPES) as PieceKey[];

type PieceInstance = {
    key: PieceKey;
    color: string;
};

type BoardCell = PieceInstance & {
    isClearing?: boolean;
};

const createEmptyBoard = (): (BoardCell | null)[][] =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));

const Blockblast = () => {
    const [board, setBoard] = useState<(BoardCell | null)[][]>(createEmptyBoard());
    const [pieces, setPieces] = useState<(PieceInstance | null)[]>([]);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isClient, setIsClient] = useState(false);
    
    const [draggingItem, setDraggingItem] = useState<(PieceInstance & { index: number; x: number; y: number; offsetX: number; offsetY: number; }) | null>(null);
    const [dropPreview, setDropPreview] = useState<{ row: number; col: number; canPlace: boolean } | null>(null);
    const boardRef = useRef<HTMLDivElement>(null);
    const pieceTrayRef = useRef<HTMLDivElement>(null);

    const canPlace = useCallback((boardToCheck: (BoardCell | null)[][], pieceKey: PieceKey, row: number, col: number): boolean => {
        const shape = PIECE_SHAPES[pieceKey].shape;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] !== 0) {
                    const boardY = row + y;
                    const boardX = col + x;
                    if (
                        boardY < 0 || boardY >= BOARD_HEIGHT ||
                        boardX < 0 || boardX >= BOARD_WIDTH ||
                        (boardToCheck[boardY] && boardToCheck[boardY][boardX] !== null)
                    ) {
                        return false;
                    }
                }
            }
        }
        return true;
    }, []);

    const isGameOver = useCallback((currentPieces: (PieceInstance | null)[], boardToCheck: (BoardCell | null)[][]): boolean => {
        const availablePieces = currentPieces.filter((p): p is PieceInstance => p !== null);
        if (availablePieces.length === 0) return false;

        for (const piece of availablePieces) {
            for (let r = 0; r < BOARD_HEIGHT; r++) {
                for (let c = 0; c < BOARD_WIDTH; c++) {
                    if (canPlace(boardToCheck, piece.key, r, c)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }, [canPlace]);

    const generateNewPieces = useCallback((boardForCheck: (BoardCell | null)[][]) => {
        const newPieces: PieceInstance[] = [];
        for (let i = 0; i < 3; i++) {
            const randomKey = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
            const randomColor = RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)];
            newPieces.push({ key: randomKey, color: randomColor });
        }
        setPieces(newPieces);
        if (isGameOver(newPieces, boardForCheck)) {
            setGameOver(true);
        }
        if (pieceTrayRef.current) {
            pieceTrayRef.current.classList.remove('animate-fade-in');
            void pieceTrayRef.current.offsetWidth; // Trigger reflow
            pieceTrayRef.current.classList.add('animate-fade-in');
        }
    }, [isGameOver]);

    const startGame = useCallback(() => {
        const emptyBoard = createEmptyBoard();
        setBoard(emptyBoard);
        setScore(0);
        setGameOver(false);
        setPieces([]);
        setTimeout(() => generateNewPieces(emptyBoard), 100);
    }, [generateNewPieces]);
    
    useEffect(() => {
        setIsClient(true)
    }, [])

    useEffect(() => {
        if (isClient) {
            startGame();
        }
    }, [isClient, startGame]);

    const clearLines = useCallback((currentBoard: (BoardCell | null)[][]) => {
        let finalBoard = currentBoard.map(row => row.map(cell => cell ? {...cell} : null));
        const rowsToClear: number[] = [];
        const colsToClear: number[] = [];
        
        for (let r = 0; r < BOARD_HEIGHT; r++) {
            if (finalBoard[r].every(cell => cell !== null && !cell.isClearing)) rowsToClear.push(r);
        }
        for (let c = 0; c < BOARD_WIDTH; c++) {
            if (finalBoard.every(row => row[c] !== null && !row[c]!.isClearing)) colsToClear.push(c);
        }
        
        const linesCleared = rowsToClear.length + colsToClear.length;
        let points = 0;

        if (linesCleared > 0) {
            rowsToClear.forEach(r => {
                for(let i = 0; i < BOARD_WIDTH; i++) if(finalBoard[r][i]) finalBoard[r][i]!.isClearing = true;
            });
            colsToClear.forEach(c => {
                 for(let i = 0; i < BOARD_HEIGHT; i++) if(finalBoard[i][c]) finalBoard[i][c]!.isClearing = true;
            });
            
            points = linesCleared * 10 + (linesCleared > 1 ? (linesCleared * (linesCleared + 1) / 2) * 5 : 0);
            return { finalBoard, points, linesCleared };
        }

        return { finalBoard: currentBoard, points: 0, linesCleared: 0 };
    }, []);
    
    const handlePieceDragStart = (e: React.MouseEvent, piece: PieceInstance, index: number) => {
        if (gameOver || pieces[index] === null) return;
        const target = e.currentTarget as HTMLDivElement;
        const rect = target.getBoundingClientRect();
        setDraggingItem({
            ...piece,
            index,
            x: e.clientX,
            y: e.clientY,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
        });
    };
    
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!draggingItem || !boardRef.current) return;

        setDraggingItem(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);

        const boardRect = boardRef.current.getBoundingClientRect();
        const mouseX = e.clientX - boardRect.left;
        const mouseY = e.clientY - boardRect.top;
        
        const col = Math.round(mouseX / (boardRect.width / BOARD_WIDTH) - 0.5);
        const row = Math.round(mouseY / (boardRect.height / BOARD_HEIGHT) - 0.5);

        if (dropPreview?.row !== row || dropPreview?.col !== col) {
            setDropPreview({
                row,
                col,
                canPlace: canPlace(board, draggingItem.key, row, col),
            });
        }
    }, [draggingItem, board, canPlace, dropPreview]);

    const handleMouseUp = useCallback(() => {
        if (draggingItem && dropPreview && dropPreview.canPlace) {
            let newBoard = board.map(r => [...r]);
            const shape = PIECE_SHAPES[draggingItem.key].shape;
            let cellsPlaced = 0;

            shape.forEach((r, y) => {
                r.forEach((cell, x) => {
                    if (cell !== 0) {
                        const newY = dropPreview.row + y;
                        const newX = dropPreview.col + x;
                        if (newY < BOARD_HEIGHT && newX < BOARD_WIDTH) {
                            newBoard[newY][newX] = { key: draggingItem.key, color: draggingItem.color };
                            cellsPlaced++;
                        }
                    }
                });
            });

            const { finalBoard: boardAfterClear, points, linesCleared } = clearLines(newBoard);
            setBoard(boardAfterClear);
            setScore(s => s + points + cellsPlaced);
            
            if (linesCleared > 0) {
                 setTimeout(() => {
                    setBoard(currentBoard => currentBoard.map(row => row.map(cell => (cell && cell.isClearing) ? null : cell)));
                 }, 300);
            }

            const newPieces = [...pieces];
            newPieces[draggingItem.index] = null;
            setPieces(newPieces);
            
            const remainingPieces = newPieces.filter(p => p !== null);
            const boardForCheck = boardAfterClear.map(row => row.map(cell => (cell && cell.isClearing) ? null : cell));

            if (remainingPieces.length === 0) {
                 setTimeout(() => generateNewPieces(boardForCheck), 200);
            } else if (isGameOver(remainingPieces, boardForCheck)) {
                setGameOver(true);
            }
        }
        setDraggingItem(null);
        setDropPreview(null);
    }, [draggingItem, dropPreview, board, pieces, clearLines, generateNewPieces, isGameOver]);
    
    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);
    
    if (!isClient) return null;

    return (
        <div className="flex flex-col lg:flex-row items-center justify-center min-h-screen bg-background text-foreground p-4 gap-8 select-none">
            <div className="flex flex-col items-center gap-4">
                <h1 className="text-4xl font-bold text-primary hidden lg:block">Block Blast</h1>
                <Board board={board} dropPreview={draggingItem && dropPreview ? { ...dropPreview, piece: draggingItem } : null} ref={boardRef} />
            </div>

            <div className="flex flex-col w-full lg:w-72 space-y-4">
                <div className="bg-secondary p-4 rounded-lg border-border border text-center">
                    <h2 className="text-lg font-semibold text-primary">Score</h2>
                    <p className="text-3xl font-bold">{score}</p>
                </div>
                
                <div ref={pieceTrayRef} className="relative bg-secondary p-4 rounded-lg border-border border flex flex-col items-center justify-around gap-4 min-h-[380px]">
                    <h2 className="text-lg font-semibold text-primary text-center absolute top-4">Pieces</h2>
                     <div className="flex lg:flex-col items-center justify-center gap-6 pt-8 w-full">
                      {pieces.map((piece, index) => (
                        <div key={index} className={cn("flex items-center justify-center h-28 w-28 transition-opacity", draggingItem?.index === index && 'opacity-0')}>
                           {piece && <Piece piece={piece} index={index} onDragStart={handlePieceDragStart} />}
                        </div>
                      ))}
                    </div>
                </div>

                {gameOver && (
                    <div className="text-center p-4 bg-destructive/20 rounded-lg">
                        <p className="text-2xl font-bold text-destructive animate-pulse">Game Over!</p>
                    </div>
                )}
                 <Button onClick={startGame} className="w-full">
                    {gameOver ? <RotateCcw className="mr-2" /> : <Play className="mr-2" />}
                    {gameOver ? 'Play Again' : 'New Game'}
                </Button>
            </div>
            
            {draggingItem && (
                 <div
                    className="pointer-events-none fixed z-50 transition-transform duration-75"
                    style={{
                        left: draggingItem.x - draggingItem.offsetX,
                        top: draggingItem.y - draggingItem.offsetY,
                        transform: 'scale(1.1)',
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
                    }}
                >
                    <Piece piece={draggingItem} index={-1} isDragging />
                </div>
            )}
            <style jsx global>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

const Piece = ({ piece, index, onDragStart, isDragging }: { piece: PieceInstance, index: number, onDragStart?: (e: React.MouseEvent, piece: PieceInstance, index: number) => void, isDragging?: boolean }) => {
    const shape = PIECE_SHAPES[piece.key].shape;
    const color = piece.color;
    
    const numCols = shape[0].length;
    const numRows = shape.length;

    return (
        <div 
          onMouseDown={(e) => onDragStart?.(e, piece, index)}
          className={cn(
              "grid", 
              onDragStart ? "cursor-grab active:cursor-grabbing hover:scale-110 transition-transform duration-150" : "",
              isDragging && "cursor-grabbing"
          )}
          style={{
            gridTemplateColumns: `repeat(${numCols}, 24px)`,
            gridTemplateRows: `repeat(${numRows}, 24px)`,
          }}
        >
            {shape.map((row, y) =>
                row.map((cell, x) => (
                    <div
                        key={`${y}-${x}`}
                        className="w-6 h-6"
                        style={{
                           backgroundColor: cell !== 0 ? color : 'transparent',
                           border: cell !== 0 ? '1px solid rgba(0,0,0,0.2)' : 'none',
                           visibility: cell !== 0 ? 'visible' : 'hidden',
                        }}
                    />
                ))
            )}
        </div>
    );
};

interface BoardProps {
    board: (BoardCell | null)[][];
    dropPreview: { row: number; col: number; piece: PieceInstance; canPlace: boolean } | null;
}

const Board = React.forwardRef<HTMLDivElement, BoardProps>(({ board, dropPreview }, ref) => {
    const displayBoard = React.useMemo(() => {
        let newBoard: (BoardCell | null)[][] = board.map(row => row.map(cell => cell ? {...cell} : null));
        if (dropPreview) {
            const { row, col, piece } = dropPreview;
            const shape = PIECE_SHAPES[piece.key].shape;
            
            shape.forEach((r, y) => {
                r.forEach((cell, x) => {
                    if (cell !== 0) {
                        const boardY = row + y;
                        const boardX = col + x;
                        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
                            if (newBoard[boardY][boardX] === null) {
                                newBoard[boardY][boardX] = piece;
                            }
                        }
                    }
                });
            });
        }
        return newBoard;
    }, [board, dropPreview]);

    return (
         <div
            ref={ref}
            className="grid gap-px bg-secondary p-1 rounded-lg border-2 border-primary/20 shadow-lg"
            style={{
                gridTemplateColumns: `repeat(${BOARD_WIDTH}, 24px)`,
                width: '249px',
                height: '249px',
            }}
        >
            {displayBoard.map((row, y) =>
                row.map((cell, x) => {
                    const originalCell = board[y][x];
                    const isOriginalBlock = originalCell !== null;
                    const isPreview = !isOriginalBlock && cell !== null;
                    const isClearing = originalCell?.isClearing;

                    const opacity = isPreview ? (dropPreview!.canPlace ? 0.5 : 0.3) : 1;
                    const color = isPreview 
                        ? (dropPreview!.canPlace ? dropPreview!.piece.color : 'hsl(0 62.8% 30.6%)') 
                        : cell?.color || 'transparent';

                    return (
                        <div
                            key={`${y}-${x}`}
                            className={cn(
                                "w-full h-full transition-colors duration-100",
                                isOriginalBlock && !isClearing && "animate-pop-in",
                                isClearing && 'animate-line-clear'
                            )}
                            style={{
                                backgroundColor: cell === null ? 'rgba(0,0,0,0.2)' : color,
                                opacity: cell === null && !isPreview ? 1 : opacity,
                                outline: cell !== null && !isPreview ? `1px solid rgba(0,0,0,0.2)` : 'none',
                                outlineOffset: '-1px'
                            }}
                        />
                    );
                })
            )}
            <style jsx>{`
                @keyframes pop-in {
                    0% { transform: scale(0.5); opacity: 0; }
                    80% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-pop-in {
                    animation: pop-in 0.2s ease-out;
                }
                @keyframes line-clear {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.2); background-color: white; }
                    100% { transform: scale(0); background-color: white; }
                }
                .animate-line-clear {
                    animation: line-clear 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
});
Board.displayName = 'Board';

export default Blockblast;
