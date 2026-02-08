"use client";

import React, { useState } from 'react';
import { Folder, File as FileIcon, Upload } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getFileContent, saveFileContent, createNewFile, uploadFile } from '@/lib/actions';
import { useAuth } from '@/components/auth-provider';

export type FileNode = {
    name: string;
    type: 'file';
    path: string;
}

export type DirectoryNode = {
    name: string;
    type: 'directory';
    children: (FileNode | DirectoryNode)[];
}

export type ProjectStructure = (FileNode | DirectoryNode)[];

interface CodeEditorProps {
    initialStructure: ProjectStructure;
}

function FileTree({ structure, onFileSelect, level = 0 }: { structure: ProjectStructure, onFileSelect: (path: string) => void, level?: number }) {
    const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({src: true});

    const toggleFolder = (name: string) => {
        setOpenFolders(prev => ({ ...prev, [name]: !prev[name] }));
    };

    return (
        <div>
            {structure.map(node => (
                <div key={node.name + level} style={{ paddingLeft: `${level * 16}px` }}>
                    {node.type === 'directory' ? (
                        <div>
                            <div className="flex items-center gap-1 cursor-pointer hover:bg-accent p-1 rounded" onClick={() => toggleFolder(node.name)}>
                                <Folder className="h-4 w-4 text-primary" />
                                <span>{node.name}</span>
                            </div>
                            {openFolders[node.name] && (
                                <FileTree structure={node.children} onFileSelect={onFileSelect} level={level + 1} />
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 cursor-pointer hover:bg-accent p-1 rounded" onClick={() => onFileSelect(node.path)}>
                            <FileIcon className="h-4 w-4 text-muted-foreground" />
                            <span>{node.name}</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export function CodeEditor({ initialStructure }: CodeEditorProps) {
    const [structure, setStructure] = useState(initialStructure);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileSelect = async (path: string) => {
        setIsLoading(true);
        setSelectedFile(path);
        try {
            const content = await getFileContent(path);
            setFileContent(content);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error loading file', description: (e as Error).message });
            setFileContent('');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSave = async () => {
        if (!selectedFile || !user) return;
        setIsSaving(true);
        try {
            await saveFileContent(user.id, selectedFile, fileContent);
            toast({ title: 'Success', description: `${selectedFile} saved.` });
        } catch (e) {
             toast({ variant: 'destructive', title: 'Error saving file', description: (e as Error).message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCreateFile = async () => {
        if (!user) return;
        const newFilePath = prompt("Enter the full path for the new file (e.g., src/components/new-component.tsx):");
        if (!newFilePath) return;

        try {
            await createNewFile(user.id, newFilePath);
            toast({ title: 'Success', description: 'File created. Please refresh the page to see it in the tree.'});
        } catch (e) {
             toast({ variant: 'destructive', title: 'Error creating file', description: (e as Error).message });
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user) return;
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadPath = prompt("Enter the directory path to upload to (e.g., src/assets):", "src/lib/data");
        if (uploadPath === null) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', uploadPath);

        try {
            await uploadFile(user.id, formData);
            toast({ title: 'Success', description: 'File uploaded. Please refresh the page to see it.' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Upload failed', description: (e as Error).message });
        } finally {
            // Reset file input
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="flex h-full gap-4">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <div className="w-80 border-r pr-4">
                <div className="flex gap-2 mb-2">
                    <Button size="sm" onClick={handleCreateFile}>New File</Button>
                    <Button size="sm" variant="outline" onClick={handleUploadClick}><Upload className="mr-2 h-4 w-4" /> Upload</Button>
                </div>
                <ScrollArea className="h-[calc(100%-40px)]">
                    <FileTree structure={structure} onFileSelect={handleFileSelect} />
                </ScrollArea>
            </div>
            <div className="flex-1 flex flex-col">
                {selectedFile ? (
                    <>
                        <div className="flex justify-between items-center mb-2">
                           <p className="font-mono text-sm">{selectedFile}</p>
                           <Button onClick={handleSave} disabled={isSaving || isLoading}>{isSaving ? "Saving..." : "Save File"}</Button>
                        </div>
                        {isLoading ? (
                             <div className="flex items-center justify-center h-full text-muted-foreground">Loading file...</div>
                        ) : (
                            <Textarea 
                                value={fileContent} 
                                onChange={(e) => setFileContent(e.target.value)}
                                className="flex-grow font-mono text-xs resize-none h-full"
                                placeholder="File content will appear here..."
                            />
                        )}
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        Select a file to view or edit its content.
                    </div>
                )}
            </div>
        </div>
    )
}
