import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useChannelContext } from "@/contexts/channel-context";
import { Loading } from "@/components/ui/loading";
import { Tag as TagIcon, Plus, Pencil, Trash2, Palette, AlertTriangle, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const PRESET_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#f43f5e", // Rose
  "#6b7280", // Gray
];

export default function TagsManagerSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedChannel } = useChannelContext();
  const channelId = selectedChannel?.id;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form states
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#3b82f6");
  const [selectedTag, setSelectedTag] = useState<any>(null);

  // Query: fetch tags
  const { data: tags = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tags", channelId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/tags?channelId=${channelId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!channelId,
  });

  // Create Tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/tags", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create tag");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Tag Created",
        description: "The new tag was successfully registered.",
      });
      setIsAddOpen(false);
      setTagName("");
      setTagColor("#3b82f6");
      queryClient.invalidateQueries({ queryKey: ["/api/tags", channelId] });
      // Invalidate conversation list to reflect new tag options
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Update Tag mutation
  const updateTagMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("PUT", `/api/tags/${selectedTag.id}`, payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update tag");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Tag Updated",
        description: "Tag name and color have been successfully updated.",
      });
      setIsEditOpen(false);
      setSelectedTag(null);
      queryClient.invalidateQueries({ queryKey: ["/api/tags", channelId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Delete Tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/tags/${selectedTag.id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete tag");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Tag Deleted",
        description: "The tag was deleted and cleared from all chats.",
      });
      setIsDeleteOpen(false);
      setSelectedTag(null);
      queryClient.invalidateQueries({ queryKey: ["/api/tags", channelId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!tagName.trim()) {
      toast({
        title: "Name Required",
        description: "Please specify a name for the tag.",
        variant: "destructive",
      });
      return;
    }
    createTagMutation.mutate({
      name: tagName.trim().toLowerCase(),
      color: tagColor,
      channelId,
    });
  };

  const handleUpdate = () => {
    if (!tagName.trim()) {
      toast({
        title: "Name Required",
        description: "Please specify a name for the tag.",
        variant: "destructive",
      });
      return;
    }
    updateTagMutation.mutate({
      name: tagName.trim().toLowerCase(),
      color: tagColor,
    });
  };

  const openEdit = (tag: any) => {
    setSelectedTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setIsEditOpen(true);
  };

  const openDelete = (tag: any) => {
    setSelectedTag(tag);
    setIsDeleteOpen(true);
  };

  if (!channelId) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-gray-500">
          Please select a WhatsApp Channel to manage conversation tags.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-1.5 text-slate-800">
            <TagIcon className="w-5 h-5 text-indigo-500" />
            Tags Manager
          </CardTitle>
          <CardDescription className="text-xs">
            Create and edit color-coded tags to organize conversation threads and segmentation labels.
          </CardDescription>
        </div>
        <Button
          onClick={() => {
            setTagName("");
            setTagColor("#3b82f6");
            setIsAddOpen(true);
          }}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Tag
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loading />
            <p className="text-xs text-gray-400 mt-2">Loading tags...</p>
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg text-slate-500 text-xs">
            No tags registered for this channel yet. Click "Add Tag" to create one.
          </div>
        ) : (
          <div className="border border-slate-100 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3.5 pl-4">Tag</th>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Color Hex</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3.5 pl-4">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: tag.color || "#6b7280" }}
                      >
                        {tag.name.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">{tag.name}</td>
                    <td className="p-3.5 text-slate-500 font-mono">{tag.color}</td>
                    <td className="p-3.5 text-right pr-4 space-x-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(tag)}
                        className="w-8 h-8 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openDelete(tag)}
                        className="w-8 h-8 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* CREATE TAG DIALOG */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-500" />
              Create Tag
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new categorization tag to segment conversation threads.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Tag Name</Label>
              <Input
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="E.g. VIP Customer, Lead, Support"
                className="border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-indigo-500" />
                Select Color Palette
              </Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTagColor(color)}
                    className="w-6 h-6 rounded-full border border-slate-100 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-sm"
                    style={{ backgroundColor: color }}
                  >
                    {tagColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Custom Color Hex</Label>
              <div className="flex gap-2">
                <div 
                  className="w-9 h-9 rounded border border-slate-200 shrink-0 shadow-sm"
                  style={{ backgroundColor: tagColor }}
                />
                <Input
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="border-slate-200 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={createTagMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {createTagMutation.isPending ? "Creating..." : "Create Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT TAG DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Pencil className="w-4 h-4 text-indigo-500" />
              Edit Tag
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modify the label name or color of the selected tag.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Tag Name</Label>
              <Input
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="E.g. VIP Customer"
                className="border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-indigo-500" />
                Select Color Palette
              </Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTagColor(color)}
                    className="w-6 h-6 rounded-full border border-slate-100 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-sm"
                    style={{ backgroundColor: color }}
                  >
                    {tagColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Custom Color Hex</Label>
              <div className="flex gap-2">
                <div 
                  className="w-9 h-9 rounded border border-slate-200 shrink-0 shadow-sm"
                  style={{ backgroundColor: tagColor }}
                />
                <Input
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  className="border-slate-200 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpdate}
              disabled={updateTagMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {updateTagMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5 text-rose-600">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Delete Tag?
            </DialogTitle>
            <DialogDescription className="text-xs leading-normal">
              Are you sure you want to delete the tag <strong className="text-slate-800">"{selectedTag?.name}"</strong>? 
              <br />
              <span className="text-rose-650 font-medium">This will remove this tag assignment from all existing contacts and chats retrospectively. This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => deleteTagMutation.mutate()}
              disabled={deleteTagMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {deleteTagMutation.isPending ? "Deleting..." : "Delete Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
