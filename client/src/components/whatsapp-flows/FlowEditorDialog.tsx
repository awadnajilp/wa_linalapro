import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Code2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Send,
  CloudUpload,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface FlowEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  flow?: any | null;
  channelId?: string;
  channels?: any[];
}

const CATEGORIES_LIST = [
  { id: "LEAD_GENERATION", label: "Lead Generation" },
  { id: "SURVEY", label: "Survey & Feedback" },
  { id: "APPOINTMENT_BOOKING", label: "Appointment Booking" },
  { id: "CUSTOMER_SUPPORT", label: "Customer Support" },
  { id: "OTHER", label: "Other / Custom" },
];

export function FlowEditorDialog({
  isOpen,
  onClose,
  flow,
  channelId: initialChannelId,
  channels = [],
}: FlowEditorDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState(initialChannelId || "");
  const [categories, setCategories] = useState<string[]>(["OTHER"]);
  const [headerText, setHeaderText] = useState("");
  const [bodyText, setBodyText] = useState("Please complete the interactive form below:");
  const [footerText, setFooterText] = useState("Powered by WhatsApp Flows");
  const [ctaButtonText, setCtaButtonText] = useState("Start Form");
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [autoSaveContactFields, setAutoSaveContactFields] = useState(true);
  const [syncToMeta, setSyncToMeta] = useState(false);
  const [flowJsonStr, setFlowJsonStr] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("settings");

  useEffect(() => {
    if (flow) {
      setName(flow.name || "");
      setChannelId(flow.channelId || initialChannelId || "");
      setCategories(flow.categories || ["OTHER"]);
      setHeaderText(flow.headerText || "");
      setBodyText(flow.bodyText || "Please complete the interactive form below:");
      setFooterText(flow.footerText || "Powered by WhatsApp Flows");
      setCtaButtonText(flow.ctaButtonText || "Start Form");
      setTriggerKeywords(flow.triggerKeywords || []);
      setAutoSaveContactFields(flow.autoSaveContactFields !== false);
      setSyncToMeta(!!flow.flowId);
      setFlowJsonStr(
        typeof flow.flowJson === "object"
          ? JSON.stringify(flow.flowJson, null, 2)
          : flow.flowJson || "{}"
      );
      setJsonError(null);
    } else {
      setName("");
      setChannelId(initialChannelId || (channels[0]?.id || ""));
      setCategories(["OTHER"]);
      setHeaderText("");
      setBodyText("Please complete the interactive form below:");
      setFooterText("Powered by WhatsApp Flows");
      setCtaButtonText("Start Form");
      setTriggerKeywords([]);
      setAutoSaveContactFields(true);
      setSyncToMeta(false);
      setFlowJsonStr(JSON.stringify(defaultFlowJson, null, 2));
      setJsonError(null);
    }
  }, [flow, isOpen, initialChannelId, channels]);

  const validateJson = (str: string) => {
    try {
      const parsed = JSON.parse(str);
      if (!parsed.version) {
        setJsonError("Warning: 'version' property is recommended in Meta Flow JSON (e.g. '6.0' or '3.0')");
      } else if (!parsed.screens || !Array.isArray(parsed.screens)) {
        setJsonError("Warning: 'screens' array is missing in Meta Flow JSON");
      } else {
        setJsonError(null);
      }
      return parsed;
    } catch (e: any) {
      setJsonError(`Invalid JSON: ${e.message}`);
      return null;
    }
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setFlowJsonStr(val);
    validateJson(val);
  };

  const handleAddKeyword = () => {
    if (!keywordInput.trim()) return;
    const clean = keywordInput.trim().toLowerCase();
    if (!triggerKeywords.includes(clean)) {
      setTriggerKeywords([...triggerKeywords, clean]);
    }
    setKeywordInput("");
  };

  const handleRemoveKeyword = (kw: string) => {
    setTriggerKeywords(triggerKeywords.filter((k) => k !== kw));
  };

  const toggleCategory = (catId: string) => {
    if (categories.includes(catId)) {
      if (categories.length > 1) {
        setCategories(categories.filter((c) => c !== catId));
      }
    } else {
      setCategories([...categories, catId]);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let parsedJson = {};
      try {
        parsedJson = JSON.parse(flowJsonStr);
      } catch (e: any) {
        throw new Error("Please fix JSON errors before saving.");
      }

      const payload = {
        name,
        channelId: channelId || null,
        categories,
        headerText,
        bodyText,
        footerText,
        ctaButtonText,
        triggerKeywords,
        autoSaveContactFields,
        syncToMeta,
        flowJson: parsedJson,
      };

      const url = flow ? `/api/whatsapp-flows/${flow.id}` : "/api/whatsapp-flows";
      const method = flow ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save WhatsApp Flow");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-flows"] });
      toast({
        title: flow ? "Flow Updated" : "Flow Created",
        description: flow
          ? "WhatsApp Flow has been updated successfully."
          : "New WhatsApp Flow created successfully.",
      });
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-purple-600" />
            {flow ? `Edit Flow: ${flow.name}` : "Create Meta WhatsApp Flow"}
          </DialogTitle>
          <DialogDescription>
            Configure interactive WhatsApp Flow forms, trigger keywords, and JSON screens.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              General Settings
            </TabsTrigger>
            <TabsTrigger value="flow_json" className="flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              Flow JSON Definition
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Message Preview
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: GENERAL SETTINGS */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="flow-name" className="font-semibold">
                  Flow Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="flow-name"
                  placeholder="e.g. Lead Qualification 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel-select" className="font-semibold">
                  Assigned WhatsApp Channel
                </Label>
                <Select value={channelId} onValueChange={setChannelId}>
                  <SelectTrigger id="channel-select">
                    <SelectValue placeholder="Select Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((ch: any) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        {ch.name || ch.phoneNumber || ch.id} ({ch.connectionMethod || "Channel"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label className="font-semibold">Categories</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES_LIST.map((cat) => {
                  const isSelected = categories.includes(cat.id);
                  return (
                    <Badge
                      key={cat.id}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer py-1 px-3 text-xs"
                      onClick={() => toggleCategory(cat.id)}
                    >
                      {cat.label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Interactive Message Content */}
            <div className="border rounded-lg p-4 bg-gray-50/50 space-y-3">
              <h4 className="font-medium text-sm text-gray-900">
                Interactive Invitation Card (WhatsApp Message)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="header-text" className="text-xs">
                    Header Text (Optional)
                  </Label>
                  <Input
                    id="header-text"
                    placeholder="e.g. 💼 Business Inquiry"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cta-btn" className="text-xs">
                    CTA Button Text
                  </Label>
                  <Input
                    id="cta-btn"
                    placeholder="e.g. Start Form"
                    value={ctaButtonText}
                    onChange={(e) => setCtaButtonText(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="body-text" className="text-xs">
                  Body Message Text <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="body-text"
                  rows={2}
                  placeholder="Please complete the interactive form below:"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="footer-text" className="text-xs">
                  Footer Text (Optional)
                </Label>
                <Input
                  id="footer-text"
                  placeholder="e.g. Takes less than a minute"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                />
              </div>
            </div>

            {/* Trigger Keywords */}
            <div className="space-y-2">
              <Label className="font-semibold">Autoresponder Trigger Keywords</Label>
              <p className="text-xs text-muted-foreground">
                When a contact messages any of these keywords, this Flow will be launched automatically.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Type keyword and press Enter or Add..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddKeyword}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>

              {triggerKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {triggerKeywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="secondary"
                      className="flex items-center gap-1 bg-purple-50 text-purple-700 border-purple-200"
                    >
                      {kw}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-red-500"
                        onClick={() => handleRemoveKeyword(kw)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Automation & CRM Toggles */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Auto-Save Submitted Data to Contact Variables</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically sync form responses into contact custom attributes and CRM contact cards.
                  </p>
                </div>
                <Switch
                  checked={autoSaveContactFields}
                  onCheckedChange={setAutoSaveContactFields}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <CloudUpload className="w-4 h-4 text-blue-600" />
                    Sync with Meta Cloud API Graph
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Directly validate and upload this Flow JSON asset to Meta WhatsApp Business API.
                  </p>
                </div>
                <Switch checked={syncToMeta} onCheckedChange={setSyncToMeta} />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: FLOW JSON DEFINITION */}
          <TabsContent value="flow_json" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">Meta Flow JSON Specification</h4>
                <p className="text-xs text-muted-foreground">
                  Valid Meta Flow JSON (version 6.0/3.0) with screens, components, and payload actions.
                </p>
              </div>

              {jsonError ? (
                <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {jsonError}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 flex items-center gap-1 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Valid JSON
                </Badge>
              )}
            </div>

            <Textarea
              className="font-mono text-xs bg-slate-950 text-emerald-400 p-4 rounded-lg min-h-[380px] focus-visible:ring-purple-500"
              value={flowJsonStr}
              onChange={handleJsonChange}
            />
          </TabsContent>

          {/* TAB 3: MESSAGE PREVIEW */}
          <TabsContent value="preview" className="space-y-4">
            <div className="flex justify-center p-6 bg-slate-100 rounded-xl">
              <div className="max-w-sm w-full bg-[#EFEAE2] p-4 rounded-xl shadow-md space-y-2">
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 space-y-2 text-sm text-gray-800">
                  {headerText && (
                    <div className="font-bold text-gray-900 text-sm border-b pb-1">
                      {headerText}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {bodyText || "Please complete the interactive form below:"}
                  </div>
                  {footerText && (
                    <div className="text-[11px] text-gray-500 pt-1">
                      {footerText}
                    </div>
                  )}

                  <div className="pt-2 border-t mt-2">
                    <Button
                      type="button"
                      className="w-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center gap-2 font-medium"
                      size="sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      {ctaButtonText || "Start Form"}
                    </Button>
                  </div>
                </div>
                <div className="text-[10px] text-right text-gray-500">
                  12:00 PM ✓✓
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {saveMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
            {flow ? "Update Flow" : "Save & Create Flow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const defaultFlowJson = {
  version: "6.0",
  screens: [
    {
      id: "SCREEN_ONE",
      title: "Interactive Form",
      terminal: true,
      data: {},
      layout: {
        type: "SingleColumnLayout",
        children: [
          {
            type: "TextHeading",
            text: "Welcome",
          },
          {
            type: "TextInput",
            name: "full_name",
            label: "Your Full Name",
            required: true,
          },
          {
            type: "TextInput",
            name: "email",
            label: "Email Address",
            required: true,
            input_type: "email",
          },
          {
            type: "Footer",
            label: "Submit Form",
            on_click_action: {
              name: "complete",
              payload: {
                full_name: "${form.full_name}",
                email: "${form.email}",
              },
            },
          },
        ],
      },
    },
  ],
};
