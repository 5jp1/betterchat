"use client";

import { createRoom } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export function AddRoomDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('seed');

  const handleCreateRoom = async (formData: FormData) => {
      formData.set('iconSource', activeTab);
      try {
        await createRoom(formData);
        onOpenChange(false);
        // Let revalidation handle the visual feedback, but show a toast for errors.
      } catch (e) {
        const error = e instanceof Error ? e.message : "An unknown error occurred.";
        toast({ variant: 'destructive', title: "Failed to create channel", description: error });
      }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form action={handleCreateRoom}>
          <DialogHeader>
            <DialogTitle>Create a new channel</DialogTitle>
            <DialogDescription>
              Enter a name and an icon for your new channel. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" name="name" required className="col-span-3" />
            </div>

            <Tabs defaultValue="seed" onValueChange={setActiveTab} className="w-full pt-2">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="seed">Seed</TabsTrigger>
                    <TabsTrigger value="url">URL</TabsTrigger>
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                </TabsList>
                <TabsContent value="seed" className="pt-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="seed" className="text-right">Icon Seed</Label>
                        <Input id="seed" name="seed" required={activeTab === 'seed'} className="col-span-3" />
                    </div>
                </TabsContent>
                <TabsContent value="url" className="pt-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="iconUrl" className="text-right">Icon URL</Label>
                        <Input id="iconUrl" name="iconUrl" type="url" required={activeTab === 'url'} className="col-span-3" />
                    </div>
                </TabsContent>
                <TabsContent value="upload" className="pt-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="iconFile" className="text-right">Image</Label>
                        <Input id="iconFile" name="iconFile" type="file" accept="image/*" required={activeTab === 'upload'} className="col-span-3 file:text-foreground" />
                    </div>
                </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button type="submit">Create Channel</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
