import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Image as ImageIcon,
  Video as VideoIcon,
  FileAudio as AudioIcon,
  FileText as DocIcon,
  Search,
  Trash2,
  Loader2,
  File,
  Check,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface MediaAsset {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  createdAt: string;
}

interface MediaGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, name: string) => void;
  allowedTypes?: ("image" | "video" | "audio" | "document")[];
}

export function MediaGalleryDialog({
  open,
  onOpenChange,
  onSelect,
  allowedTypes,
}: MediaGalleryDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: mediaItems, isLoading } = useQuery<MediaAsset[]>({
    queryKey: ["/api/media-library"],
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to upload file");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
      toast({
        title: "Uploaded!",
        description: "File uploaded successfully and saved to Media Library.",
      });
      if (data.url) {
        onSelect(data.url, data.fileName || "Uploaded File");
        onOpenChange(false);
      }
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err.message || "Failed to upload file.",
      });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/media-library/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete media asset");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
      toast({
        title: "Deleted!",
        description: "Media asset deleted successfully from library.",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err.message || "Failed to delete file.",
      });
    },
  });

  const getMediaType = (mimeType: string): "image" | "video" | "audio" | "document" => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    return "document";
  };

  const filteredItems = (mediaItems || []).filter((item) => {
    const type = getMediaType(item.mimeType);

    // Filter by allowedTypes prop if specified
    if (allowedTypes && !allowedTypes.includes(type)) return false;

    // Filter by active tab selector
    if (activeTab !== "all" && type !== activeTab) return false;

    // Filter by search query
    return item.fileName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const renderPreview = (item: MediaAsset) => {
    const type = getMediaType(item.mimeType);

    switch (type) {
      case "image":
        return (
          <img
            src={`/api/media-library/file/${item.id}`}
            alt={item.fileName}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        );
      case "video":
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white relative">
            <VideoIcon className="w-8 h-8 text-gray-300" />
            <span className="absolute bottom-1 right-1 bg-black/60 px-1 py-0.5 rounded text-[9px]">VIDEO</span>
          </div>
        );
      case "audio":
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-purple-50 text-purple-700 relative">
            <AudioIcon className="w-8 h-8" />
            <span className="absolute bottom-1 right-1 bg-purple-100 px-1 py-0.5 rounded text-[9px] font-semibold">AUDIO</span>
          </div>
        );
      default:
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 text-blue-700 relative">
            <DocIcon className="w-8 h-8" />
            <span className="absolute bottom-1 right-1 bg-blue-100 px-1 py-0.5 rounded text-[9px] font-semibold">DOC</span>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <ImageIcon className="w-5 h-5 text-purple-600" />
            Media Gallery & Library
          </DialogTitle>
        </DialogHeader>

        {/* Filters and Search toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="bg-gray-100 p-0.5">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="image" className="text-xs flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" /> Images
              </TabsTrigger>
              <TabsTrigger value="video" className="text-xs flex items-center gap-1">
                <VideoIcon className="w-3.5 h-3.5" /> Videos
              </TabsTrigger>
              <TabsTrigger value="audio" className="text-xs flex items-center gap-1">
                <AudioIcon className="w-3.5 h-3.5" /> Audio
              </TabsTrigger>
              <TabsTrigger value="document" className="text-xs flex items-center gap-1">
                <DocIcon className="w-3.5 h-3.5" /> Docs
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-xs rounded-lg"
            />
          </div>
        </div>

        {/* Upload section directly inside gallery */}
        <div className="mt-3 border border-dashed border-purple-200 rounded-xl p-3 bg-purple-50/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100/80 flex items-center justify-center text-purple-700">
              {uploadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-gray-700">Upload new media to Library</h4>
              <p className="text-[10px] text-gray-500">Supports image, video, audio & docs (Max 100MB)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              id="gallery-direct-upload"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
              }}
              disabled={uploadMutation.isPending}
            />
            <Button
              type="button"
              onClick={() => document.getElementById("gallery-direct-upload")?.click()}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg h-8 text-xs font-semibold px-4"
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload File"}
            </Button>
          </div>
        </div>

        {/* Gallery Content Area */}
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[480px] mt-4 border rounded-xl p-4 bg-gray-50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-16">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
              <p className="text-sm text-gray-500 font-medium">Loading media assets...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <File className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-700">No media files found</p>
              <p className="text-xs text-gray-400 max-w-xs mt-1">
                {searchTerm ? "No files match your search filter." : "Upload media inside Campaigns or Inbox to save files here."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-40 cursor-pointer"
                  onClick={() => {
                    onSelect(item.url, item.fileName);
                    onOpenChange(false);
                  }}
                >
                  {/* File preview block */}
                  <div className="flex-1 overflow-hidden bg-gray-100 relative">
                    {renderPreview(item)}

                    {/* Hover Select overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-white text-purple-700 p-2 rounded-full shadow-lg">
                        <Check className="w-5 h-5 font-bold" />
                      </div>
                    </div>
                  </div>

                  {/* Metadata / Details */}
                  <div className="p-2 border-t flex items-center justify-between gap-1.5 bg-white">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-gray-800 truncate" title={item.fileName}>
                        {item.fileName}
                      </p>
                      <p className="text-[8px] text-gray-400">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation(); // Avoid triggering selection
                        if (confirm(`Are you sure you want to delete ${item.fileName}?`)) {
                          deleteAssetMutation.mutate(item.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t mt-auto">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-lg h-9 text-xs"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
