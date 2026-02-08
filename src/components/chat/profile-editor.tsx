"use client";

import { updateAvatar } from '@/lib/actions';
import { useAuth } from '@/components/auth-provider';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

export function ProfileEditor({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('url');

  const handleUpdateAvatar = async (formData: FormData) => {
    if (!user) return;
    
    // The form submission automatically includes the active tab's input.
    // We just need to tell the action which tab was active.
    formData.set('iconSource', activeTab);

    try {
        await updateAvatar(user.id, formData);
        toast({ title: "Avatar updated!", description: "Your new avatar has been set." });
        onOpenChange(false);
    } catch(e) {
        const error = e instanceof Error ? e.message : "An unknown error occurred.";
        toast({ variant: 'destructive', title: "Update failed", description: error });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form action={handleUpdateAvatar}>
          <DialogHeader>
            <DialogTitle>Customize Profile</DialogTitle>
            <DialogDescription>
              Change your profile picture by providing a new image URL or uploading one.
            </DialogDescription>
          </DialogHeader>
          
           <Tabs defaultValue="url" onValueChange={setActiveTab} className="w-full pt-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url">URL</TabsTrigger>
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="pt-4">
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="avatarUrl" className="text-right">
                            Avatar URL
                        </Label>
                        <Input 
                            id="avatarUrl" 
                            name="avatarUrl" 
                            defaultValue={user?.avatarUrl?.startsWith('http') ? user.avatarUrl : ''} 
                            required={activeTab === 'url'} 
                            className="col-span-3" 
                        />
                    </div>
                </TabsContent>
                <TabsContent value="upload" className="pt-4">
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="avatarFile" className="text-right">
                            Image
                        </Label>
                        <Input 
                            id="avatarFile" 
                            name="avatarFile" 
                            type="file" 
                            accept="image/*" 
                            required={activeTab === 'upload'} 
                            className="col-span-3 file:text-foreground" 
                        />
                    </div>
                </TabsContent>
            </Tabs>
          
          <DialogFooter className="pt-6">
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
