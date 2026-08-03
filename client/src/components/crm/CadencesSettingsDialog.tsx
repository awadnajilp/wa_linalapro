import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Trash2, 
  Clock, 
  ChevronLeft, 
  Play, 
  MessageSquare, 
  AlertCircle,
  Sparkles,
  Settings,
  Loader2,
  Check,
  Upload
} from "lucide-react";

interface Stage {
  id: string;
  name: string;
  pipelineId: string;
}

interface CadencesSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  stages: Stage[];
}

interface Cadence {
  id: string;
  name: string;
  isActive: boolean;
  triggerStageId: string;
  stopCondition: string;
  sendChannelId?: string | null;
  channelId: string;
}

interface CadenceStep {
  id?: string;
  stepNumber: number;
  delayHours: number;
  messageType: "text" | "template";
  templateName?: string | null;
  templateLanguage?: string | null;
  messageText?: string | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "document" | null;
  mediaName?: string | null;
}

export default function CadencesSettingsDialog({
  open,
  onOpenChange,
  channelId,
  stages
}: CadencesSettingsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "create" | "steps">("list");
  const [selectedCadence, setSelectedCadence] = useState<Cadence | null>(null);

  // Form states for creating a cadence
  const [cadenceName, setCadenceName] = useState("");
  const [triggerStageId, setTriggerStageId] = useState("");
  const [stopCondition, setStopCondition] = useState("reply_or_close");
  const [sendChannelId, setSendChannelId] = useState(channelId);

  // Steps configuration states
  const [steps, setSteps] = useState<CadenceStep[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // 1. Fetch active channels
  const { data: activeChannels = [] } = useQuery<any[]>({
    queryKey: ["/api/channels"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/channels");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json.filter((c: any) => c.isActive) : [];
    },
    enabled: open
  });

  // 2. Fetch Cadences
  const { data: cadences = [], isLoading: isLoadingCadences } = useQuery<Cadence[]>({
    queryKey: ["/api/crm/cadences", { channelId }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/crm/cadences?channelId=${channelId}`);
      return res.json();
    },
    enabled: open && !!channelId
  });

  // 2. Fetch templates for this channel
  const templatesChannelId = selectedCadence?.sendChannelId || selectedCadence?.channelId || channelId;
  const { data: localTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/templates", { channelId: templatesChannelId }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/templates?channelId=${templatesChannelId}`);
      const json = await res.json();
      return Array.isArray(json) ? json : json?.data || [];
    },
    enabled: open && !!templatesChannelId
  });

  // 3. Create Cadence Mutation
  const createCadenceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/crm/cadences", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Follow-up cadence created successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/cadences", { channelId }] });
      setView("list");
      // Reset form
      setCadenceName("");
      setTriggerStageId("");
      setStopCondition("reply_or_close");
      setSendChannelId(channelId);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create cadence.",
        variant: "destructive"
      });
    }
  });

  // 4. Update Cadence Mutation (Toggle active status)
  const updateCadenceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/crm/cadences/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/cadences", { channelId }] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update cadence.",
        variant: "destructive"
      });
    }
  });

  // 5. Delete Cadence Mutation
  const deleteCadenceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/crm/cadences/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Deleted",
        description: "Follow-up cadence removed successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/cadences", { channelId }] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete cadence.",
        variant: "destructive"
      });
    }
  });

  // 6. Save Steps Mutation
  const saveStepsMutation = useMutation({
    mutationFn: async ({ cadenceId, steps }: { cadenceId: string; steps: CadenceStep[] }) => {
      const res = await apiRequest("POST", `/api/crm/cadences/${cadenceId}/steps`, { steps });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Steps Saved",
        description: "Cadence follow-up sequence updated."
      });
      setView("list");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save steps.",
        variant: "destructive"
      });
    }
  });

  const handleCreateCadence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cadenceName || !triggerStageId) {
      toast({
        title: "Validation Error",
        description: "Please enter a name and choose a trigger stage.",
        variant: "destructive"
      });
      return;
    }
    createCadenceMutation.mutate({
      name: cadenceName,
      channelId,
      triggerStageId,
      stopCondition,
      sendChannelId: sendChannelId || channelId
    });
  };

  const handleOpenSteps = async (cadence: Cadence) => {
    setSelectedCadence(cadence);
    try {
      const res = await apiRequest("GET", `/api/crm/cadences/${cadence.id}/steps`);
      const existingSteps = await res.json();
      setSteps(existingSteps);
      setView("steps");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load steps.",
        variant: "destructive"
      });
    }
  };

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        stepNumber: steps.length + 1,
        delayHours: 24,
        messageType: "text",
        messageText: "",
        templateName: "",
        templateLanguage: "en_US",
        mediaUrl: null,
        mediaType: null,
        mediaName: null
      }
    ]);
  };

  const handleRemoveStep = (index: number) => {
    const updated = steps.filter((_, idx) => idx !== index);
    // Re-index step numbers
    const reindexed = updated.map((step, idx) => ({
      ...step,
      stepNumber: idx + 1
    }));
    setSteps(reindexed);
  };

  const handleStepFileUpload = async (index: number, file: File) => {
    let maxSize = 100 * 1024 * 1024; // 100MB
    let typeName = "document";
    let sizeLabel = "100MB";

    if (file.type.startsWith("image/")) {
      maxSize = 5 * 1024 * 1024; // 5MB
      typeName = "image";
      sizeLabel = "5MB";
    } else if (file.type.startsWith("video/")) {
      maxSize = 16 * 1024 * 1024; // 16MB
      typeName = "video";
      sizeLabel = "16MB";
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `The maximum file size allowed for ${typeName} is ${sizeLabel}. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
        variant: "destructive",
      });
      return;
    }

    setUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      
      let guessedType: "image" | "video" | "document" = "document";
      if (file.type.startsWith("image/")) guessedType = "image";
      else if (file.type.startsWith("video/")) guessedType = "video";

      const updated = [...steps];
      updated[index] = {
        ...updated[index],
        mediaUrl: data.url,
        mediaName: data.name,
        mediaType: guessedType
      };
      setSteps(updated);

      toast({
        title: "Success",
        description: "File uploaded successfully."
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Upload failed",
        description: "Failed to upload media file",
        variant: "destructive",
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleUpdateStep = (index: number, key: keyof CadenceStep, val: any) => {
    const updated = [...steps];
    updated[index] = {
      ...updated[index],
      [key]: val
    };
    setSteps(updated);
  };

  const handleSaveSteps = () => {
    if (!selectedCadence) return;
    saveStepsMutation.mutate({
      cadenceId: selectedCadence.id,
      steps
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col p-6 rounded-2xl shadow-xl border border-slate-150">
        <DialogHeader className="border-b border-slate-100 pb-4 shrink-0">
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Automated Follow-up Cadences
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Define automated follow-up sequences to message contacts automatically until closed or replied.
          </DialogDescription>
        </DialogHeader>

        {/* ─── LIST VIEW ─── */}
        {view === "list" && (
          <div className="flex-1 space-y-4 py-4 overflow-y-auto">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configured Sequences</span>
              <Button 
                onClick={() => setView("create")}
                size="sm"
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-1.5 h-8 font-medium cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Cadence
              </Button>
            </div>

            {isLoadingCadences ? (
              <p className="text-center text-xs text-slate-400 py-8">Loading follow-ups...</p>
            ) : cadences.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">No follow-ups defined yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Create a cadence to automate stage-based messaging.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cadences.map((cadence) => {
                  const stage = stages.find((s) => s.id === cadence.triggerStageId);
                  return (
                    <div 
                      key={cadence.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-sm transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-800 text-sm">{cadence.name}</h4>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            Trigger: {stage?.name || "Unknown Stage"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Stop Condition: {cadence.stopCondition === "reply_or_close" ? "Customer Replies or Deal Closed" : "Deal Closed Only"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500 font-medium">{cadence.isActive ? "Active" : "Paused"}</span>
                          <Switch 
                            checked={cadence.isActive}
                            onCheckedChange={(checked) => 
                              updateCadenceMutation.mutate({ 
                                id: cadence.id, 
                                data: { isActive: checked } 
                              })
                            }
                          />
                        </div>

                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenSteps(cadence)}
                          className="h-8 text-xs font-medium cursor-pointer"
                        >
                          <Settings className="w-3.5 h-3.5 mr-1" />
                          Steps
                        </Button>

                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this cadence?")) {
                              deleteCadenceMutation.mutate(cadence.id);
                            }
                          }}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── CREATE VIEW ─── */}
        {view === "create" && (
          <form onSubmit={handleCreateCadence} className="flex-1 space-y-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                onClick={() => setView("list")}
                className="w-7 h-7 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-semibold text-slate-800 text-sm">Create Cadence Trigger</h3>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium text-slate-700">Sequence Name</Label>
                <Input 
                  id="name" 
                  value={cadenceName}
                  onChange={(e) => setCadenceName(e.target.value)}
                  placeholder="e.g. Stage Lead Follow-up"
                  className="rounded-lg h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Trigger Stage</Label>
                <Select value={triggerStageId} onValueChange={setTriggerStageId}>
                  <SelectTrigger className="h-9 rounded-lg text-xs">
                    <SelectValue placeholder="Choose target stage" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id} className="text-xs">
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400">Sequence triggers immediately when a deal card enters this column.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Sending Channel</Label>
                <Select value={sendChannelId} onValueChange={setSendChannelId}>
                  <SelectTrigger className="h-9 rounded-lg text-xs">
                    <SelectValue placeholder="Select sending channel" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {activeChannels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id} className="text-xs">
                        {ch.name} ({ch.phoneNumber || ch.connectionMethod})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400">
                  Choose which WhatsApp channel this cadence sends automated messages from.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Stop Sequence When</Label>
                <Select value={stopCondition} onValueChange={setStopCondition}>
                  <SelectTrigger className="h-9 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reply_or_close" className="text-xs">Customer Replies or Deal Closed (Recommended)</SelectItem>
                    <SelectItem value="close_only" className="text-xs">Deal is closed as Won/Lost only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400">Pending schedules will automatically cancel when this condition evaluates to true.</p>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 mt-6">
              <Button type="button" variant="outline" onClick={() => setView("list")} className="h-9 text-xs font-medium cursor-pointer">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createCadenceMutation.isPending}
                className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Create Cadence
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ─── STEPS VIEW ─── */}
        {view === "steps" && selectedCadence && (
          <div className="flex-1 flex flex-col min-h-0 py-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0 mb-4">
              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setView("list")}
                  className="w-7 h-7 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="space-y-0.5">
                  <h3 className="font-semibold text-slate-800 text-sm">Configure Steps</h3>
                  <p className="text-[10px] text-indigo-600 font-medium">Cadence: {selectedCadence.name}</p>
                </div>
              </div>

              <Button 
                onClick={handleAddStep}
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Step
              </Button>
            </div>

            {/* Sending Channel Quick Config */}
            <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl mb-4 text-xs flex items-center justify-between gap-3 shrink-0">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-700 text-xs">Sending Channel</span>
                <p className="text-[10px] text-slate-400">Messages in this sequence send from here.</p>
              </div>
              <Select 
                value={selectedCadence.sendChannelId || selectedCadence.channelId} 
                onValueChange={(val) => {
                  updateCadenceMutation.mutate({
                    id: selectedCadence.id,
                    data: { sendChannelId: val }
                  });
                  setSelectedCadence(prev => prev ? { ...prev, sendChannelId: val } : null);
                }}
              >
                <SelectTrigger className="h-8 w-[180px] bg-white rounded-lg text-xs">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {activeChannels.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id} className="text-xs">
                      {ch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Steps Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[45vh] min-h-[150px]">
              {steps.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 m-2">
                  <Play className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No steps configured.</p>
                  <p className="text-[10px] text-slate-400">Click "+ Add Step" to schedule a message.</p>
                </div>
              ) : (
                steps.map((step, index) => (
                  <div 
                    key={index} 
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3.5 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                        Step {step.stepNumber}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveStep(index)}
                        className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Delay (Hours)</Label>
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 h-9">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input 
                            type="number"
                            min="1"
                            value={step.delayHours}
                            onChange={(e) => handleUpdateStep(index, "delayHours", parseInt(e.target.value) || 1)}
                            className="w-full text-xs font-medium text-slate-800 bg-transparent border-0 focus:ring-0 outline-none p-0"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Message Type</Label>
                        <Select 
                          value={step.messageType} 
                          onValueChange={(val: "text" | "template") => handleUpdateStep(index, "messageType", val)}
                        >
                          <SelectTrigger className="h-9 bg-white rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="text" className="text-xs">Raw Text Message</SelectItem>
                            <SelectItem value="template" className="text-xs font-medium">Approved Template</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {step.messageType === "template" ? (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Select Template</Label>
                          <Select 
                            value={step.templateName || ""} 
                            onValueChange={(val) => handleUpdateStep(index, "templateName", val)}
                          >
                            <SelectTrigger className="h-9 bg-white rounded-lg text-xs">
                              <SelectValue placeholder="Choose template" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[180px]">
                              {localTemplates.map((tmpl: any) => (
                                <SelectItem key={tmpl.id} value={tmpl.name} className="text-xs">
                                  {tmpl.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Language Code</Label>
                          <Input 
                            value={step.templateLanguage || "en_US"}
                            onChange={(e) => handleUpdateStep(index, "templateLanguage", e.target.value)}
                            placeholder="e.g. en_US, hi_IN"
                            className="bg-white rounded-lg h-9 text-xs"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Custom Message Body</Label>
                        <Textarea 
                          value={step.messageText || ""}
                          onChange={(e) => handleUpdateStep(index, "messageText", e.target.value)}
                          placeholder="Type follow-up text here... Supports variables like {{name}} and {{phone}}."
                          rows={3}
                          className="bg-white text-xs rounded-lg resize-none"
                        />
                                     {/* Unified Media Header/Attachment config block */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 mt-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Media Header / Attachment (Optional)
                        </Label>
                        {step.mediaUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateStep(index, "mediaUrl", null);
                              handleUpdateStep(index, "mediaType", null);
                              handleUpdateStep(index, "mediaName", null);
                            }}
                            className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                          >
                            Remove Media
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row gap-3 items-stretch">
                          <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg p-3 bg-slate-50 hover:bg-slate-100/70 transition relative min-h-[80px]">
                            <input
                              type="file"
                              className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleStepFileUpload(index, file);
                              }}
                              disabled={uploadingIndex === index}
                            />
                            <div className="flex flex-col items-center text-center gap-1">
                              {uploadingIndex === index ? (
                                <>
                                  <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
                                  <span className="text-[10px] font-medium text-slate-600">Uploading file...</span>
                                </>
                              ) : step.mediaUrl ? (
                                <>
                                  <Check className="h-5 w-5 text-green-600" />
                                  <span className="text-[10px] font-semibold text-slate-800 max-w-[200px] truncate">
                                    {step.mediaName || "File uploaded"}
                                  </span>
                                  <span className="text-[9px] text-slate-400">Click to change file</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-5 w-5 text-slate-400" />
                                  <span className="text-[10px] font-medium text-slate-600">Upload Media File</span>
                                  <span className="text-[9px] text-slate-400">Image, Video, Document</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col justify-between space-y-1.5">
                            <div>
                              <Label className="text-[9px] font-semibold text-slate-400 block">Or Enter Media URL directly</Label>
                              <Input
                                placeholder="https://example.com/image.jpg"
                                value={step.mediaUrl || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleUpdateStep(index, "mediaUrl", val || null);
                                  if (!val) {
                                    handleUpdateStep(index, "mediaType", null);
                                    handleUpdateStep(index, "mediaName", null);
                                  } else {
                                    const ext = val.split("?")[0].split(".").pop()?.toLowerCase();
                                    let guessedType: "image" | "video" | "document" = "image";
                                    if (ext === "mp4" || ext === "mov" || ext === "avi") guessedType = "video";
                                    else if (ext === "pdf" || ext === "doc" || ext === "docx" || ext === "xls" || ext === "xlsx") guessedType = "document";
                                    handleUpdateStep(index, "mediaType", guessedType);
                                    handleUpdateStep(index, "mediaName", val.substring(val.lastIndexOf("/") + 1));
                                  }
                                }}
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>

                        {step.mediaUrl && (
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <Label className="text-[9px] font-semibold text-slate-400">Media Type</Label>
                              <Select 
                                value={step.mediaType || "document"} 
                                onValueChange={(val: any) => handleUpdateStep(index, "mediaType", val)}
                              >
                                <SelectTrigger className="h-8 rounded-lg text-xs bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="text-xs">
                                  <SelectItem value="image">📸 Image</SelectItem>
                                  <SelectItem value="video">🎥 Video</SelectItem>
                                  <SelectItem value="document">📄 Document</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[9px] font-semibold text-slate-400">
                                {step.mediaType === "document" ? "Filename" : "Caption (Optional)"}
                              </Label>
                              <Input 
                                value={step.mediaName || ""}
                                onChange={(e) => handleUpdateStep(index, "mediaName", e.target.value)}
                                placeholder={step.mediaType === "document" ? "invoice.pdf" : "Optional caption text..."}
                                className="rounded-lg h-8 bg-white text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 mt-6 shrink-0">
              <Button type="button" variant="outline" onClick={() => setView("list")} className="h-9 text-xs font-medium cursor-pointer">
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleSaveSteps}
                disabled={saveStepsMutation.isPending}
                className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Save Step Sequence
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
