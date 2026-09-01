/**
 * ============================================================
 * © 2026 LINALA — WhatsApp CRM & Marketing Platform
 * ============================================================
 */

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Trash2,
  Play,
  Pause,
  Plus,
  FileText,
  AlertCircle,
  X,
  RefreshCw,
  Send,
} from "lucide-react";
import { type Contact } from "./types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TemplatePickerDialog } from "@/components/shared/TemplatePickerDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function parsePlaceholders(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\{\{\s*([a-zA-Z0-9_\u0080-\uFFFF\s-]+?)\s*\}\}/g);
  if (!matches) return [];
  const unique = new Set(matches.map(m => m.replace(/\{\{\s*|\s*\}\}/g, "").trim()));
  return Array.from(unique);
}

interface ContactCampaignsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  activeChannel: any;
}

export function ContactCampaignsDialog({
  open,
  onOpenChange,
  contact,
  activeChannel,
}: ContactCampaignsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [messageType, setMessageType] = useState<"custom" | "template">("custom");
  const [customMessage, setCustomMessage] = useState("");
  const [frequency, setFrequency] = useState("yearly");
  const [scheduledDate, setScheduledDate] = useState("");

  // Media / Image States
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaName, setMediaName] = useState<string | null>(null);
  const [mediaMimeType, setMediaMimeType] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Template States
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [selectedContentTemplateId, setSelectedContentTemplateId] = useState<string>("");
  const [contactVariablesInput, setContactVariablesInput] = useState<Record<string, string>>({});

  // WhatsApp Official Template state
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateVariables, setTemplateVariables] = useState<any[]>([]);
  const [headerMediaId, setHeaderMediaId] = useState<string | undefined>(undefined);

  // Fetch custom campaign templates
  // Fetch custom campaign templates
  const { data: campaignTemplates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ["/api/contacts/campaign-templates", contact?.channelId],
    queryFn: async () => {
      let channelId = contact?.channelId;
      if (!channelId) {
        channelId = activeChannel?.id;
      }
      if (!channelId) {
        try {
          const chanRes = await fetch("/api/channels/active");
          if (chanRes.ok) {
            const chanData = await chanRes.json();
            channelId = chanData?.id;
          }
        } catch (e) {
          console.error("Error fetching active channel fallback:", e);
        }
      }
      if (!channelId) return [];
      const res = await apiRequest("GET", `/api/contacts/campaign-templates?channelId=${channelId}`);
      return res.json();
    },
    enabled: open,
  });

  // Fetch campaigns for this contact
  const { data: campaigns = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/contacts", contact?.id, "campaigns"],
    queryFn: async () => {
      if (!contact?.id) return [];
      const res = await fetch(`/api/contacts/${contact.id}/campaigns`);
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
    enabled: !!contact?.id && open,
  });

  // Fetch custom contact variables
  const { data: customVariables = [] } = useQuery<string[]>({
    queryKey: ["/api/contacts/custom-variables"],
    queryFn: async () => {
      const response = await fetch("/api/contacts/custom-variables");
      if (!response.ok) return [];
      return response.json();
    },
    enabled: open,
  });

  // Parse dynamic variables from customMessage in real-time
  const parsedVariables = useMemo(() => {
    return parsePlaceholders(customMessage);
  }, [customMessage]);

  // Sync / Pre-populate placeholder variables inputs for the current contact
  useEffect(() => {
    if (!contact) return;
    const initial: Record<string, string> = {};
    parsedVariables.forEach(v => {
      const lower = v.toLowerCase();
      if (lower === "name") {
        initial[v] = contact.name || "";
      } else if (lower === "phone") {
        initial[v] = contact.phone || "";
      } else if (contact.variables && typeof contact.variables === "object") {
        initial[v] = (contact.variables as Record<string, string>)[v] || "";
      }
    });
    setContactVariablesInput(prev => {
      const updated = { ...initial };
      Object.keys(prev).forEach(k => {
        if (prev[k] !== undefined && prev[k] !== "") {
          updated[k] = prev[k];
        }
      });
      return updated;
    });
  }, [parsedVariables, contact]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/contacts/${contact?.id}/campaigns`, data);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Campaign scheduled",
        description: "The recurring campaign has been created successfully.",
      });
      // Invalidate contacts queries to refresh columns in table
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/campaign-templates", contact?.channelId] });
      refetchTemplates();
      refetch();
      resetForm();
    },
    onError: (err: any) => {
      toast({
        title: "Failed to schedule campaign",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    },
  });

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/contacts/campaigns/${id}`, { status });
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "The campaign status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/contacts"] });
      refetch();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/contacts/campaigns/${id}`);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Campaign deleted",
        description: "The recurring campaign was deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/contacts"] });
      refetch();
    },
  });

  // Send Now mutation
  const sendNowMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/contacts/campaigns/${id}/send-now`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Message Queued",
        description: data.message || "Recurring message queued for immediate dispatch.",
      });
      refetch();
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Send",
        description: err.message || "Could not queue campaign message.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setIsCreating(false);
    setName("");
    setMessageType("custom");
    setCustomMessage("");
    setFrequency("yearly");
    setScheduledDate("");
    setMediaUrl(null);
    setMediaName(null);
    setMediaMimeType(null);
    setIsUploading(false);
    setSaveAsTemplate(false);
    setTemplateNameInput("");
    setSelectedContentTemplateId("");
    setContactVariablesInput({});
    setSelectedTemplate(null);
    setTemplateVariables([]);
    setHeaderMediaId(undefined);
  };

  const handleSelectTemplate = (
    template: any,
    variables: { type?: string; value?: string }[],
    mediaId?: string
  ) => {
    setSelectedTemplate(template);
    // Format variableMapping as a dictionary object
    const variableDict: Record<string, any> = {};
    variables.forEach((v, index) => {
      variableDict[(index + 1).toString()] = {
        type: v.type || "custom",
        value: v.value || "",
      };
    });
    setTemplateVariables(variables);
    setHeaderMediaId(mediaId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const foundTemplate = campaignTemplates.find((t: any) => t.id === selectedContentTemplateId);
    const campaignName = foundTemplate ? foundTemplate.name : name;

    if (!selectedContentTemplateId && !name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!scheduledDate) {
      toast({ title: "Start date is required", variant: "destructive" });
      return;
    }

    const payload: any = {
      name: campaignName,
      frequency,
      scheduledDate: new Date(scheduledDate).toISOString(),
      saveAsTemplate,
      templateName: saveAsTemplate ? (templateNameInput.trim() || name) : undefined,
      mediaUrl,
      mediaMimeType,
      mediaName,
      contactVariables: contactVariablesInput,
    };

    if (!customMessage.trim()) {
      toast({ title: "Message body is required", variant: "destructive" });
      return;
    }
    payload.customMessage = customMessage;

    createMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetForm(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 rounded-xl border border-gray-100 shadow-2xl bg-white/95 backdrop-blur-md">
        <DialogHeader className="border-b border-gray-100 pb-4">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
            Recurring Campaigns for {contact?.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Set up automatic renewal alerts or repeated messages (every day, month, 6 months, or year) targeting this customer directly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {isCreating ? (
            <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-200/50">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-gray-800">Schedule Recurring Message</h4>
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="h-8 px-2 text-gray-500 hover:text-gray-700">
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </div>

              <div className="space-y-4 text-left">
                {/* Template Selection Dropdown (Always visible at the top) */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Load Saved Campaign Template (Optional)</label>
                  <select
                    value={selectedContentTemplateId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedContentTemplateId(val);
                      const found = campaignTemplates.find((t: any) => t.id === val);
                      if (found) {
                        setCustomMessage(found.customMessage || "");
                        setMediaUrl(found.mediaUrl || null);
                        setMediaName(found.mediaName || null);
                        setMediaMimeType(found.mediaMimeType || null);
                      } else {
                        setCustomMessage("");
                        setMediaUrl(null);
                        setMediaName(null);
                        setMediaMimeType(null);
                      }
                    }}
                    className="w-full bg-white border border-gray-300 focus:border-blue-500 rounded-lg text-xs font-medium h-10 px-3 cursor-pointer"
                  >
                    <option value="">-- Load from Saved Template --</option>
                    {campaignTemplates.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedContentTemplateId ? (
                  /* Template Preview Card when loaded */
                  <div className="p-4 bg-white border border-gray-350 rounded-lg space-y-2.5 shadow-sm">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Template Preview Details</span>
                    <div className="bg-gray-50 p-3 rounded border border-gray-300 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {customMessage || <em className="text-gray-400">No message content text.</em>}
                    </div>
                    {mediaUrl && (
                      <div className="mt-2 border border-gray-350 rounded bg-white p-2 inline-block">
                        <img src={mediaUrl} alt="Template Media" className="max-h-40 rounded object-contain" />
                        <span className="text-[10px] text-gray-500 block mt-1.5 truncate max-w-[250px] font-semibold">{mediaName || "Image Attachment"}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Editor Fields shown only when creating new/custom */
                  <>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Campaign Name</label>
                      <Input
                        placeholder="e.g. Insurance Renewal Alert"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="bg-white border-gray-300 focus:border-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Message Content</label>
                      <Textarea
                        placeholder="Write the message text to be sent..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={4}
                        className="bg-white border-gray-300 focus:border-blue-500 resize-none font-medium mb-1.5"
                      />
                    </div>

                    {/* Variables Usage Label Guide */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-left text-[11px] text-blue-800 space-y-1 mb-2">
                      <span className="font-semibold block">💡 Variables Usage Guide:</span>
                      <p className="leading-relaxed">
                        Type double curly braces in your message content to insert dynamic parameters. Default variables (`name`, `phone`) pre-populate automatically:
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1 font-mono text-[10px]">
                        <code className="bg-blue-100 px-1 py-0.5 rounded">{"{{name}}"}</code> (Full Name)
                        <code className="bg-blue-100 px-1 py-0.5 rounded">{"{{phone}}"}</code> (Phone Number)
                        {customVariables.map((cVar: string) => (
                          <code key={cVar} className="bg-blue-100 px-1 py-0.5 rounded">{"{{" + cVar + "}}"}</code>
                        ))}
                      </div>
                    </div>

                    {/* Image Attachment (Optional) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600 block">Attached Image (Optional)</label>
                      {mediaUrl ? (
                        <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <img src={mediaUrl} alt="Preview" className="w-10 h-10 object-cover rounded border border-gray-250" />
                            <span className="text-xs font-semibold text-gray-700 truncate max-w-[200px]">{mediaName || "Attached Image"}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMediaUrl(null);
                              setMediaName(null);
                              setMediaMimeType(null);
                            }}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative border border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsUploading(true);
                              try {
                                const formData = new FormData();
                                formData.append("file", file);
                                const res = await fetch("/api/media/upload", {
                                                      method: "POST",
                                                      body: formData,
                                });
                                if (!res.ok) throw new Error("Upload failed");
                                const data = await res.json();
                                setMediaUrl(data.url);
                                setMediaName(data.name);
                                setMediaMimeType(data.mimeType);
                                toast({ title: "Image uploaded successfully" });
                              } catch (err: any) {
                                toast({ title: "Image upload failed", description: err.message, variant: "destructive" });
                              } finally {
                                setIsUploading(false);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={isUploading}
                          />
                          <p className="text-xs text-gray-500">
                            {isUploading ? "Uploading image..." : "Click or drag image file here to attach"}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Frequency</label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger className="bg-white border-gray-300 font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everyday">Every Day</SelectItem>
                        <SelectItem value="monthly">Every Month</SelectItem>
                        <SelectItem value="6months">Every 6 Months</SelectItem>
                        <SelectItem value="yearly">Every Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">First Scheduled Date</label>
                    <Input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                      className="bg-white border-gray-300 focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>


                {/* Template Variable Settings (Asked when variables exist in the loaded message) */}
                {parsedVariables.length > 0 && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-300">
                    <span className="text-xs font-bold text-gray-700 block mb-1">
                      Configure Campaign Content Variables ({parsedVariables.length})
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {parsedVariables.map((v) => (
                        <div key={v} className="space-y-1">
                          <label className="text-xs font-semibold text-gray-600 block capitalize">
                            {v}
                          </label>
                          <Input
                            placeholder={`Value for {{${v}}}`}
                            value={contactVariablesInput[v] || ""}
                            onChange={(e) => {
                              setContactVariablesInput(prev => ({
                                ...prev,
                                [v]: e.target.value
                              }));
                            }}
                            className="bg-white border-gray-300 focus:border-blue-500 font-medium text-xs h-9"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save As Content Template Section */}
                {!selectedContentTemplateId && (
                  <div className="space-y-2 p-3 bg-blue-50 border border-blue-250 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="saveAsTemplate"
                        checked={saveAsTemplate}
                        onChange={(e) => setSaveAsTemplate(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="saveAsTemplate" className="text-xs font-semibold text-gray-700 cursor-pointer">
                        Save this message content as a template for future use
                      </label>
                    </div>
                    {saveAsTemplate && (
                      <div className="mt-2">
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Template Name</label>
                        <Input
                          placeholder="e.g. Followup Template"
                          value={templateNameInput}
                          onChange={(e) => setTemplateNameInput(e.target.value)}
                          className="bg-white border-gray-300 focus:border-blue-500 font-medium text-xs h-9"
                          required
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                  {createMutation.isPending ? "Scheduling..." : "Create Campaign"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-gray-800">Active Schedules</h4>
              <Button onClick={() => setIsCreating(true)} disabled={!activeChannel} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-9">
                <Plus className="w-4 h-4" /> Add Campaign
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
              <p className="text-xs text-gray-500">Loading schedules...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
              <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">No active recurring campaigns</p>
              <p className="text-xs text-gray-400 mt-1">Schedule automatic renewal alerts or recurring messages for this customer.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((cc: any) => (
                <div key={cc.id} className="p-4 bg-white border border-gray-150 rounded-xl hover:shadow-sm transition-shadow flex items-start justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{cc.name}</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] uppercase font-bold py-0.5 px-2 ${
                          cc.status === "active" ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {cc.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        Frequency: <span className="font-semibold text-gray-700 capitalize">{cc.frequency}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        Next run:{" "}
                        <span className="font-semibold text-gray-700">
                          {new Date(cc.nextSendAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                    </div>

                    <div className="text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100 max-w-md mt-2">
                      {cc.templateName ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                            <FileText className="w-3.5 h-3.5" />
                            Template: {cc.templateName}
                          </div>
                          {cc.variableMapping && typeof cc.variableMapping === "object" && Object.keys(cc.variableMapping).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 border-t border-gray-250 pt-1.5">
                              {Object.entries(cc.variableMapping).map(([key, val]: [string, any]) => {
                                if (key === "uploadedMediaId" || key === "headerType") return null;
                                let displayVal = "";
                                if (val.type === "fullName") displayVal = "Full Name";
                                else if (val.type === "firstName") displayVal = "First Name";
                                else if (val.type === "phone") displayVal = "Phone";
                                else if (val.type === "custom") displayVal = `"${val.value}"`;
                                else displayVal = val.type;
                                return (
                                  <Badge key={key} variant="outline" className="text-[9px] px-1 bg-white text-gray-500 border-gray-150 py-0.5 leading-none">
                                    {"{{" + key + "}}"}: {displayVal}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-600 italic line-clamp-2">"{cc.customMessage}"</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1 items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      onClick={() => sendNowMutation.mutate(cc.id)}
                      disabled={sendNowMutation.isPending}
                      title="Send / Retry Now"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        toggleMutation.mutate({
                          id: cc.id,
                          status: cc.status === "active" ? "paused" : "active",
                        })
                      }
                      title={cc.status === "active" ? "Pause Campaign" : "Resume Campaign"}
                    >
                      {cc.status === "active" ? <Pause className="w-4 h-4 text-amber-600" /> : <Play className="w-4 h-4 text-green-600" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this scheduled campaign?")) {
                          deleteMutation.mutate(cc.id);
                        }
                      }}
                      title="Delete Schedule"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
