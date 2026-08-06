/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Plus,
  X,
  Users,
  ImageIcon,
  Video,
  FileAudio,
  FileIcon,
  Settings2,
  MessageCircle,
  HelpCircle,
  GitBranch,
  Clock,
  FileText,
  Globe,
  Database,
  CircleStop,
  UserPlus,
  UserCog,
  UserX,
  Variable,
  MapPin,
  List,
  Paperclip,
  CheckCheck,
  MessageSquare,
  Brain,
  Bot,
  Calendar,
  Shuffle,
  CreditCard,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { BuilderNodeData, NodeKind, Template, Member, ListSection } from "./types";
import { FileUploadButton } from "./FileUploadButton";
import { MediaGalleryDialog } from "@/components/media/MediaGalleryDialog";
import { uid } from "./utils";
import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Upload, Link as LinkIcon, Loader2 } from "lucide-react";

interface ConfigPanelProps {
  selected: Node<BuilderNodeData> | null;
  onChange: (patch: Partial<BuilderNodeData>) => void;
  onDelete: () => void;
  templates: Template[];
  members: Member[];
  channelId?: string;
  isQrChannel?: boolean;
}

const kindMeta: Record<NodeKind, { icon: any; label: string; color: string; bgTint: string }> = {
  start: { icon: Settings2, label: "Start", color: "text-green-600", bgTint: "bg-green-50" },
  conditions: { icon: GitBranch, label: "Condition", color: "text-purple-600", bgTint: "bg-purple-50" },
  custom_reply: { icon: MessageCircle, label: "Send Message", color: "text-blue-600", bgTint: "bg-blue-50" },
  user_reply: { icon: HelpCircle, label: "Ask Question", color: "text-amber-600", bgTint: "bg-amber-50" },
  time_gap: { icon: Clock, label: "Wait / Delay", color: "text-slate-600", bgTint: "bg-slate-50" },
  scheduler: { icon: Calendar, label: "Scheduler", color: "text-rose-600", bgTint: "bg-rose-50" },
  send_template: { icon: FileText, label: "Send Template", color: "text-teal-600", bgTint: "bg-teal-50" },
  assign_user: { icon: Users, label: "Assign Agent", color: "text-indigo-600", bgTint: "bg-indigo-50" },
  route_crm_round_robin: { icon: Shuffle, label: "CRM Round Robin", color: "text-indigo-600", bgTint: "bg-indigo-50" },
  webhook: { icon: Globe, label: "Webhook", color: "text-orange-600", bgTint: "bg-orange-50" },
  mysql: { icon: Database, label: "MySQL Query", color: "text-teal-600", bgTint: "bg-teal-50" },
  end: { icon: CircleStop, label: "End", color: "text-red-600", bgTint: "bg-red-50" },
  add_to_group: { icon: UserPlus, label: "Add to Group", color: "text-emerald-600", bgTint: "bg-emerald-50" },
  update_contact: { icon: UserCog, label: "Update Contact", color: "text-cyan-600", bgTint: "bg-cyan-50" },
  delete_contact: { icon: UserX, label: "Delete Contact", color: "text-rose-600", bgTint: "bg-rose-50" },
  set_variable: { icon: Variable, label: "Set Variable", color: "text-violet-600", bgTint: "bg-violet-50" },
  send_location: { icon: MapPin, label: "Send Location", color: "text-rose-600", bgTint: "bg-rose-50" },
  send_list_message: { icon: List, label: "List Message", color: "text-sky-600", bgTint: "bg-sky-50" },
  send_media: { icon: Paperclip, label: "Send Media", color: "text-pink-600", bgTint: "bg-pink-50" },
  mark_as_read: { icon: CheckCheck, label: "Mark as Read", color: "text-lime-600", bgTint: "bg-lime-50" },
  wait_read: { icon: CheckCheck, label: "Wait for Read", color: "text-blue-600", bgTint: "bg-blue-50" },
  wait_reply: { icon: MessageSquare, label: "Wait for Reply", color: "text-amber-600", bgTint: "bg-amber-50" },
  ai_answer: { icon: Brain, label: "AI Answer", color: "text-purple-600", bgTint: "bg-purple-50" },
  ai_agent: { icon: Bot, label: "AI Agent", color: "text-fuchsia-600", bgTint: "bg-fuchsia-50" },
  send_contact_message: { icon: Users, label: "Send to Contacts", color: "text-indigo-600", bgTint: "bg-indigo-50" },
  razorpay_generate: { icon: CreditCard, label: "RZP Generate", color: "text-blue-600", bgTint: "bg-blue-50" },
  razorpay_verify: { icon: ShieldCheck, label: "RZP Verify", color: "text-emerald-600", bgTint: "bg-emerald-50" },
  instamojo_payment: { icon: CreditCard, label: "Instamojo Pay", color: "text-purple-600", bgTint: "bg-purple-50" },
  zapier: { icon: Zap, label: "Zapier", color: "text-orange-600", bgTint: "bg-orange-50" },
  tap_payment: { icon: CreditCard, label: "Tap Payment", color: "text-rose-600", bgTint: "bg-rose-50" },
  noon_payment: { icon: CreditCard, label: "Noon Pay", color: "text-yellow-600", bgTint: "bg-yellow-50" },
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mt-1">{children}</div>
  );
}

export function ConfigPanel({
  selected,
  onChange,
  onDelete,
  templates,
  members,
  channelId,
  isQrChannel,
}: ConfigPanelProps) {
  const [templateMeta, setTemplateMeta] = useState<any>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [localHeaders, setLocalHeaders] = useState<{ id: string; key: string; value: string }[]>([]);
  const { toast } = useToast();
  const [searchContactQuery, setSearchContactQuery] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ["/api/contacts-all", channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const res = await apiRequest("GET", `/api/contacts-all?channelId=${channelId}`);
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!channelId,
  });

  const { data: userChannels = [] } = useQuery({
    queryKey: ["/api/channels"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/channels");
      if (!res.ok) return [];
      return await res.json();
    },
  });

  const { data: voiceProfiles = [] } = useQuery<any[]>({
    queryKey: ["/api/voice-profiles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/voice-profiles");
      if (!res.ok) return [];
      return await res.json();
    },
  });

  const { data: pipelines = [] } = useQuery<any[]>({
    queryKey: ["/api/crm/pipelines", channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const res = await apiRequest("GET", `/api/crm/pipelines?channelId=${channelId}`);
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!channelId,
  });

  const selectedPipelineId = selected?.data?.crmPipelineId || (pipelines.length > 0 ? pipelines[0].id : "");

  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ["/api/crm/stages", selectedPipelineId],
    queryFn: async () => {
      if (!selectedPipelineId || selectedPipelineId === "default") return [];
      const res = await apiRequest("GET", `/api/crm/stages?pipelineId=${selectedPipelineId}`);
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!selectedPipelineId && selectedPipelineId !== "default",
  });

  const contactsList = Array.isArray(contacts)
    ? contacts
    : (contacts as any)?.data && Array.isArray((contacts as any).data)
      ? (contacts as any).data
      : [];

  const channelsList = Array.isArray(userChannels)
    ? userChannels
    : (userChannels as any)?.data && Array.isArray((userChannels as any).data)
      ? (userChannels as any).data
      : [];

  useEffect(() => {
    setTemplateMeta(null);
    if (selected) {
      const headersObj = (selected.data.webhookHeaders as Record<string, string>) || {};
      const array = Object.entries(headersObj).map(([k, v], idx) => ({
        id: `${selected.id}-header-${idx}`,
        key: k,
        value: v,
      }));
      setLocalHeaders(array);

      if (selected.data.kind === "send_template" && selected.data.templateId && templates && channelId) {
        const template = templates.find((t) => t.id === selected.data.templateId);
        if (template?.whatsappTemplateId) {
          fetch(`/api/whatsapp/templates/${template.whatsappTemplateId}/meta?channelId=${channelId}`)
            .then((res) => res.ok ? res.json() : null)
            .then((meta) => {
              if (meta) setTemplateMeta(meta);
            })
            .catch((err) => console.error("Failed to fetch template meta on select:", err));
        }
      }
    } else {
      setLocalHeaders([]);
    }
  }, [selected?.id, templates, channelId]);

  const syncHeaders = useCallback((newHeaders: { id: string; key: string; value: string }[]) => {
    setLocalHeaders(newHeaders);
    const record: Record<string, string> = {};
    for (const h of newHeaders) {
      if (h.key.trim()) {
        record[h.key] = h.value;
      }
    }
    onChange({ webhookHeaders: record });
  }, [onChange]);

  const addHeader = useCallback(() => {
    const newHeaders = [...localHeaders, { id: uid(), key: "", value: "" }];
    syncHeaders(newHeaders);
  }, [localHeaders, syncHeaders]);

  const updateHeader = useCallback((id: string, field: "key" | "value", val: string) => {
    const newHeaders = localHeaders.map((h) => (h.id === id ? { ...h, [field]: val } : h));
    syncHeaders(newHeaders);
  }, [localHeaders, syncHeaders]);

  const removeHeader = useCallback((id: string) => {
    const newHeaders = localHeaders.filter((h) => h.id !== id);
    syncHeaders(newHeaders);
  }, [localHeaders, syncHeaders]);

  const { data: contactGroups = [] } = useQuery({
    queryKey: ["/api/groups", channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const res = await apiRequest("GET", `/api/groups?channelId=${channelId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data?.groups || data?.data || [];
    },
    enabled: !!channelId,
  });

  const bodyVarsArray: string[] = (() => {
    if (!templateMeta) return [];
    if (Array.isArray(templateMeta.bodyVariables)) return templateMeta.bodyVariables;
    if (typeof templateMeta.bodyVariables === "number" && templateMeta.bodyVariables > 0) {
      return Array.from({ length: templateMeta.bodyVariables }, (_, i) => `{{${i + 1}}}`);
    }
    return [];
  })();

  if (!selected || selected.data.kind === "start") {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
          <Settings2 className="w-5 h-5 text-gray-400" />
        </div>
        <div className="font-medium text-sm text-gray-700">Node Properties</div>
        <div className="text-xs text-gray-400 mt-1">Click any node on the canvas to edit its settings</div>
      </div>
    );
  }

  const d = selected.data;
  const meta = kindMeta[d.kind] || kindMeta.start;
  const Icon = meta.icon;

  const handleFileUpload = (type: "image" | "video" | "audio" | "document") => (file: File) => {
    const maxSizes: Record<string, number> = {
      image: 40 * 1024 * 1024,      // 40MB
      video: 40 * 1024 * 1024,     // 40MB
      audio: 40 * 1024 * 1024,     // 40MB
      document: 100 * 1024 * 1024, // 100MB
    };
    const maxSize = maxSizes[type];
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast({
        title: "File too large",
        description: `The maximum file size allowed for ${type} is ${maxSizeMB}MB. Selected file is ${fileSizeMB}MB.`,
        variant: "destructive",
      });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    onChange({ [`${type}File`]: file, [`${type}Preview`]: previewUrl } as any);
  };

  const removeFile = (type: "image" | "video" | "audio" | "document") => () => {
    onChange({ [`${type}File`]: null, [`${type}Preview`]: null } as any);
  };

  const addButton = () => {
    onChange({ buttons: [...(d.buttons || []), { id: uid(), text: "New Button", action: "next" as const }] });
  };

  const updateButton = (buttonId: string, updates: Partial<NonNullable<typeof d.buttons>[0]>) => {
    onChange({ buttons: (d.buttons || []).map((btn) => (btn.id === buttonId ? { ...btn, ...updates } : btn)) });
  };

  const removeButton = (buttonId: string) => {
    onChange({ buttons: (d.buttons || []).filter((btn) => btn.id !== buttonId) });
  };

  const addKeyword = () => {
    onChange({ keywords: [...(d.keywords || []), ""] });
  };

  const updateKeyword = (index: number, value: string) => {
    const updated = [...(d.keywords || [])];
    updated[index] = value;
    onChange({ keywords: updated });
  };

  const removeKeyword = (index: number) => {
    onChange({ keywords: (d.keywords || []).filter((_, i) => i !== index) });
  };

  const addListSection = () => {
    const sections = [...(d.listSections || [])];
    sections.push({ title: `Section ${sections.length + 1}`, rows: [{ id: uid(), title: "Item 1", description: "" }] });
    onChange({ listSections: sections });
  };

  const updateListSection = (sectionIdx: number, title: string) => {
    const sections = [...(d.listSections || [])];
    sections[sectionIdx] = { ...sections[sectionIdx], title };
    onChange({ listSections: sections });
  };

  const removeListSection = (sectionIdx: number) => {
    onChange({ listSections: (d.listSections || []).filter((_, i) => i !== sectionIdx) });
  };

  const addListRow = (sectionIdx: number) => {
    const sections = [...(d.listSections || [])];
    sections[sectionIdx] = {
      ...sections[sectionIdx],
      rows: [...sections[sectionIdx].rows, { id: uid(), title: "", description: "" }],
    };
    onChange({ listSections: sections });
  };

  const updateListRow = (sectionIdx: number, rowIdx: number, updates: Partial<ListSection["rows"][0]>) => {
    const sections = [...(d.listSections || [])];
    const rows = [...sections[sectionIdx].rows];
    rows[rowIdx] = { ...rows[rowIdx], ...updates };
    sections[sectionIdx] = { ...sections[sectionIdx], rows };
    onChange({ listSections: sections });
  };

  const removeListRow = (sectionIdx: number, rowIdx: number) => {
    const sections = [...(d.listSections || [])];
    sections[sectionIdx] = {
      ...sections[sectionIdx],
      rows: sections[sectionIdx].rows.filter((_, i) => i !== rowIdx),
    };
    onChange({ listSections: sections });
  };

  const selectedTemplate = templates.find((t) => t.id === selected?.data?.templateId);
  const sampleVars: string[] = Array.isArray(selectedTemplate?.variables) ? selectedTemplate.variables : [];

  return (
    <div className="flex flex-col h-full bg-white">
      <div className={`px-4 py-3 ${meta.bgTint} border-b border-gray-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${meta.bgTint} flex items-center justify-center border border-gray-200`}>
              <Icon className={`w-4 h-4 ${meta.color}`} />
            </div>
            <div>
              <div className="font-semibold text-sm text-gray-900">{meta.label}</div>
              <div className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]">{selected.id}</div>
            </div>
          </div>
          {d.kind !== "start" && (
            <Button size="sm" variant="ghost" onClick={onDelete} className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">

          {d.kind === "conditions" && (
            <>
              <SectionHeader>Condition Settings</SectionHeader>
              <div className="space-y-3 bg-purple-50/50 rounded-xl p-4 border border-purple-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Condition Type</Label>
                  <Select value={d.conditionType || "keyword"} onValueChange={(v) => onChange({ conditionType: v as any })}>
                    <SelectTrigger className="h-9 text-sm bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keyword">Contains Keywords</SelectItem>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="starts_with">Starts With</SelectItem>
                      <SelectItem value="contains">Contains Text</SelectItem>
                      <SelectItem value="variable">Evaluate Variable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {d.conditionType !== "variable" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Match Type</Label>
                    <Select value={d.matchType || "any"} onValueChange={(v) => onChange({ matchType: v as any })}>
                      <SelectTrigger className="h-9 text-sm bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Match Any</SelectItem>
                        <SelectItem value="all">Match All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {d.conditionType === "variable" ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">Variable Condition Expression</Label>
                  <Input
                    value={(d.keywords || [])[0] || ""}
                    onChange={(e) => {
                      const updated = [...(d.keywords || [])];
                      updated[0] = e.target.value;
                      onChange({ keywords: updated });
                    }}
                    placeholder="e.g. {{_lastWebhookStatus}} === 200"
                    className="h-9 text-sm rounded-lg"
                  />
                  <div className="text-[10px] text-gray-400 leading-relaxed mt-1">
                    Enter an expression to evaluate. Supported operators:
                    <code className="bg-gray-100 px-1 rounded mx-0.5 font-mono">===</code>,
                    <code className="bg-gray-100 px-1 rounded mx-0.5 font-mono">!==</code>,
                    and <code className="bg-gray-100 px-1 rounded mx-0.5 font-mono">contains</code>.<br />
                    Example: <code className="bg-gray-100 px-1 rounded font-mono">{"{{_lastWebhookStatus}} === 200"}</code><br />
                    Example: <code className="bg-gray-100 px-1 rounded font-mono">{"{{_lastWebhookResponse.status}} === success"}</code>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-gray-700">Keywords</Label>
                    <Button size="sm" variant="outline" onClick={addKeyword} className="h-7 text-[10px] font-semibold rounded-lg">
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  {(d.keywords || []).map((kw, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={kw} onChange={(e) => updateKeyword(i, e.target.value)} placeholder={`Keyword ${i + 1}`} className="h-8 text-sm rounded-lg" />
                      <Button size="sm" variant="ghost" onClick={() => removeKeyword(i)} className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {(!d.keywords || d.keywords.length === 0) && (
                    <div className="text-xs text-gray-400 italic py-3 text-center bg-gray-50 rounded-lg">No keywords added yet</div>
                  )}
                </div>
              )}
            </>
          )}

          {d.kind === "custom_reply" && (
            <>
              <SectionHeader>Message Content</SectionHeader>
              <div className="space-y-3 bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Message Text</Label>
                  <Textarea rows={4} value={d.message || ""} onChange={(e) => onChange({ message: e.target.value })} placeholder="Type your message..." className="text-sm resize-none rounded-lg bg-white" />
                </div>
              </div>

              <SectionHeader>Attachments</SectionHeader>
              <div className="grid grid-cols-2 gap-2">
                <FileUploadButton accept="image/*" onUpload={handleFileUpload("image")}>
                  <ImageIcon className="w-3.5 h-3.5" /> Image
                </FileUploadButton>
                <FileUploadButton accept="video/*" onUpload={handleFileUpload("video")}>
                  <Video className="w-3.5 h-3.5" /> Video
                </FileUploadButton>
                <FileUploadButton accept="audio/*" onUpload={handleFileUpload("audio")}>
                  <FileAudio className="w-3.5 h-3.5" /> Audio
                </FileUploadButton>
                <FileUploadButton accept=".pdf,.doc,.docx,.txt" onUpload={handleFileUpload("document")}>
                  <FileIcon className="w-3.5 h-3.5" /> Document
                </FileUploadButton>
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                Image: max 5MB | Video/Audio: max 16MB | Doc: max 100MB
              </div>
              {d.imagePreview && (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <img src={d.imagePreview} alt="preview" className="w-full h-28 object-cover" />
                  <button onClick={removeFile("image")} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {d.videoPreview && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <Video className="w-4 h-4 text-blue-500" />
                  <span className="text-xs flex-1 font-medium text-blue-700">Video attached</span>
                  <button onClick={removeFile("video")} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              )}
              {d.audioPreview && (
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <FileAudio className="w-4 h-4 text-purple-500" />
                  <span className="text-xs flex-1 font-medium text-purple-700">Audio attached</span>
                  <button onClick={removeFile("audio")} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              )}
              {d.documentPreview && (
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <FileIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-xs flex-1 font-medium text-gray-700">Document attached</span>
                  <button onClick={removeFile("document")} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              )}

              {!isQrChannel && (
                <>
                  <SectionHeader>Quick Reply Buttons</SectionHeader>
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={addButton} className="h-7 text-[10px] font-semibold rounded-lg">
                        <Plus className="w-3 h-3 mr-1" /> Add Button
                      </Button>
                    </div>
                    {d.buttons?.map((btn) => (
                      <div key={btn.id} className="flex items-center gap-2">
                        <Input value={btn.text} onChange={(e) => updateButton(btn.id, { text: e.target.value })} className="h-8 text-sm rounded-lg" />
                        <Button size="sm" variant="ghost" onClick={() => removeButton(btn.id)} className="h-8 w-8 p-0 text-red-400 rounded-lg">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {d.kind === "user_reply" && (
            <>
              <SectionHeader>Question Settings</SectionHeader>
              <div className="space-y-3 bg-amber-50/50 rounded-xl p-4 border border-amber-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Question Text</Label>
                  <Textarea rows={3} value={d.question || ""} onChange={(e) => onChange({ question: e.target.value })} placeholder="Enter question to ask..." className="text-sm resize-none rounded-lg bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save As Variable</Label>
                  <Input value={d.saveAs || ""} onChange={(e) => onChange({ saveAs: e.target.value })} placeholder="e.g., transfer_consent" className="h-8 text-sm font-mono rounded-lg bg-white" />
                  <div className="text-[10px] text-gray-400">Use lowercase with underscores</div>
                </div>
              </div>

              {!isQrChannel && (
                <>
                  <SectionHeader>Answer Options</SectionHeader>
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={addButton} className="h-7 text-[10px] font-semibold rounded-lg">
                        <Plus className="w-3 h-3 mr-1" /> Add Option
                      </Button>
                    </div>
                    {d.buttons?.map((btn) => (
                      <div key={btn.id} className="flex items-center gap-2">
                        <Input value={btn.text} onChange={(e) => updateButton(btn.id, { text: e.target.value })} className="h-8 text-sm rounded-lg" />
                        <Button size="sm" variant="ghost" onClick={() => removeButton(btn.id)} className="h-8 w-8 p-0 text-red-400 rounded-lg">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {d.kind === "time_gap" && (
            <>
              <SectionHeader>Delay Settings</SectionHeader>
              <div className="space-y-3 bg-slate-50/80 rounded-xl p-4 border border-slate-200">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Delay Duration (seconds)</Label>
                  <Input type="number" min={10} value={d.delay ?? 60} onChange={(e) => onChange({ delay: parseInt(e.target.value, 10) })} className="h-9 text-sm rounded-lg bg-white" />
                  <div className="text-[10px] text-gray-400">Min 10 seconds. Flow pauses before the next step.</div>
                </div>
              </div>
            </>
          )}

          {d.kind === "scheduler" && (
            <>
              <SectionHeader>Scheduler Settings</SectionHeader>
              <div className="space-y-4 bg-slate-50/80 rounded-xl p-4 border border-slate-200">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Schedule Type</Label>
                  <Select
                    value={(d.scheduleType as string) || "duration"}
                    onValueChange={(val) => onChange({ scheduleType: val })}
                  >
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="duration">After Period (Relative)</SelectItem>
                      <SelectItem value="date">Specific Date & Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {d.scheduleType === "date" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Target Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={(d.scheduleDate as string) || ""}
                      onChange={(e) => onChange({ scheduleDate: e.target.value })}
                      className="h-9 text-sm rounded-lg bg-white"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Days</Label>
                      <Input
                        type="number"
                        min={0}
                        value={d.scheduleDays !== undefined ? Number(d.scheduleDays) : 0}
                        onChange={(e) => onChange({ scheduleDays: parseInt(e.target.value, 10) || 0 })}
                        className="h-9 text-sm rounded-lg bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Minutes</Label>
                      <Input
                        type="number"
                        min={0}
                        value={d.scheduleMinutes !== undefined ? Number(d.scheduleMinutes) : 10}
                        onChange={(e) => onChange({ scheduleMinutes: parseInt(e.target.value, 10) || 0 })}
                        className="h-9 text-sm rounded-lg bg-white"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-2 border-t border-slate-200">
                  <Checkbox
                    id="scheduleRecurring"
                    checked={!!d.scheduleRecurring}
                    onCheckedChange={(checked) => onChange({ scheduleRecurring: !!checked })}
                  />
                  <Label htmlFor="scheduleRecurring" className="text-xs font-medium text-gray-700 cursor-pointer select-none">
                    Is Recurring
                  </Label>
                </div>

                {d.scheduleRecurring && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Recurring Interval</Label>
                      <Select
                        value={(d.scheduleInterval as string) || "daily"}
                        onValueChange={(val) => onChange({ scheduleInterval: val })}
                      >
                        <SelectTrigger className="h-9 text-sm bg-white rounded-lg">
                          <SelectValue placeholder="Select interval" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="scheduleRepeatTimes" className="text-xs font-semibold text-gray-700">
                        Number of Times to Repeat (1 - 10)
                      </Label>
                      <Input
                        id="scheduleRepeatTimes"
                        type="number"
                        min={1}
                        max={10}
                        value={d.scheduleRepeatTimes !== undefined ? Number(d.scheduleRepeatTimes) : 1}
                        onChange={(e) => {
                          const val = Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1));
                          onChange({ scheduleRepeatTimes: val });
                        }}
                        className="h-9 text-sm rounded-lg bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {d.kind === "send_template" && (
            <>
              <SectionHeader>Template Settings</SectionHeader>
              <div className="space-y-3 bg-teal-50/50 rounded-xl p-4 border border-teal-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Choose Template</Label>
                  <Select
                    value={d.templateId || ""}
                    onValueChange={async (templateId) => {
                      const template = templates.find((t) => t.id === templateId);
                      onChange({ templateId });
                      if (template?.whatsappTemplateId && channelId) {
                        try {
                          const res = await fetch(`/api/whatsapp/templates/${template.whatsappTemplateId}/meta?channelId=${channelId}`);
                          const meta = await res.json();
                          setTemplateMeta(meta);
                          onChange({ headerImageId: null, variableMapping: {} });
                        } catch (err) {
                          console.error("Failed to fetch template meta:", err);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg"><SelectValue placeholder="Select template" /></SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {templateMeta?.headerType === "IMAGE" && (
                <div className="space-y-2 bg-red-50/50 rounded-xl p-4 border border-red-100">
                  <Label className="text-xs font-semibold text-red-600">Header Image (Required)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    className="h-9 text-sm rounded-lg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append("mediaFile", file);
                      formData.append("templateId", d.templateId || "");
                      const res = await fetch(`/api/whatsapp/channels/${channelId}/upload-image`, { method: "POST", body: formData });
                      const data = await res.json();
                      onChange({ headerImageId: data.mediaId });
                    }}
                  />
                  {!d.headerImageId && <div className="text-[10px] text-red-500 font-medium">Required for this template</div>}
                </div>
              )}

              {bodyVarsArray.length > 0 && (
                <div className="space-y-3">
                  <SectionHeader>Variable Mapping</SectionHeader>
                  {bodyVarsArray.map((varText: string) => {
                    const index = varText.replace(/\D/g, "");
                    const sampleValue = sampleVars[Number(index) - 1];
                    return (
                      <div key={index} className="space-y-1.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <Label className="text-[11px] text-gray-500 font-semibold">{varText}</Label>
                        <Select
                          value={(d.variableMapping as any)?.[index]?.type || ""}
                          onValueChange={(type) => onChange({ variableMapping: { ...(d.variableMapping as any || {}), [index]: { type, value: "" } } })}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white rounded-lg"><SelectValue placeholder="Select source" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fullName">Full Name</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="custom">Custom Value</SelectItem>
                          </SelectContent>
                        </Select>
                        {(d.variableMapping as any)?.[index]?.type === "custom" && (
                          <Input
                            className="h-8 text-xs rounded-lg"
                            value={(d.variableMapping as any)?.[index]?.value || ""}
                            onChange={(e) => onChange({ variableMapping: { ...(d.variableMapping as any || {}), [index]: { ...(d.variableMapping as any)?.[index], value: e.target.value } } })}
                            placeholder={`Custom value for ${varText}`}
                          />
                        )}
                        {sampleValue && <p className="text-[10px] text-gray-400">Sample: <span className="font-semibold">{sampleValue}</span></p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {d.kind === "assign_user" && (
            <>
              <SectionHeader>Assignment Settings</SectionHeader>
              <div className="space-y-3 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-500" /> Select Agent
                  </Label>
                  <Select value={d.assigneeId || ""} onValueChange={(v) => onChange({ assigneeId: v })}>
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg"><SelectValue placeholder="Select agent" /></SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name || `${m.firstName || ""} ${m.lastName || ""}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {d.kind === "route_crm_round_robin" && (
            <>
              <SectionHeader>CRM Round Robin Assignment</SectionHeader>
              <div className="space-y-4 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                <p className="text-[11px] text-gray-500 leading-normal">
                  Routes this lead to a pipeline stage and automatically assigns the conversation to the next online team member in rotation.
                </p>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Select Pipeline</Label>
                  <Select 
                    value={(d.crmPipelineId as string) || (pipelines.length > 0 ? pipelines[0].id : "default")} 
                    onValueChange={(v) => onChange({ crmPipelineId: v === "default" ? "" : v, crmStageId: "" })}
                  >
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg">
                      <SelectValue placeholder="Select Pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelines.length === 0 ? (
                        <SelectItem value="default" disabled>No pipelines found</SelectItem>
                      ) : (
                        pipelines.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Select Initial Stage</Label>
                  <Select 
                    value={(d.crmStageId as string) || (stages.length > 0 ? stages[0].id : "default")} 
                    onValueChange={(v) => onChange({ crmStageId: v === "default" ? "" : v })}
                  >
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg">
                      <SelectValue placeholder="Select Stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.length === 0 ? (
                        <SelectItem value="default" disabled>No stages found</SelectItem>
                      ) : (
                        stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {d.kind === "razorpay_generate" && (
            <>
              <SectionHeader>Razorpay Credentials</SectionHeader>
              <div className="space-y-3 bg-gray-50/50 rounded-xl p-4 border border-gray-100 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Key ID (Optional if in .env)</Label>
                  <Input
                    value={d.razorpayKeyId || ""}
                    onChange={(e) => onChange({ razorpayKeyId: e.target.value })}
                    placeholder="E.g., rzp_live_xxxxxxxxxxxx"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Key Secret (Optional if in .env)</Label>
                  <Input
                    value={d.razorpayKeySecret || ""}
                    onChange={(e) => onChange({ razorpayKeySecret: e.target.value })}
                    placeholder="E.g., xxxxxxxxxxxxxxxxxxxxxxxx"
                    type="password"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
              </div>

              <SectionHeader>Execution Mode</SectionHeader>
              <div className="space-y-3 bg-blue-50/50 rounded-xl p-4 border border-blue-100 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Mode</Label>
                  <Select
                    value={d.razorpayMode || "generate_only"}
                    onValueChange={(v) => onChange({ razorpayMode: v as any })}
                  >
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generate_only">Generate Link Only</SelectItem>
                      <SelectItem value="send_and_wait">Send & Wait for Payment</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-[10px] text-gray-400">
                    {d.razorpayMode === "send_and_wait" 
                      ? "Automatically sends the payment link via WhatsApp and pauses execution until paid." 
                      : "Generates the link and saves it in a variable to let you manually design checkout routing."}
                  </div>
                </div>
              </div>

              {d.razorpayMode === "send_and_wait" && (
                <>
                  <SectionHeader>Auto Message Settings</SectionHeader>
                  <div className="space-y-3 bg-blue-50/50 rounded-xl p-4 border border-blue-100 mb-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">WhatsApp Message Template</Label>
                      <Textarea
                        value={d.razorpayMessage || ""}
                        onChange={(e) => onChange({ razorpayMessage: e.target.value })}
                        placeholder="Please pay by clicking this link: {{payment_url}}"
                        className="min-h-[80px] text-sm bg-white rounded-lg"
                      />
                      <div className="text-[10px] text-gray-400">{"Message to send automatically. You must include {{payment_url}} so the customer receives the link."}</div>
                    </div>
                  </div>
                </>
              )}

              <SectionHeader>Payment Details</SectionHeader>
              <div className="space-y-3 bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Amount</Label>
                  <Input
                    value={d.razorpayAmount || ""}
                    onChange={(e) => onChange({ razorpayAmount: e.target.value })}
                    placeholder="e.g., 499.00 or {{amount}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Specify amount. Variables like {{amount}} are supported."}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Currency</Label>
                  <Input
                    value={d.razorpayCurrency || "INR"}
                    onChange={(e) => onChange({ razorpayCurrency: e.target.value })}
                    placeholder="e.g., INR"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"E.g., INR. Variables like {{currency}} are supported."}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Description</Label>
                  <Input
                    value={d.razorpayDescription || ""}
                    onChange={(e) => onChange({ razorpayDescription: e.target.value })}
                    placeholder="e.g., Order Payment"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Payment details description. Variables like {{desc}} are supported."}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Receipt / Reference ID (Optional)</Label>
                  <Input
                    value={d.razorpayReceipt || ""}
                    onChange={(e) => onChange({ razorpayReceipt: e.target.value })}
                    placeholder="e.g., rcpt_12345 or {{receipt_id}}"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                  <div className="text-[10px] text-gray-400">{"Custom identifier. Variables like {{receipt_id}} are supported."}</div>
                </div>
              </div>

              <SectionHeader>Customer Details</SectionHeader>
              <div className="space-y-3 bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Customer Name</Label>
                  <Input
                    value={d.razorpayCustomerName || ""}
                    onChange={(e) => onChange({ razorpayCustomerName: e.target.value })}
                    placeholder="{{contact_name}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Customer's name. Variables like {{contact_name}} are supported."}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Customer Email</Label>
                  <Input
                    value={d.razorpayCustomerEmail || ""}
                    onChange={(e) => onChange({ razorpayCustomerEmail: e.target.value })}
                    placeholder="{{contact_email}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Customer's email address. Variables like {{contact_email}} are supported."}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Customer Phone</Label>
                  <Input
                    value={d.razorpayCustomerPhone || ""}
                    onChange={(e) => onChange({ razorpayCustomerPhone: e.target.value })}
                    placeholder="{{contact_phone}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Customer's contact number. Variables like {{contact_phone}} are supported."}</div>
                </div>
              </div>

              <SectionHeader>Output Variables</SectionHeader>
              <div className="space-y-3 bg-violet-50/50 rounded-xl p-4 border border-violet-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Payment URL To</Label>
                  <Input
                    value={d.razorpayVarUrl || "payment_url"}
                    onChange={(e) => onChange({ razorpayVarUrl: e.target.value })}
                    placeholder="payment_url"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Reference ID To</Label>
                  <Input
                    value={d.razorpayVarRefId || "payment_ref_id"}
                    onChange={(e) => onChange({ razorpayVarRefId: e.target.value })}
                    placeholder="payment_ref_id"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                {d.razorpayMode === "send_and_wait" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Save Status To</Label>
                      <Input
                        value={d.razorpayVarStatus || "payment_status"}
                        onChange={(e) => onChange({ razorpayVarStatus: e.target.value })}
                        placeholder="payment_status"
                        className="h-9 text-sm rounded-lg bg-white font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Save Payment ID To (Optional)</Label>
                      <Input
                        value={d.razorpayVarPaymentId || "payment_id"}
                        onChange={(e) => onChange({ razorpayVarPaymentId: e.target.value })}
                        placeholder="payment_id"
                        className="h-9 text-sm rounded-lg bg-white font-mono"
                      />
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {d.kind === "razorpay_verify" && (
            <>
              <SectionHeader>Razorpay Credentials</SectionHeader>
              <div className="space-y-3 bg-gray-50/50 rounded-xl p-4 border border-gray-100 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Key ID (Optional if in .env)</Label>
                  <Input
                    value={d.razorpayKeyId || ""}
                    onChange={(e) => onChange({ razorpayKeyId: e.target.value })}
                    placeholder="E.g., rzp_live_xxxxxxxxxxxx"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Key Secret (Optional if in .env)</Label>
                  <Input
                    value={d.razorpayKeySecret || ""}
                    onChange={(e) => onChange({ razorpayKeySecret: e.target.value })}
                    placeholder="E.g., xxxxxxxxxxxxxxxxxxxxxxxx"
                    type="password"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
              </div>

              <SectionHeader>Verification Settings</SectionHeader>
              <div className="space-y-3 bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Reference / Payment Link ID</Label>
                  <Input
                    value={d.razorpayRefId || ""}
                    onChange={(e) => onChange({ razorpayRefId: e.target.value })}
                    placeholder="e.g., {{payment_ref_id}}"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                  <div className="text-[10px] text-gray-400">Pass the variable name or ID to verify.</div>
                </div>
              </div>

              <SectionHeader>Output Variables</SectionHeader>
              <div className="space-y-3 bg-violet-50/50 rounded-xl p-4 border border-violet-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Status To</Label>
                  <Input
                    value={d.razorpayVarStatus || "payment_status"}
                    onChange={(e) => onChange({ razorpayVarStatus: e.target.value })}
                    placeholder="payment_status"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                  <div className="text-[10px] text-gray-400">Stores: "paid", "created", "expired", "cancelled" etc.</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Payment ID To (Optional)</Label>
                  <Input
                    value={d.razorpayVarPaymentId || "payment_id"}
                    onChange={(e) => onChange({ razorpayVarPaymentId: e.target.value })}
                    placeholder="payment_id"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {d.kind === "instamojo_payment" && (
            <>
              <SectionHeader>Instamojo Credentials</SectionHeader>
              <div className="space-y-3 bg-purple-50/50 rounded-xl p-4 border border-purple-100 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">API Key (Optional if in .env)</Label>
                  <Input
                    value={d.instamojoApiKey || ""}
                    onChange={(e) => onChange({ instamojoApiKey: e.target.value })}
                    placeholder="E.g., api_xxxxxxxxxxxx"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Auth Token (Optional if in .env)</Label>
                  <Input
                    value={d.instamojoAuthToken || ""}
                    onChange={(e) => onChange({ instamojoAuthToken: e.target.value })}
                    placeholder="E.g., auth_xxxxxxxxxxxx"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id="instamojoSandbox"
                    checked={d.instamojoSandbox || false}
                    onCheckedChange={(checked) => onChange({ instamojoSandbox: !!checked })}
                  />
                  <Label htmlFor="instamojoSandbox" className="text-xs font-semibold text-gray-700 cursor-pointer">
                    Enable Test Mode (Sandbox environment)
                  </Label>
                </div>
              </div>

              <SectionHeader>Payment Details</SectionHeader>
              <div className="space-y-3 bg-blue-50/50 rounded-xl p-4 border border-blue-100 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Amount (INR)</Label>
                  <Input
                    value={d.instamojoAmount || ""}
                    onChange={(e) => onChange({ instamojoAmount: e.target.value })}
                    placeholder="e.g., 499.00 or {{amount}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Specify amount. Variables like {{amount}} are supported."}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Purpose</Label>
                  <Input
                    value={d.instamojoPurpose || "Payment Request"}
                    onChange={(e) => onChange({ instamojoPurpose: e.target.value })}
                    placeholder="e.g., Order #{{order_id}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Payment context. Variables like {{order_id}} are supported."}</div>
                </div>
              </div>

              <SectionHeader>Auto Message Settings</SectionHeader>
              <div className="space-y-3 bg-blue-50/50 rounded-xl p-4 border border-blue-100 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">WhatsApp Message Template</Label>
                  <Textarea
                    value={d.instamojoMessage || ""}
                    onChange={(e) => onChange({ instamojoMessage: e.target.value })}
                    placeholder="Hello {{contact_name}}, please pay by clicking this link: {{payment_url}}"
                    className="min-h-[80px] text-sm bg-white rounded-lg"
                  />
                  <div className="text-[10px] text-gray-400">{"Message to send automatically. You must include {{payment_url}} so the customer receives the link."}</div>
                </div>
              </div>

              <SectionHeader>Customer Details</SectionHeader>
              <div className="space-y-3 bg-gray-50/50 rounded-xl p-4 border border-gray-100 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Customer Name</Label>
                  <Input
                    value={d.instamojoCustomerName || ""}
                    onChange={(e) => onChange({ instamojoCustomerName: e.target.value })}
                    placeholder="{{contact_name}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Customer's name. Variables like {{contact_name}} are supported."}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Customer Email</Label>
                  <Input
                    value={d.instamojoCustomerEmail || ""}
                    onChange={(e) => onChange({ instamojoCustomerEmail: e.target.value })}
                    placeholder="{{contact_email}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Customer's email address. Variables like {{contact_email}} are supported."}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Customer Phone</Label>
                  <Input
                    value={d.instamojoCustomerPhone || ""}
                    onChange={(e) => onChange({ instamojoCustomerPhone: e.target.value })}
                    placeholder="{{contact_phone}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Customer's contact number. Variables like {{contact_phone}} are supported."}</div>
                </div>
              </div>

              <SectionHeader>Output Variables</SectionHeader>
              <div className="space-y-3 bg-violet-50/50 rounded-xl p-4 border border-violet-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Payment URL To</Label>
                  <Input
                    value={d.instamojoVarUrl || "payment_url"}
                    onChange={(e) => onChange({ instamojoVarUrl: e.target.value })}
                    placeholder="payment_url"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Reference ID To</Label>
                  <Input
                    value={d.instamojoVarRefId || "payment_ref_id"}
                    onChange={(e) => onChange({ instamojoVarRefId: e.target.value })}
                    placeholder="payment_ref_id"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Status To</Label>
                  <Input
                    value={d.instamojoVarStatus || "payment_status"}
                    onChange={(e) => onChange({ instamojoVarStatus: e.target.value })}
                    placeholder="payment_status"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Payment ID To (Optional)</Label>
                  <Input
                    value={d.instamojoVarPaymentId || "payment_id"}
                    onChange={(e) => onChange({ instamojoVarPaymentId: e.target.value })}
                    placeholder="payment_id"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {d.kind === "zapier" && (
            <>
              <SectionHeader>Zapier Webhook</SectionHeader>
              <div className="space-y-3 bg-orange-50/50 rounded-xl p-4 border border-orange-100 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Zapier Webhook URL</Label>
                  <Input
                    value={d.zapierWebhookUrl || ""}
                    onChange={(e) => onChange({ zapierWebhookUrl: e.target.value })}
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">
                    Paste the Catch Hook URL generated in your Zapier trigger configuration.
                  </div>
                </div>
              </div>

              <SectionHeader>Payload Configuration</SectionHeader>
              <div className="space-y-3 bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Payload Mode</Label>
                  <Select
                    value={d.zapierPayloadMode || "all_variables"}
                    onValueChange={(v) => onChange({ zapierPayloadMode: v as any })}
                  >
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_variables">Send All Flow Variables</SelectItem>
                      <SelectItem value="custom">Send Custom JSON Payload</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-[10px] text-gray-400">
                    {d.zapierPayloadMode === "all_variables"
                      ? "Automatically compiles and transmits all contact and conversation variables as a JSON object."
                      : "Manually construct a custom JSON payload to transmit specific fields."}
                  </div>
                </div>

                {d.zapierPayloadMode === "custom" && (
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs font-semibold text-gray-700">Custom JSON Payload</Label>
                    <Textarea
                      value={d.zapierCustomPayload || ""}
                      onChange={(e) => onChange({ zapierCustomPayload: e.target.value })}
                      placeholder={'{\n  "contact_name": "{{contact_name}}",\n  "custom_field": "some_value"\n}'}
                      className="min-h-[120px] text-xs font-mono bg-white rounded-lg"
                    />
                    <div className="text-[10px] text-gray-400">
                      {"Enter a valid JSON string. Variables like {{contact_name}} are supported."}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {d.kind === "tap_payment" && (
            <>
              <SectionHeader>Tap Payments Credentials</SectionHeader>
              <div className="space-y-3 bg-rose-50/50 rounded-xl p-4 border border-rose-100 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Secret Key (Optional if in .env)</Label>
                  <Input
                    value={d.tapSecretKey || ""}
                    onChange={(e) => onChange({ tapSecretKey: e.target.value })}
                    placeholder="E.g., Tap Secret Key"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                    type="password"
                  />
                </div>
              </div>

              <SectionHeader>Payment Details</SectionHeader>
              <div className="space-y-3 bg-blue-50/50 rounded-xl p-4 border border-blue-100 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Amount</Label>
                  <Input
                    value={d.tapAmount || ""}
                    onChange={(e) => onChange({ tapAmount: e.target.value })}
                    placeholder="e.g., 50.00 or {{amount}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Specify amount. Variables like {{amount}} are supported."}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Currency</Label>
                  <Input
                    value={d.tapCurrency || "SAR"}
                    onChange={(e) => onChange({ tapCurrency: e.target.value })}
                    placeholder="e.g., SAR, KWD, AED, USD"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                  <div className="text-[10px] text-gray-400">{"Currency code. E.g., SAR, KWD, AED, BHD, OMR, QAR, USD."}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Description / Purpose</Label>
                  <Input
                    value={d.tapDescription || "Payment Request"}
                    onChange={(e) => onChange({ tapDescription: e.target.value })}
                    placeholder="e.g., Order #{{order_id}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Payment context. Variables like {{order_id}} are supported."}</div>
                </div>
              </div>

              <SectionHeader>Auto Message Settings</SectionHeader>
              <div className="space-y-3 bg-blue-50/50 rounded-xl p-4 border border-blue-100 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">WhatsApp Message Template</Label>
                  <Textarea
                    value={d.tapMessage || ""}
                    onChange={(e) => onChange({ tapMessage: e.target.value })}
                    placeholder="Hello {{contact_name}}, please complete your payment of {{amount}} {{currency}} here: {{payment_url}}"
                    className="min-h-[80px] text-sm bg-white rounded-lg"
                  />
                  <div className="text-[10px] text-gray-400">{"Message to send automatically. You must include {{payment_url}} so the customer receives the link."}</div>
                </div>
              </div>

              <SectionHeader>Customer Details</SectionHeader>
              <div className="space-y-3 bg-gray-50/50 rounded-xl p-4 border border-gray-100 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Customer Name</Label>
                  <Input
                    value={d.tapCustomerName || ""}
                    onChange={(e) => onChange({ tapCustomerName: e.target.value })}
                    placeholder="{{contact_name}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Customer's name. Variables like {{contact_name}} are supported."}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Customer Email</Label>
                  <Input
                    value={d.tapCustomerEmail || ""}
                    onChange={(e) => onChange({ tapCustomerEmail: e.target.value })}
                    placeholder="{{contact_email}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Customer's email address. Variables like {{contact_email}} are supported."}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Customer Phone</Label>
                  <Input
                    value={d.tapCustomerPhone || ""}
                    onChange={(e) => onChange({ tapCustomerPhone: e.target.value })}
                    placeholder="{{contact_phone}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Customer's contact number. Variables like {{contact_phone}} are supported."}</div>
                </div>
              </div>

              <SectionHeader>Output Variables</SectionHeader>
              <div className="space-y-3 bg-violet-50/50 rounded-xl p-4 border border-violet-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Payment URL To</Label>
                  <Input
                    value={d.tapVarUrl || "payment_url"}
                    onChange={(e) => onChange({ tapVarUrl: e.target.value })}
                    placeholder="payment_url"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Reference ID To</Label>
                  <Input
                    value={d.tapVarRefId || "payment_ref_id"}
                    onChange={(e) => onChange({ tapVarRefId: e.target.value })}
                    placeholder="payment_ref_id"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Status To</Label>
                  <Input
                    value={d.tapVarStatus || "payment_status"}
                    onChange={(e) => onChange({ tapVarStatus: e.target.value })}
                    placeholder="payment_status"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Payment ID To (Optional)</Label>
                  <Input
                    value={d.tapVarPaymentId || "payment_id"}
                    onChange={(e) => onChange({ tapVarPaymentId: e.target.value })}
                    placeholder="payment_id"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {d.kind === "noon_payment" && (
            <>
              <SectionHeader>Noon Payments Credentials</SectionHeader>
              <div className="space-y-3 bg-yellow-50/50 rounded-xl p-4 border border-yellow-100 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Business ID (Optional if in .env)</Label>
                  <Input
                    value={d.noonBusinessId || ""}
                    onChange={(e) => onChange({ noonBusinessId: e.target.value })}
                    placeholder="E.g., 123456"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Application ID (Optional if in .env)</Label>
                  <Input
                    value={d.noonAppId || ""}
                    onChange={(e) => onChange({ noonAppId: e.target.value })}
                    placeholder="E.g., app_xxxxxx"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Application Key (Optional if in .env)</Label>
                  <Input
                    value={d.noonAppKey || ""}
                    onChange={(e) => onChange({ noonAppKey: e.target.value })}
                    placeholder="E.g., key_xxxxxx"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                    type="password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Route Category</Label>
                  <Input
                    value={d.noonCategory || "pay_by_link"}
                    onChange={(e) => onChange({ noonCategory: e.target.value })}
                    placeholder="pay_by_link"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id="noonSandbox"
                    checked={d.noonSandbox || false}
                    onCheckedChange={(checked) => onChange({ noonSandbox: !!checked })}
                  />
                  <Label htmlFor="noonSandbox" className="text-xs font-semibold text-gray-700 cursor-pointer">
                    Enable Test Mode (Sandbox environment)
                  </Label>
                </div>
              </div>

              <SectionHeader>Payment Details</SectionHeader>
              <div className="space-y-3 bg-blue-50/50 rounded-xl p-4 border border-blue-100 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Amount</Label>
                  <Input
                    value={d.noonAmount || ""}
                    onChange={(e) => onChange({ noonAmount: e.target.value })}
                    placeholder="e.g., 50.00 or {{amount}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Specify amount. Variables like {{amount}} are supported."}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Currency</Label>
                  <Input
                    value={d.noonCurrency || "SAR"}
                    onChange={(e) => onChange({ noonCurrency: e.target.value })}
                    placeholder="e.g., SAR, AED, EGP, USD"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                  <div className="text-[10px] text-gray-400">{"Currency code. E.g., SAR, AED, EGP, USD."}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Description / Purpose</Label>
                  <Input
                    value={d.noonDescription || "Payment Request"}
                    onChange={(e) => onChange({ noonDescription: e.target.value })}
                    placeholder="e.g., Order #{{order_id}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">{"Payment context. Variables like {{order_id}} are supported."}</div>
                </div>
              </div>

              <SectionHeader>Auto Message Settings</SectionHeader>
              <div className="space-y-3 bg-blue-50/50 rounded-xl p-4 border border-blue-100 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">WhatsApp Message Template</Label>
                  <Textarea
                    value={d.noonMessage || ""}
                    onChange={(e) => onChange({ noonMessage: e.target.value })}
                    placeholder="Hello {{contact_name}}, please complete your payment of {{amount}} {{currency}} here: {{payment_url}}"
                    className="min-h-[80px] text-sm bg-white rounded-lg"
                  />
                  <div className="text-[10px] text-gray-400">{"Message to send automatically. You must include {{payment_url}} so the customer receives the link."}</div>
                </div>
              </div>

              <SectionHeader>Output Variables</SectionHeader>
              <div className="space-y-3 bg-violet-50/50 rounded-xl p-4 border border-violet-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Payment URL To</Label>
                  <Input
                    value={d.noonVarUrl || "payment_url"}
                    onChange={(e) => onChange({ noonVarUrl: e.target.value })}
                    placeholder="payment_url"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Reference ID To</Label>
                  <Input
                    value={d.noonVarRefId || "payment_ref_id"}
                    onChange={(e) => onChange({ noonVarRefId: e.target.value })}
                    placeholder="payment_ref_id"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Status To</Label>
                  <Input
                    value={d.noonVarStatus || "payment_status"}
                    onChange={(e) => onChange({ noonVarStatus: e.target.value })}
                    placeholder="payment_status"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Payment ID To (Optional)</Label>
                  <Input
                    value={d.noonVarPaymentId || "payment_id"}
                    onChange={(e) => onChange({ noonVarPaymentId: e.target.value })}
                    placeholder="payment_id"
                    className="h-9 text-sm rounded-lg bg-white font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {d.kind === "webhook" && (
            <>
              <SectionHeader>Webhook Settings</SectionHeader>
              <div className="space-y-3 bg-orange-50/50 rounded-xl p-4 border border-orange-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">HTTP Method</Label>
                  <Select value={d.webhookMethod || "POST"} onValueChange={(v) => onChange({ webhookMethod: v as any })}>
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Webhook URL</Label>
                  <Input value={d.webhookUrl || ""} onChange={(e) => onChange({ webhookUrl: e.target.value })} placeholder="https://api.example.com/webhook" className="h-9 text-sm rounded-lg bg-white" />
                </div>
              </div>

              <SectionHeader>HTTP Headers</SectionHeader>
              <div className="space-y-2 bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <div className="space-y-2">
                  {localHeaders.map((header) => (
                    <div key={header.id} className="flex gap-2 items-center">
                      <Input
                        value={header.key}
                        onChange={(e) => updateHeader(header.id, "key", e.target.value)}
                        placeholder="Header (e.g. Authorization)"
                        className="h-8 text-xs rounded-lg bg-white flex-1"
                      />
                      <Input
                        value={header.value}
                        onChange={(e) => updateHeader(header.id, "value", e.target.value)}
                        placeholder="Value"
                        className="h-8 text-xs rounded-lg bg-white flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHeader(header.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {localHeaders.length === 0 && (
                    <div className="text-[10px] text-gray-400 italic">No custom headers configured.</div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addHeader}
                    className="w-full h-8 text-xs gap-1 mt-1 rounded-lg bg-white border-dashed border-gray-300 hover:border-gray-400"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Header
                  </Button>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        if (!localHeaders.some(h => h.key.toLowerCase() === 'authorization')) {
                          syncHeaders([...localHeaders, { id: uid(), key: "Authorization", value: "Bearer {{token}}" }]);
                        }
                      }}
                      className="px-2 py-0.5 text-[9px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 rounded"
                    >
                      + Add Bearer Auth
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!localHeaders.some(h => h.key.toLowerCase() === 'content-type')) {
                          syncHeaders([...localHeaders, { id: uid(), key: "Content-Type", value: "application/json" }]);
                        }
                      }}
                      className="px-2 py-0.5 text-[9px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 rounded"
                    >
                      + Add JSON Type
                    </button>
                  </div>
                </div>
              </div>

              {(d.webhookMethod === "POST" || d.webhookMethod === "PUT" || d.webhookMethod === "DELETE" || !d.webhookMethod) && (
                <>
                  <SectionHeader>Request Body</SectionHeader>
                  <div className="space-y-2">
                    <Textarea rows={4} value={d.webhookBody || ""} onChange={(e) => onChange({ webhookBody: e.target.value })} placeholder={'{\n  "name": "{{contact_name}}",\n  "phone": "{{contact_phone}}",\n  "message": "{{last_message}}"\n}'} className="text-sm font-mono resize-none rounded-lg" />
                    <div className="text-[10px] text-gray-400">Leave empty to send full contact & conversation data automatically. Or use variables below to build a custom body.</div>
                  </div>
                </>
              )}

              {d.webhookMethod === "GET" && (
                <div className="text-[10px] text-gray-400 bg-orange-50/50 rounded-lg p-3 border border-orange-100">
                  GET requests automatically append contact name, phone, email, message, conversation ID, and channel info as query parameters.
                  You can also add variables to the URL using the buttons below.
                </div>
              )}

              <SectionHeader>Available Variables</SectionHeader>
              <div className="space-y-2">
                <div className="text-[10px] text-gray-500 mb-1">
                  {d.webhookMethod === "GET"
                    ? "Click to insert into the webhook URL"
                    : "Click to insert into the request body"}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: "contact_name", label: "Contact Name" },
                    { key: "contact_phone", label: "Contact Phone" },
                    { key: "contact_email", label: "Contact Email" },
                    { key: "contact_groups", label: "Contact Groups" },
                    { key: "last_message", label: "Last Message" },
                    { key: "conversation_id", label: "Conversation ID" },
                    { key: "channel_name", label: "Channel Name" },
                    { key: "channel_phone", label: "Channel Phone" },
                  ].map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => {
                        if (d.webhookMethod === "GET") {
                          const currentUrl = d.webhookUrl || "";
                          const separator = currentUrl.includes("?") ? "&" : "?";
                          onChange({ webhookUrl: currentUrl + `${separator}${v.key}={{${v.key}}}` });
                        } else {
                          const current = d.webhookBody || "";
                          onChange({ webhookBody: current + `{{${v.key}}}` });
                        }
                      }}
                      className="px-2 py-1 text-[10px] font-mono bg-orange-50 border border-orange-200 rounded-md text-orange-700 hover:bg-orange-100 hover:border-orange-300 transition-colors cursor-pointer"
                      title={d.webhookMethod === "GET" ? `Add ${v.key} to URL` : `Insert {{${v.key}}}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  Flow variables set by "Set Variable" nodes are also available using {"{{your_variable_name}}"} syntax.
                </div>
              </div>
            </>
          )}

          {d.kind === "mysql" && (
            <>
              <SectionHeader>MySQL Database Settings</SectionHeader>
              <div className="space-y-3 bg-teal-50/50 rounded-xl p-4 border border-teal-100">
                <div className="text-[10px] text-teal-800 leading-normal mb-1 bg-teal-100/30 p-2 rounded border border-teal-200/40">
                  💡 Leave host and credentials blank to connect by default to the application's main hosted MySQL server.
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Host</Label>
                    <Input
                      value={d.mysqlHost || ""}
                      onChange={(e) => onChange({ mysqlHost: e.target.value })}
                      placeholder="Default: App Host"
                      className="h-9 text-sm rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Port</Label>
                    <Input
                      value={d.mysqlPort || ""}
                      onChange={(e) => onChange({ mysqlPort: e.target.value })}
                      placeholder="Default: 3306"
                      className="h-9 text-sm rounded-lg bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Username</Label>
                    <Input
                      value={d.mysqlUsername || ""}
                      onChange={(e) => onChange({ mysqlUsername: e.target.value })}
                      placeholder="Default: App User"
                      className="h-9 text-sm rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Password</Label>
                    <Input
                      type="password"
                      value={d.mysqlPassword || ""}
                      onChange={(e) => onChange({ mysqlPassword: e.target.value })}
                      placeholder="Default: App Pass"
                      className="h-9 text-sm rounded-lg bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Database Name</Label>
                  <Input
                    value={d.mysqlDatabase || ""}
                    onChange={(e) => onChange({ mysqlDatabase: e.target.value })}
                    placeholder="Default: App DB"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                </div>
              </div>

              <SectionHeader>SQL Query</SectionHeader>
              <div className="space-y-3 bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Query / Command</Label>
                  <Textarea
                    rows={6}
                    value={d.mysqlQuery || ""}
                    onChange={(e) => onChange({ mysqlQuery: e.target.value })}
                    placeholder={"SELECT name FROM users WHERE email = '{{contact_email}}';\n\nINSERT INTO logs (user_id, msg) VALUES ('{{contact_phone}}', '{{last_message}}');"}
                    className="text-sm font-mono resize-none rounded-lg bg-white border border-gray-200"
                  />
                  <div className="text-[10px] text-gray-400 leading-relaxed mt-1">
                    You can use variables (e.g. <code className="bg-gray-100 px-1 rounded font-mono">{"{{contact_name}}"}</code> or <code className="bg-gray-100 px-1 rounded font-mono">{"{{any_variable}}"}</code>) which will be safely interpolated.
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Query Result To (Optional)</Label>
                  <Input
                    value={d.mysqlOutputVariable || ""}
                    onChange={(e) => onChange({ mysqlOutputVariable: e.target.value })}
                    placeholder="e.g., query_result"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400 leading-relaxed mt-1">
                    Stores the output of the query (e.g., JSON array of rows for queries that return data, or metadata for inserts/updates) into this variable.
                  </div>
                </div>
              </div>

              <SectionHeader>Available Variables</SectionHeader>
              <div className="space-y-2 bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <div className="text-[10px] text-gray-500 mb-1">
                  Click to insert into the SQL query
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: "contact_name", label: "Contact Name" },
                    { key: "contact_phone", label: "Contact Phone" },
                    { key: "contact_email", label: "Contact Email" },
                    { key: "last_message", label: "Last Message" },
                    { key: "conversation_id", label: "Conversation ID" },
                    { key: "channel_name", label: "Channel Name" },
                    { key: "channel_phone", label: "Channel Phone" },
                  ].map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => {
                        const current = d.mysqlQuery || "";
                        onChange({ mysqlQuery: current + `{{${v.key}}}` });
                      }}
                      className="px-2 py-1 text-[10px] font-mono bg-teal-50 border border-teal-200 rounded-md text-teal-700 hover:bg-teal-100 hover:border-teal-300 transition-colors cursor-pointer"
                      title={`Insert {{${v.key}}}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  Flow variables set by "Set Variable" nodes are also available using {"{{your_variable_name}}"} syntax.
                </div>
              </div>
            </>
          )}

          {d.kind === "wait_read" && (
            <>
              <SectionHeader>Wait Configuration</SectionHeader>
              <div className="space-y-4 bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                <div className="text-xs text-blue-700 leading-relaxed bg-white/60 p-3 rounded-lg border border-blue-100/50">
                  This node will pause the automation flow until the previous outbound message sent is marked as <strong>read</strong> by the customer.
                </div>

                <div className="space-y-4 pt-2 border-t border-blue-100/50">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Timeout / Delay (Minutes)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={d.timeoutMinutes !== undefined ? d.timeoutMinutes : ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                        onChange({ timeoutMinutes: isNaN(val) ? 0 : val });
                      }}
                      placeholder="Optional (e.g. 60 for 1 hour)"
                      className="h-9 text-sm rounded-lg bg-white"
                    />
                    <div className="text-[10px] text-gray-400 leading-relaxed mt-1">
                      Optional. If the customer does not read the message within this period, the flow will automatically proceed anyway. Leave blank or set to 0 to wait indefinitely.
                    </div>
                  </div>

                  {(d.timeoutMinutes !== undefined && Number(d.timeoutMinutes) > 0) && (
                    <div className="flex items-center justify-between bg-white/40 p-3 rounded-lg border border-blue-100/35">
                      <div className="flex flex-col gap-0.5">
                        <Label className="text-xs font-semibold text-gray-700">Start clock only after delivery</Label>
                        <p className="text-[10px] text-gray-500 leading-snug max-w-[200px]">
                          If enabled, the timeout countdown starts only when the message is successfully delivered to the customer.
                        </p>
                      </div>
                      <Switch
                        checked={!!d.timeoutOnlyAfterDelivered}
                        onCheckedChange={(checked) => onChange({ timeoutOnlyAfterDelivered: checked })}
                      />
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-gray-400 leading-relaxed border-t border-blue-100/50 pt-3">
                  If there is no previous outbound message in this flow execution, or if it is already read, the automation will continue immediately without pausing.
                </div>
              </div>
            </>
          )}

          {d.kind === "wait_reply" && (
            <>
              <SectionHeader>Wait Configuration</SectionHeader>
              <div className="space-y-3 bg-amber-50/50 rounded-xl p-4 border border-amber-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save Reply As (Optional)</Label>
                  <Input
                    value={d.saveAs || ""}
                    onChange={(e) => onChange({ saveAs: e.target.value })}
                    placeholder="e.g., user_choice"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400 leading-relaxed mt-1">
                    If specified, the user's incoming message content will be saved to this variable. You can then reference it in subsequent nodes (e.g. using <code className="bg-gray-100 px-1 rounded font-mono">{"{{user_choice}}"}</code> in Send Message nodes, or in Condition nodes).
                  </div>
                </div>
              </div>
            </>
          )}

          {d.kind === "ai_answer" && (
            <>
              <SectionHeader>AI Answer Configuration</SectionHeader>
              <div className="space-y-4 bg-purple-50/50 rounded-xl p-4 border border-purple-100">
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">API Key Source</Label>
                  <Select
                    value={d.aiConfigUseSettings !== false ? "settings" : "manual"}
                    onValueChange={(v) => onChange({ aiConfigUseSettings: v === "settings" })}
                  >
                    <SelectTrigger className="h-9 rounded-lg bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="settings">Use Settings Configuration</SelectItem>
                      <SelectItem value="manual">Manual API Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {d.aiConfigUseSettings === false && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">OpenAI API Key</Label>
                    <Input
                      type="password"
                      value={d.aiApiKey || ""}
                      onChange={(e) => onChange({ aiApiKey: e.target.value })}
                      placeholder="sk-proj-..."
                      className="h-9 text-sm rounded-lg bg-white"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Model</Label>
                  <Select
                    value={d.aiModel || "gpt-4o"}
                    onValueChange={(v) => onChange({ aiModel: v })}
                  >
                    <SelectTrigger className="h-9 rounded-lg bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">gpt-4o (Recommended)</SelectItem>
                      <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-gray-700">Use Training Data</Label>
                    <div className="text-[10px] text-gray-400">Search PDFs, DOCX, URLs, and articles</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={d.aiUseTrainingData !== false}
                    onChange={(e) => onChange({ aiUseTrainingData: e.target.checked })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">System Prompt</Label>
                  <Textarea
                    rows={4}
                    value={d.aiSystemPrompt || ""}
                    onChange={(e) => onChange({ aiSystemPrompt: e.target.value })}
                    placeholder="Instructions for the AI. You can reference variables like {{contactName}} or {{last_message}}."
                    className="text-xs rounded-lg bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save AI Response to Variable</Label>
                  <Input
                    value={d.aiOutputVariable || "ai_response"}
                    onChange={(e) => onChange({ aiOutputVariable: e.target.value })}
                    placeholder="e.g., ai_response"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    The resulting AI text will be saved to this flow variable. You can then output it to the user in a Send Message node using: <code className="bg-gray-100 px-1 rounded font-mono">{"{{ai_response}}"}</code>.
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-gray-400">Available Variables:</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[
                      { key: "contactName", label: "Contact Name" },
                      { key: "contactPhone", label: "Contact Phone" },
                      { key: "last_message", label: "Last Message" },
                    ].map((v) => (
                      <button
                        key={v.key}
                        onClick={(e) => {
                          e.preventDefault();
                          const current = d.aiSystemPrompt || "";
                          onChange({ aiSystemPrompt: current + `{{${v.key}}}` });
                        }}
                        className="px-2 py-1 text-[10px] font-mono bg-purple-50 border border-purple-200 rounded-md text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors cursor-pointer"
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </>
          )}

          {d.kind === "ai_agent" && (
            <>
              <SectionHeader>AI Agent (Takeover) Configuration</SectionHeader>
              <div className="space-y-4 bg-fuchsia-50/50 rounded-xl p-4 border border-fuchsia-100">
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">API Key Source</Label>
                  <Select
                    value={d.aiConfigUseSettings !== false ? "settings" : "manual"}
                    onValueChange={(v) => onChange({ aiConfigUseSettings: v === "settings" })}
                  >
                    <SelectTrigger className="h-9 rounded-lg bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="settings">Use Settings Configuration</SelectItem>
                      <SelectItem value="manual">Manual API Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {d.aiConfigUseSettings === false && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">
                      {d.aiLlmProvider === "groq" ? "Groq API Key" : "OpenAI API Key"}
                    </Label>
                    <Input
                      type="password"
                      value={d.aiApiKey || ""}
                      onChange={(e) => onChange({ aiApiKey: e.target.value })}
                      placeholder={d.aiLlmProvider === "groq" ? "gsk_..." : "sk-proj-..."}
                      className="h-9 text-sm rounded-lg bg-white"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Completions Provider</Label>
                  <Select
                    value={d.aiLlmProvider || "openai"}
                    onValueChange={(v) => {
                      onChange({
                        aiLlmProvider: v,
                        aiModel: v === "groq" ? "llama-3.3-70b-versatile" : v === "elevenlabs" ? "conversational-ai" : "gpt-4o"
                      });
                    }}
                  >
                    <SelectTrigger className="h-9 rounded-lg bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="groq">Groq API</SelectItem>
                      <SelectItem value="elevenlabs">ElevenLabs Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Model</Label>
                  <Select
                    value={d.aiModel || (d.aiLlmProvider === "groq" ? "llama-3.3-70b-versatile" : d.aiLlmProvider === "elevenlabs" ? "conversational-ai" : "gpt-4o")}
                    onValueChange={(v) => onChange({ aiModel: v })}
                  >
                    <SelectTrigger className="h-9 rounded-lg bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {d.aiLlmProvider === "groq" ? (
                        <>
                          <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B (Versatile)</SelectItem>
                          <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B (Instant)</SelectItem>
                          <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
                        </>
                      ) : d.aiLlmProvider === "elevenlabs" ? (
                        <>
                          <SelectItem value="conversational-ai">Conversational AI Agent</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="gpt-4o">gpt-4o (Recommended)</SelectItem>
                          <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Agent Persona / Tone</Label>
                  <Select
                    value={d.aiTone || "friendly"}
                    onValueChange={(v) => onChange({ aiTone: v })}
                  >
                    <SelectTrigger className="h-9 rounded-lg bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly & Warm</SelectItem>
                      <SelectItem value="professional">Professional & Courteous</SelectItem>
                      <SelectItem value="casual">Casual & Relaxed</SelectItem>
                      <SelectItem value="assertive">Assertive & Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Conversation Goal</Label>
                  <Select
                    value={d.aiConversationGoal || "info_support"}
                    onValueChange={(v) => onChange({ aiConversationGoal: v })}
                  >
                    <SelectTrigger className="h-9 rounded-lg bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info_support">Information & Support</SelectItem>
                      <SelectItem value="lead_generation">Lead Qualification & Capture</SelectItem>
                      <SelectItem value="sales_conversion">Sales Conversion / Close Deal</SelectItem>
                      <SelectItem value="appointment_booking">Schedule Demo / Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Temperature</Label>
                    <Select
                      value={String(d.aiTemperature !== undefined ? d.aiTemperature : "0.5")}
                      onValueChange={(v) => onChange({ aiTemperature: parseFloat(v) })}
                    >
                      <SelectTrigger className="h-9 rounded-lg bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.2">Precise (0.2)</SelectItem>
                        <SelectItem value="0.5">Balanced (0.5)</SelectItem>
                        <SelectItem value="0.8">Creative (0.8)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Response Length</Label>
                    <Select
                      value={d.aiResponseLength || "short"}
                      onValueChange={(v) => onChange({ aiResponseLength: v })}
                    >
                      <SelectTrigger className="h-9 rounded-lg bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ultra_short">One-liner (Ultra Short)</SelectItem>
                        <SelectItem value="short">Conversational (Short)</SelectItem>
                        <SelectItem value="detailed">Detailed (Medium)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-gray-700">Use Training Data</Label>
                    <div className="text-[10px] text-gray-400">Search PDFs, DOCX, URLs, and articles</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={d.aiUseTrainingData !== false}
                    onChange={(e) => onChange({ aiUseTrainingData: e.target.checked })}
                    className="w-4 h-4 text-fuchsia-600 border-gray-300 rounded focus:ring-fuchsia-500 cursor-pointer"
                  />
                </div>

                {/* Execution Limits Configuration */}
                <div className="space-y-3 p-3 bg-white rounded-lg border border-gray-100">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Execution Limits</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-gray-500">Time Limit (Hours)</Label>
                      <Input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={d.timeLimitHours !== undefined ? d.timeLimitHours : 1}
                        onChange={(e) => onChange({ timeLimitHours: parseFloat(e.target.value) || 1 })}
                        className="h-8 text-xs rounded bg-gray-50 border border-gray-200"
                        placeholder="e.g. 1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-gray-500">Max Questions</Label>
                      <Input
                        type="number"
                        min={1}
                        value={d.questionLimit !== undefined ? d.questionLimit : 50}
                        onChange={(e) => onChange({ questionLimit: parseInt(e.target.value, 10) || 50 })}
                        className="h-8 text-xs rounded bg-gray-50 border border-gray-200"
                        placeholder="e.g. 50"
                      />
                    </div>
                  </div>
                  <div className="text-[9px] text-gray-400 leading-normal">
                    Deactivates the takeover and routes the conversation to the next node once elapsed time or number of questions exceeds these limits.
                  </div>
                </div>

                {/* Voice Support Configuration */}
                <div className="space-y-3 p-3 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold text-gray-700">Voice Interaction</Label>
                      <div className="text-[10px] text-gray-400">Transcribe voice notes & respond with spoken audio</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={d.aiVoiceEnabled === true}
                      onChange={(e) => onChange({ aiVoiceEnabled: e.target.checked })}
                      className="w-4 h-4 text-fuchsia-600 border-gray-300 rounded focus:ring-fuchsia-500 cursor-pointer"
                    />
                  </div>

                  {d.aiVoiceEnabled === true && (
                    <div className="space-y-3 pt-2 border-t border-gray-50">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-gray-500">Voice Profile</Label>
                        <Select
                          value={d.voiceProfileId || ""}
                          onValueChange={(v) => onChange({ voiceProfileId: v })}
                        >
                          <SelectTrigger className="h-8 text-xs rounded bg-gray-50 border border-gray-200">
                            <SelectValue placeholder="Select a voice profile..." />
                          </SelectTrigger>
                          <SelectContent>
                            {voiceProfiles.length === 0 ? (
                              <SelectItem value="none" disabled>No voices found (configure in Settings)</SelectItem>
                            ) : (
                              voiceProfiles.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>{p.name} ({p.provider})</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <div className="text-[9px] text-gray-400 mt-0.5">
                          Manage and clone voices under <span className="font-semibold text-gray-500">Settings &gt; AI Voices</span>.
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-gray-500">Voice Language</Label>
                        <Select
                          value={d.voiceLanguage || "en-IN"}
                          onValueChange={(v) => onChange({ voiceLanguage: v })}
                        >
                          <SelectTrigger className="h-8 text-xs rounded bg-gray-50 border border-gray-200">
                            <SelectValue placeholder="Select language..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const selectedVoice = voiceProfiles.find((vp: any) => vp.id === d.voiceProfileId);
                              const provider = selectedVoice?.provider || "sarvam";
                              if (provider === "groq") {
                                  return (
                                    <>
                                      <SelectItem value="en-US">English (US)</SelectItem>
                                      <SelectItem value="ar-SA">Saudi Arabic</SelectItem>
                                    </>
                                  );
                              } else {
                                  return (
                                    <>
                                      <SelectItem value="en-IN">Indian English</SelectItem>
                                      <SelectItem value="hi-IN">Hindi</SelectItem>
                                      <SelectItem value="ta-IN">Tamil</SelectItem>
                                      <SelectItem value="te-IN">Telugu</SelectItem>
                                      <SelectItem value="ml-IN">Malayalam</SelectItem>
                                      <SelectItem value="kn-IN">Kannada</SelectItem>
                                      <SelectItem value="mr-IN">Marathi</SelectItem>
                                      <SelectItem value="gu-IN">Gujarati</SelectItem>
                                      <SelectItem value="bn-IN">Bengali</SelectItem>
                                      <SelectItem value="pa-IN">Punjabi</SelectItem>
                                      <SelectItem value="or-IN">Odia</SelectItem>
                                      <SelectItem value="ar-SA">Saudi Arabic</SelectItem>
                                      <SelectItem value="en-US">English (US)</SelectItem>
                                    </>
                                  );
                              }
                            })()}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-gray-500">Local Dialect & Slang Style</Label>
                        <Select
                          value={d.aiLocalStyle || "code_mixed"}
                          onValueChange={(v) => onChange({ aiLocalStyle: v })}
                        >
                          <SelectTrigger className="h-8 text-xs rounded bg-gray-50 border border-gray-200">
                            <SelectValue placeholder="Select dialect style..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="code_mixed">Code-Mixed (Script + English Terms - Natural)</SelectItem>
                            <SelectItem value="colloquial">Colloquial (Everyday Spoken Slang)</SelectItem>
                            <SelectItem value="standard">Standard (Formal Textbook Translation)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Proactive Intro Configuration */}
                <div className="space-y-3 p-3 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold text-gray-700">Conversation First to Customer</Label>
                      <div className="text-[10px] text-gray-400">Proactively send the first intro message when takeover starts</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={d.aiIntroEnabled === true}
                      onChange={(e) => onChange({ aiIntroEnabled: e.target.checked })}
                      className="w-4 h-4 text-fuchsia-600 border-gray-300 rounded focus:ring-fuchsia-500 cursor-pointer"
                    />
                  </div>

                  {d.aiIntroEnabled === true && (
                    <div className="space-y-3 pt-2 border-t border-gray-50">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-gray-500">Intro Message Text</Label>
                        <Textarea
                          rows={2}
                          value={d.aiIntroMessage || ""}
                          onChange={(e) => onChange({ aiIntroMessage: e.target.value })}
                          placeholder="e.g. Hello! Welcome to our store. How can I help you today?"
                          className="text-xs rounded bg-gray-50 border border-gray-200"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-gray-500">Intro Response Type</Label>
                        <Select
                          value={d.aiIntroType || "text"}
                          onValueChange={(v) => onChange({ aiIntroType: v as any })}
                        >
                          <SelectTrigger className="h-8 text-xs rounded bg-gray-50 border border-gray-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text Message</SelectItem>
                            <SelectItem value="voice" disabled={d.aiVoiceEnabled !== true}>
                              Voice Message {d.aiVoiceEnabled !== true && "(Enable Voice first)"}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">System Instructions / Prompt</Label>
                  <Textarea
                    rows={4}
                    value={d.aiSystemPrompt || ""}
                    onChange={(e) => onChange({ aiSystemPrompt: e.target.value })}
                    placeholder="Instructions for the conversational takeover. You can reference variables like {{contactName}} or {{last_message}}."
                    className="text-xs rounded-lg bg-white"
                  />
                </div>

                {/* Custom Tools (Function Calling) Section */}
                <div className="space-y-3 pt-3 border-t border-fuchsia-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Custom Functions (Tools)
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentTools = Array.isArray(d.aiTools) ? d.aiTools : [];
                        const newTool = {
                          id: uid(),
                          name: "custom_function_" + (currentTools.length + 1),
                          description: "Trigger this function when the user asks...",
                          parametersJson: `{
  "type": "object",
  "properties": {}
}`
                        };
                        onChange({ aiTools: [...currentTools, newTool] });
                      }}
                      className="h-7 text-[10px] px-2 border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Function
                    </Button>
                  </div>

                  <div className="text-[10px] text-gray-400 leading-relaxed">
                    Define functions the AI Agent can call. Each function creates a routing handle on the right of the node to branch the flow execution.
                  </div>

                  <div className="space-y-3">
                    {(Array.isArray(d.aiTools) ? d.aiTools : []).map((tool: any, index: number) => (
                      <div key={tool.id || index} className="p-3 bg-white rounded-lg border border-fuchsia-100 space-y-2 relative shadow-sm">
                        <button
                          type="button"
                          onClick={() => {
                            const currentTools = [...(d.aiTools || [])];
                            currentTools.splice(index, 1);
                            onChange({ aiTools: currentTools });
                          }}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-gray-600">Function Name</Label>
                          <Input
                            value={tool.name || ""}
                            onChange={(e) => {
                              const currentTools = [...(d.aiTools || [])];
                              const cleanName = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                              currentTools[index] = { ...tool, name: cleanName };
                              onChange({ aiTools: currentTools });
                            }}
                            placeholder="e.g. handoff_to_human"
                            className="h-8 text-xs font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-gray-600">Description</Label>
                          <Textarea
                            rows={2}
                            value={tool.description || ""}
                            onChange={(e) => {
                              const currentTools = [...(d.aiTools || [])];
                              currentTools[index] = { ...tool, description: e.target.value };
                              onChange({ aiTools: currentTools });
                            }}
                            placeholder="e.g. Call this when the user requests a human operator"
                            className="text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-gray-600">Parameters Schema (JSON)</Label>
                          <Textarea
                            rows={3}
                            value={tool.parametersJson || ""}
                            onChange={(e) => {
                              const currentTools = [...(d.aiTools || [])];
                              currentTools[index] = { ...tool, parametersJson: e.target.value };
                              onChange({ aiTools: currentTools });
                            }}
                            placeholder='e.g. {"type": "object", "properties": {}}'
                            className="text-[10px] font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>
          )}

          {d.kind === "end" && (
            <>
              <SectionHeader>End Settings</SectionHeader>
              <div className="space-y-3 bg-red-50/50 rounded-xl p-4 border border-red-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">End Label (Optional)</Label>
                  <Input value={d.endMessage || ""} onChange={(e) => onChange({ endMessage: e.target.value })} placeholder="e.g., Conversation ended" className="h-9 text-sm rounded-lg bg-white" />
                  <div className="text-[10px] text-gray-400">Displayed on the End node in the canvas</div>
                </div>
              </div>
            </>
          )}

          {d.kind === "add_to_group" && (
            <>
              <SectionHeader>Group Settings</SectionHeader>
              <div className="space-y-3 bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-500" /> Select Group
                  </Label>
                  <Select
                    value={d.groupId || ""}
                    onValueChange={(v) => {
                      const group = (contactGroups as any[]).find((g: any) => g.id === v);
                      onChange({ groupId: v, groupName: group?.name || "" });
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg"><SelectValue placeholder="Select a group" /></SelectTrigger>
                    <SelectContent>
                      {(contactGroups as any[]).map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(contactGroups as any[]).length === 0 && (
                    <div className="text-[10px] text-gray-400 italic">No groups found. Create groups in Contact Management first.</div>
                  )}
                </div>
              </div>
            </>
          )}

          {d.kind === "delete_contact" && (
            <>
              <SectionHeader>Delete Contact</SectionHeader>
              <div className="space-y-3 bg-rose-50/50 rounded-xl p-4 border border-rose-100">
                <div className="text-xs text-rose-700 font-medium">
                  This action will permanently delete the contact and all associated chat logs from the CRM contacts directory.
                </div>
                <div className="text-[11px] text-gray-500">
                  Recommended for opt-out, unsubscribe, or spam prevention conditions.
                </div>
              </div>
            </>
          )}

          {d.kind === "update_contact" && (
            <>
              <SectionHeader>Contact Update</SectionHeader>
              <div className="space-y-3 bg-cyan-50/50 rounded-xl p-4 border border-cyan-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Field to Update</Label>
                  <Select value={d.contactField || "name"} onValueChange={(v) => onChange({ contactField: v })}>
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="notes">Notes</SelectItem>
                      <SelectItem value="tags">Tags</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">New Value</Label>
                  <Input
                    value={d.contactFieldValue || ""}
                    onChange={(e) => onChange({ contactFieldValue: e.target.value })}
                    placeholder="Enter value or use {{variable}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">Use {"{{variable_name}}"} to insert flow variable values</div>
                </div>
              </div>
            </>
          )}

          {d.kind === "set_variable" && (
            <>
              <SectionHeader>Variable Settings</SectionHeader>
              <div className="space-y-3 bg-violet-50/50 rounded-xl p-4 border border-violet-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Variable Name</Label>
                  <Input
                    value={d.variableName || ""}
                    onChange={(e) => onChange({ variableName: e.target.value })}
                    placeholder="e.g., user_category"
                    className="h-9 text-sm font-mono rounded-lg bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Value Source</Label>
                  <Select value={d.variableSource || "static"} onValueChange={(v) => onChange({ variableSource: v as any })}>
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">Static Value</SelectItem>
                      <SelectItem value="from_message">From Last Message</SelectItem>
                      <SelectItem value="from_webhook">From Webhook Response</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {d.variableSource === "static" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Value</Label>
                    <Input
                      value={d.variableValue || ""}
                      onChange={(e) => onChange({ variableValue: e.target.value })}
                      placeholder="Enter static value"
                      className="h-9 text-sm rounded-lg bg-white"
                    />
                  </div>
                )}
                {d.variableSource === "from_webhook" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">JSON Path</Label>
                    <Input
                      value={d.variableValue || ""}
                      onChange={(e) => onChange({ variableValue: e.target.value })}
                      placeholder="e.g., data.result.value"
                      className="h-9 text-sm font-mono rounded-lg bg-white"
                    />
                    <div className="text-[10px] text-gray-400">Dot-notation path from webhook response JSON</div>
                  </div>
                )}
              </div>
            </>
          )}

          {d.kind === "send_location" && (
            <>
              <SectionHeader>Location Details</SectionHeader>
              <div className="space-y-3 bg-rose-50/50 rounded-xl p-4 border border-rose-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Location Name</Label>
                  <Input
                    value={d.locationName || ""}
                    onChange={(e) => onChange({ locationName: e.target.value })}
                    placeholder="e.g., Our Office"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Address</Label>
                  <Input
                    value={d.locationAddress || ""}
                    onChange={(e) => onChange({ locationAddress: e.target.value })}
                    placeholder="e.g., 123 Main St, City"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Latitude</Label>
                    <Input
                      value={d.latitude || ""}
                      onChange={(e) => onChange({ latitude: e.target.value })}
                      placeholder="e.g., 28.6139"
                      className="h-9 text-sm rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Longitude</Label>
                    <Input
                      value={d.longitude || ""}
                      onChange={(e) => onChange({ longitude: e.target.value })}
                      placeholder="e.g., 77.2090"
                      className="h-9 text-sm rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {d.kind === "send_list_message" && (
            <>
              <SectionHeader>List Message</SectionHeader>
              <div className="space-y-3 bg-sky-50/50 rounded-xl p-4 border border-sky-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Body Text</Label>
                  <Textarea
                    rows={3}
                    value={d.message || ""}
                    onChange={(e) => onChange({ message: e.target.value })}
                    placeholder="Message shown above the list button"
                    className="text-sm resize-none rounded-lg bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Button Text</Label>
                  <Input
                    value={d.listButtonText || "View Options"}
                    onChange={(e) => onChange({ listButtonText: e.target.value })}
                    placeholder="View Options"
                    className="h-9 text-sm rounded-lg bg-white"
                    maxLength={20}
                  />
                  <div className="text-[10px] text-gray-400">Max 20 characters</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionHeader>Sections</SectionHeader>
                  <Button size="sm" variant="outline" onClick={addListSection} className="h-7 text-[10px] font-semibold rounded-lg">
                    <Plus className="w-3 h-3 mr-1" /> Add Section
                  </Button>
                </div>

                {(d.listSections || []).map((section, sIdx) => (
                  <div key={sIdx} className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={section.title}
                        onChange={(e) => updateListSection(sIdx, e.target.value)}
                        placeholder="Section title"
                        className="h-7 text-xs rounded-lg flex-1"
                      />
                      <Button size="sm" variant="ghost" onClick={() => removeListSection(sIdx)} className="h-7 w-7 p-0 text-red-400 rounded-lg">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>

                    {section.rows.map((row, rIdx) => (
                      <div key={row.id} className="pl-3 border-l-2 border-sky-200 space-y-1">
                        <div className="flex items-center gap-2">
                          <Input
                            value={row.title}
                            onChange={(e) => updateListRow(sIdx, rIdx, { title: e.target.value })}
                            placeholder="Item title"
                            className="h-7 text-xs rounded-lg flex-1"
                            maxLength={24}
                          />
                          <Button size="sm" variant="ghost" onClick={() => removeListRow(sIdx, rIdx)} className="h-7 w-7 p-0 text-red-400 rounded-lg">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <Input
                          value={row.description || ""}
                          onChange={(e) => updateListRow(sIdx, rIdx, { description: e.target.value })}
                          placeholder="Description (optional)"
                          className="h-6 text-[10px] rounded-lg"
                          maxLength={72}
                        />
                      </div>
                    ))}

                    <Button size="sm" variant="ghost" onClick={() => addListRow(sIdx)} className="h-6 text-[10px] text-sky-600 hover:text-sky-700 hover:bg-sky-50 w-full rounded-lg">
                      <Plus className="w-3 h-3 mr-1" /> Add Item
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {d.kind === "send_media" && (
            <>
              <SectionHeader>Media Settings</SectionHeader>
              <div className="space-y-3 bg-pink-50/50 rounded-xl p-4 border border-pink-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Media Type</Label>
                  <Select value={d.mediaType || "image"} onValueChange={(v) => onChange({ mediaType: v as any, mediaUrl: "", mediaId: "", mediaFileName: "", mediaSourceType: d.mediaSourceType || "url" })}>
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Source</Label>
                  <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
                    <button
                      type="button"
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${(d.mediaSourceType || "url") === "url" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                      onClick={() => onChange({ mediaSourceType: "url", mediaId: "", mediaFileName: "" })}
                    >
                      <LinkIcon className="w-3 h-3" /> URL
                    </button>
                    <button
                      type="button"
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${d.mediaSourceType === "upload" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                      onClick={() => onChange({ mediaSourceType: "upload", mediaUrl: "" })}
                    >
                      <Upload className="w-3 h-3" /> Upload
                    </button>
                  </div>
                </div>

                {(d.mediaSourceType || "url") === "url" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Media URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={d.mediaUrl || ""}
                        onChange={(e) => onChange({ mediaUrl: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                        className="h-9 text-sm rounded-lg bg-white flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs font-semibold border-pink-200 hover:border-pink-300 hover:bg-pink-50 text-pink-700 rounded-lg shrink-0 px-3"
                        onClick={() => setShowMediaGallery(true)}
                      >
                        <Image className="w-3.5 h-3.5 text-pink-500 mr-1" /> Gallery
                      </Button>
                    </div>
                    <div className="text-[10px] text-gray-400">Direct link to the media file or choose from library</div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Upload File</Label>
                    {d.mediaId ? (
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-pink-200">
                        <Paperclip className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                        <span className="text-xs text-gray-700 truncate flex-1">{d.mediaFileName || "Uploaded file"}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          onClick={() => onChange({ mediaId: "", mediaFileName: "" })}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="file"
                            accept={
                              d.mediaType === "image" ? "image/jpeg,image/png,image/webp" :
                              d.mediaType === "video" ? "video/mp4,video/3gpp" :
                              d.mediaType === "audio" ? "audio/aac,audio/mp4,audio/mpeg,audio/ogg,audio/opus" :
                              ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                            }
                            className="hidden"
                            id="media-upload-input"
                            disabled={mediaUploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !channelId) return;

                              const maxSizes: Record<string, number> = {
                                image: 40 * 1024 * 1024,      // 40MB
                                video: 40 * 1024 * 1024,     // 40MB
                                audio: 40 * 1024 * 1024,     // 40MB
                                document: 100 * 1024 * 1024, // 100MB
                              };
                              const mediaType = d.mediaType || "image";
                              const maxSize = maxSizes[mediaType] || 16 * 1024 * 1024;
                              if (file.size > maxSize) {
                                const maxSizeMB = maxSize / (1024 * 1024);
                                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                                toast({
                                  title: "File too large",
                                  description: `The maximum file size allowed for ${mediaType} is ${maxSizeMB}MB. Selected file is ${fileSizeMB}MB.`,
                                  variant: "destructive",
                                });
                                e.target.value = "";
                                return;
                              }

                              setMediaUploading(true);
                              try {
                                const formData = new FormData();
                                formData.append("mediaFile", file);
                                formData.append("mediaType", d.mediaType || "image");
                                const res = await fetch(`/api/whatsapp/channels/${channelId}/upload-media`, {
                                  method: "POST",
                                  body: formData,
                                  credentials: "include",
                                });
                                const data = await res.json();
                                if (data.success && data.mediaId) {
                                  onChange({ mediaId: data.mediaId, mediaFileName: file.name });
                                  toast({ title: "File uploaded successfully" });
                                } else {
                                  toast({ title: "Upload failed", description: data.message || "Please try again", variant: "destructive" });
                                }
                              } catch {
                                toast({ title: "Upload failed", description: "Network error", variant: "destructive" });
                              } finally {
                                setMediaUploading(false);
                                e.target.value = "";
                              }
                            }}
                          />
                          <label
                            htmlFor="media-upload-input"
                            className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed border-pink-200 rounded-lg cursor-pointer hover:border-pink-400 hover:bg-pink-50/50 transition-all ${mediaUploading ? "opacity-50 pointer-events-none" : ""}`}
                          >
                            {mediaUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 text-pink-500 animate-spin" />
                                <span className="text-xs text-gray-500">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 text-pink-500" />
                                <span className="text-xs text-gray-500">Click to upload {d.mediaType || "image"}</span>
                              </>
                            )}
                          </label>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full h-9 text-xs font-semibold border-pink-200 hover:border-pink-300 hover:bg-pink-50 text-pink-700 rounded-lg"
                          onClick={() => setShowMediaGallery(true)}
                        >
                          <Image className="w-3.5 h-3.5 mr-1.5 text-pink-500" /> Choose from Gallery
                        </Button>
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400 mt-1">
                      {d.mediaType === "image" ? "JPG, PNG, WebP (max 40MB)" :
                       d.mediaType === "video" ? "MP4, 3GPP (max 40MB)" :
                       d.mediaType === "audio" ? "AAC, MP4, MPEG, OGG, Opus (max 40MB)" :
                       "PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT (max 100MB)"}
                    </div>
                  </div>
                )}

                {(d.mediaType === "image" || d.mediaType === "video" || d.mediaType === "document") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Caption (Optional)</Label>
                    <Textarea
                      rows={5}
                      value={d.mediaCaption || ""}
                      onChange={(e) => onChange({ mediaCaption: e.target.value })}
                      placeholder="Add a caption (supports multiline text and variables)..."
                      className="text-sm rounded-lg bg-white min-h-[100px]"
                    />
                  </div>
                )}

                {/* Media Preview Player */}
                {(d.mediaUrl || (d.mediaId && d.mediaId.startsWith("http"))) && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-pink-100">
                    <Label className="text-xs font-semibold text-gray-700">Preview</Label>
                    <div className="relative rounded-lg overflow-hidden border border-pink-200 bg-black flex items-center justify-center min-h-[150px] max-h-[250px]">
                      {d.mediaType === "image" && (
                        <img
                          src={d.mediaUrl || d.mediaId}
                          alt="Media Preview"
                          className="max-h-[250px] w-full object-contain"
                        />
                      )}
                      {d.mediaType === "video" && (
                        <video
                          src={d.mediaUrl || d.mediaId}
                          controls
                          className="max-h-[250px] w-full object-contain"
                        />
                      )}
                      {d.mediaType === "audio" && (
                        <div className="w-full p-4 bg-gray-50 flex flex-col items-center justify-center">
                          <audio src={d.mediaUrl || d.mediaId} controls className="w-full" />
                        </div>
                      )}
                      {d.mediaType === "document" && (
                        <div className="w-full p-4 bg-gray-50 flex items-center gap-2">
                          <FileIcon className="w-8 h-8 text-pink-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate text-gray-700">{d.mediaFileName || "Document"}</p>
                            <a
                              href={d.mediaUrl || d.mediaId}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-pink-600 hover:underline font-mono truncate block"
                            >
                              Open document
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {d.kind === "send_contact_message" && (
            <>
              <SectionHeader>Channel Settings</SectionHeader>
              <div className="space-y-3 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 mb-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-500" /> Send From Channel
                  </Label>
                  <Select
                    value={d.sendContactChannelId || "default"}
                    onValueChange={(v) => onChange({ sendContactChannelId: v === "default" ? "" : v })}
                  >
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg">
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default (Automation Channel)</SelectItem>
                      {channelsList.map((ch: any) => (
                        <SelectItem key={ch.id} value={ch.id}>
                          {ch.name} ({ch.phoneNumber || ch.connectionMethod})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SectionHeader>Recipient Contacts</SectionHeader>
              <div className="space-y-4 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                {/* Search input for contacts */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Search Contacts</Label>
                  <Input
                    placeholder="Search by name or phone..."
                    value={searchContactQuery}
                    onChange={(e) => setSearchContactQuery(e.target.value)}
                    className="h-9 text-sm bg-white rounded-lg"
                  />
                </div>

                {/* Scrollable list of checkboxes */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700 flex justify-between">
                    <span>Select Contacts</span>
                    <span className="text-[10px] text-gray-400">
                      {d.targetContactIds?.length || 0} selected
                    </span>
                  </Label>
                  <ScrollArea className="h-40 border border-gray-200 rounded-lg p-2 bg-white">
                    {contactsList.length === 0 ? (
                      <div className="text-[10px] text-gray-400 italic p-2">No contacts found.</div>
                    ) : (
                      (() => {
                        const filtered = contactsList.filter(
                          (c: any) =>
                            c.name?.toLowerCase().includes(searchContactQuery.toLowerCase()) ||
                            c.phone?.includes(searchContactQuery)
                        );
                        if (filtered.length === 0) {
                          return <div className="text-[10px] text-gray-400 italic p-2">No matching contacts.</div>;
                        }
                        return filtered.map((c: any) => {
                          const isChecked = d.targetContactIds?.includes(c.id) || false;
                          return (
                            <div key={c.id} className="flex items-center space-x-2 py-1 px-1 hover:bg-gray-50 rounded">
                              <Checkbox
                                id={`contact-${c.id}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const currentIds = d.targetContactIds || [];
                                  let newIds;
                                  if (checked) {
                                    newIds = [...currentIds, c.id];
                                  } else {
                                    newIds = currentIds.filter((id) => id !== c.id);
                                  }
                                  onChange({ targetContactIds: newIds });
                                }}
                              />
                              <label
                                htmlFor={`contact-${c.id}`}
                                className="text-xs text-gray-700 cursor-pointer select-none truncate flex-1"
                                title={`${c.name} (${c.phone})`}
                              >
                                {c.name} <span className="text-[10px] text-gray-400">({c.phone})</span>
                              </label>
                            </div>
                          );
                        });
                      })()
                    )}
                  </ScrollArea>
                </div>
              </div>

              <SectionHeader>Message Content</SectionHeader>
              <div className="space-y-4 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Message Text</Label>
                  <Textarea
                    placeholder="Enter your message..."
                    value={d.message || ""}
                    onChange={(e) => onChange({ message: e.target.value })}
                    className="min-h-[100px] text-sm bg-white rounded-lg"
                  />
                  <p className="text-[10px] text-gray-400 leading-normal">
                    To reference the <strong>receiving agent/contact</strong>, use: <code className="bg-gray-100 px-1 rounded">{"{{name}}"}</code>, <code className="bg-gray-100 px-1 rounded">{"{{phone}}"}</code>.
                    <br />
                    To reference the <strong>incoming contact (customer who triggered this flow)</strong>, use: <code className="bg-gray-100 px-1 rounded">{"{{incoming_name}}"}</code>, <code className="bg-gray-100 px-1 rounded">{"{{incoming_phone}}"}</code>, <code className="bg-gray-100 px-1 rounded">{"{{incoming_email}}"}</code>, or any of their custom flow variables (e.g. <code className="bg-gray-100 px-1 rounded">{"{{company}}"}</code>).
                  </p>
                </div>
              </div>
            </>
          )}

          {d.kind === "mark_as_read" && (
            <>
              <SectionHeader>Read Receipt</SectionHeader>
              <div className="space-y-2 bg-lime-50/50 rounded-xl p-4 border border-lime-100">
                <div className="flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-lime-600" />
                  <span className="text-xs text-gray-600">Sends read receipts (blue ticks) for the last incoming message from the customer.</span>
                </div>
                <div className="text-[10px] text-gray-400">No configuration needed. This node automatically marks the conversation as read.</div>
              </div>
            </>
          )}

          <div className="h-10" />
        </div>
      </ScrollArea>
      <MediaGalleryDialog
        open={showMediaGallery}
        onOpenChange={setShowMediaGallery}
        onSelect={(url, name) => {
          onChange({
            mediaUrl: url,
            mediaFileName: name,
            mediaSourceType: "url",
          });
          setShowMediaGallery(false);
        }}
        allowedTypes={
          d.mediaType === "image" ? ["image"] :
          d.mediaType === "video" ? ["video"] :
          d.mediaType === "audio" ? ["audio"] :
          d.mediaType === "document" ? ["document"] :
          undefined
        }
      />
    </div>
  );
}
