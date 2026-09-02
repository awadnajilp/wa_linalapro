import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Plus,
  Send,
  CloudUpload,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calendar,
  Layers,
  Inbox,
  Workflow,
  Search,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useChannelContext } from "@/contexts/channel-context";
import { apiRequest } from "@/lib/queryClient";
import { FlowEditorDialog } from "@/components/whatsapp-flows/FlowEditorDialog";
import { FlowResponsesDialog } from "@/components/whatsapp-flows/FlowResponsesDialog";
import { SendFlowDialog } from "@/components/whatsapp-flows/SendFlowDialog";

export default function WhatsAppFlows() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeChannel } = useChannelContext();

  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all_flows");

  // Dialog states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<any | null>(null);
  const [responsesOpen, setResponsesOpen] = useState(false);
  const [viewingResponsesFlow, setViewingResponsesFlow] = useState<any | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendingFlow, setSendingFlow] = useState<any | null>(null);

  const userIdNew = user?.role === "team" ? user?.createdBy : user?.id;

  // Fetch Channels
  const { data: channelsResponse } = useQuery({
    queryKey: ["/api/channels/user", userIdNew],
    queryFn: async () => {
      if (!userIdNew) return { data: [] };
      const res = await apiRequest("POST", "/api/channels/userid", {
        userId: userIdNew,
        page: 1,
        limit: 100,
      });
      return res.json();
    },
    enabled: !!userIdNew,
  });

  const channels = Array.isArray(channelsResponse?.data)
    ? channelsResponse.data
    : activeChannel
    ? [activeChannel]
    : [];

  const currentChannelId =
    selectedChannelId ||
    activeChannel?.id ||
    (channels[0]?.id || "");

  // Fetch Flows
  const { data: flowsData, isLoading, refetch } = useQuery<{ status: string; data: any[] }>({
    queryKey: ["whatsapp-flows", currentChannelId],
    queryFn: async () => {
      const url = currentChannelId
        ? `/api/whatsapp-flows?channelId=${currentChannelId}`
        : "/api/whatsapp-flows";
      const res = await fetch(url, {
        headers: currentChannelId ? { "x-channel-id": currentChannelId } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch WhatsApp Flows");
      return res.json();
    },
  });

  const flows = flowsData?.data || [];

  // Mutations
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!currentChannelId) throw new Error("Please select a WhatsApp Channel to sync with Meta.");
      const res = await fetch("/api/whatsapp-flows/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: currentChannelId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to sync flows from Meta");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-flows"] });
      toast({
        title: "Meta Flows Synced",
        description: data.message || "All Flows updated from Meta WABA successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Sync Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/whatsapp-flows/seed-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: currentChannelId || null }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to seed sample templates");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-flows"] });
      toast({
        title: "Sample Templates Seeded",
        description: "5 standard interactive WhatsApp Flow templates are now ready to customize.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Seeding Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (flowId: string) => {
      const res = await fetch(`/api/whatsapp-flows/${flowId}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to publish flow on Meta");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-flows"] });
      toast({
        title: "Flow Published! 🚀",
        description: "WhatsApp Flow is now live and ready to send to customers.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Publish Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (flowId: string) => {
      const res = await fetch(`/api/whatsapp-flows/${flowId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to delete flow");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-flows"] });
      toast({
        title: "Flow Deleted",
        description: "WhatsApp Flow was removed successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Delete Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Filtered flows
  const filteredFlows = flows.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.name?.toLowerCase().includes(q) ||
      f.flowId?.toLowerCase().includes(q) ||
      (f.triggerKeywords || []).some((kw: string) => kw.toLowerCase().includes(q))
    );
  });

  // Calculate stats
  const totalFlows = flows.length;
  const publishedFlows = flows.filter((f) => f.status === "PUBLISHED").length;
  const totalSubmissions = flows.reduce((acc, f) => acc + (f.responseCount || 0), 0);
  const activeKeywords = flows.reduce((acc, f) => acc + (f.triggerKeywords?.length || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="bg-purple-500/30 text-purple-200 border border-purple-400/30 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Meta Official Feature
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full text-xs font-medium">
              Marketplace Addon
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Meta WhatsApp Flows
          </h1>
          <p className="text-sm text-purple-200/80 max-w-2xl">
            Build and deploy interactive native WhatsApp forms, surveys, and multi-step workflows. Capture customer submissions directly in your CRM with zero friction.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {channels.length > 1 && (
            <Select value={currentChannelId} onValueChange={setSelectedChannelId}>
              <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white hover:bg-white/20">
                <SelectValue placeholder="Select Channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((ch: any) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    {ch.name || ch.phoneNumber || ch.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sync from Meta
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingFlow(null);
              setEditorOpen(true);
            }}
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold flex items-center gap-1.5 shadow-lg shadow-purple-500/30"
          >
            <Plus className="w-4 h-4" /> Create Flow
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Flows
              </p>
              <h3 className="text-2xl font-bold mt-1 text-gray-900">{totalFlows}</h3>
            </div>
            <Workflow className="w-8 h-8 text-purple-500/80" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Published on Meta
              </p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{publishedFlows}</h3>
            </div>
            <ShieldCheck className="w-8 h-8 text-emerald-500/80" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Submissions
              </p>
              <h3 className="text-2xl font-bold mt-1 text-blue-600">{totalSubmissions}</h3>
            </div>
            <FileSpreadsheet className="w-8 h-8 text-blue-500/80" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Active Keywords
              </p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">{activeKeywords}</h3>
            </div>
            <Tag className="w-8 h-8 text-amber-500/80" />
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
          <TabsList>
            <TabsTrigger value="all_flows" className="flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              My Flows ({flows.length})
            </TabsTrigger>
            <TabsTrigger value="samples" className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              Pre-built Templates
            </TabsTrigger>
          </TabsList>

          {activeTab === "all_flows" && (
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search flows..."
                  className="pl-9 h-9 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-9 px-2.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          )}
        </div>

        {/* TAB 1: ALL FLOWS */}
        <TabsContent value="all_flows" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-16 bg-white rounded-xl border">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
              <p className="text-sm font-medium text-gray-600">Loading WhatsApp Flows...</p>
            </div>
          ) : filteredFlows.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300 space-y-4">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto">
                <Workflow className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-semibold text-gray-900 text-lg">No WhatsApp Flows Found</h3>
                <p className="text-xs text-gray-500">
                  {searchQuery
                    ? "No flows match your search filter."
                    : "Create your first interactive form or load standard sample templates to get started."}
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                >
                  <BookOpen className="w-4 h-4 mr-1.5" />
                  Load Sample Templates
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingFlow(null);
                    setEditorOpen(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create New Flow
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredFlows.map((flow) => {
                const isPublished = flow.status === "PUBLISHED";
                const isDeprecated = flow.status === "DEPRECATED";

                return (
                  <Card
                    key={flow.id}
                    className="hover:shadow-md transition-all duration-200 border-gray-200 flex flex-col justify-between"
                  >
                    <CardHeader className="p-4 pb-2 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-base line-clamp-1">
                              {flow.name}
                            </h3>
                          </div>
                          {flow.flowId && (
                            <p className="text-[11px] font-mono text-gray-400">
                              ID: {flow.flowId}
                            </p>
                          )}
                        </div>

                        <Badge
                          variant={
                            isPublished
                              ? "default"
                              : isDeprecated
                              ? "secondary"
                              : "outline"
                          }
                          className={
                            isPublished
                              ? "bg-emerald-600 text-white"
                              : isDeprecated
                              ? "bg-gray-200 text-gray-700"
                              : "border-amber-400 text-amber-700 bg-amber-50"
                          }
                        >
                          {flow.status || "DRAFT"}
                        </Badge>
                      </div>

                      {/* Categories */}
                      {flow.categories && flow.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {flow.categories.map((cat: string) => (
                            <span
                              key={cat}
                              className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium"
                            >
                              {cat.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      {/* Body Message text */}
                      <p className="text-xs text-gray-600 line-clamp-2 italic bg-gray-50 p-2 rounded border border-gray-100">
                        "{flow.bodyText || "Please complete the interactive form below"}"
                      </p>

                      {/* Submissions & Triggers row */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t">
                        <div
                          className="flex items-center gap-1.5 text-blue-600 font-semibold cursor-pointer hover:underline"
                          onClick={() => {
                            setViewingResponsesFlow(flow);
                            setResponsesOpen(true);
                          }}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>{flow.responseCount || 0} Submissions</span>
                        </div>

                        {flow.triggerKeywords && flow.triggerKeywords.length > 0 ? (
                          <div className="flex items-center gap-1 text-purple-600 text-[11px] font-medium">
                            <Tag className="w-3 h-3" />
                            <span>{flow.triggerKeywords.length} Triggers</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">No triggers</span>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-[#00a884] hover:bg-[#008f6f] text-white text-xs h-8"
                          onClick={() => {
                            setSendingFlow(flow);
                            setSendOpen(true);
                          }}
                        >
                          <Send className="w-3 h-3 mr-1" /> Send Flow
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs text-gray-700"
                          onClick={() => {
                            setEditingFlow(flow);
                            setEditorOpen(true);
                          }}
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!isPublished && (
                              <DropdownMenuItem
                                onClick={() => publishMutation.mutate(flow.id)}
                                className="text-emerald-600 font-medium"
                              >
                                <CloudUpload className="w-4 h-4 mr-2" />
                                Publish to Meta
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setViewingResponsesFlow(flow);
                                setResponsesOpen(true);
                              }}
                            >
                              <FileSpreadsheet className="w-4 h-4 mr-2" />
                              View Submissions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(flow.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Flow
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: PRE-BUILT TEMPLATES */}
        <TabsContent value="samples" className="space-y-4">
          <div className="flex items-center justify-between bg-purple-50 p-4 rounded-xl border border-purple-100">
            <div>
              <h3 className="font-semibold text-purple-900 text-sm">
                Official Pre-Configured Flow Templates
              </h3>
              <p className="text-xs text-purple-700 mt-0.5">
                Ready-to-use Meta Flow JSON structures designed for top business use cases.
              </p>
            </div>
            <Button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
            >
              {seedMutation.isPending && <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Install All 5 Templates
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sampleTemplatesList.map((tpl) => (
              <Card key={tpl.id} className="border-gray-200 flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <tpl.icon className="w-5 h-5" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {tpl.category}
                    </span>
                  </div>
                  <CardTitle className="text-base font-bold text-gray-900">
                    {tpl.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {tpl.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-1 text-xs">
                    <span className="font-semibold text-gray-700">Form Fields:</span>
                    <p className="text-gray-600">{tpl.fields}</p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Tag className="w-3 h-3 text-purple-500" />
                    <span>Keywords: {tpl.keywords.join(", ")}</span>
                  </div>

                  <Button
                    onClick={() => {
                      setEditingFlow({
                        name: tpl.name,
                        categories: [tpl.metaCategory],
                        headerText: tpl.header,
                        bodyText: tpl.body,
                        footerText: "Powered by WhatsApp Flows",
                        ctaButtonText: tpl.cta,
                        triggerKeywords: tpl.keywords,
                        flowJson: tpl.json,
                      });
                      setEditorOpen(true);
                    }}
                    variant="outline"
                    className="w-full text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Use This Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <FlowEditorDialog
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        flow={editingFlow}
        channelId={currentChannelId}
        channels={channels}
      />

      <FlowResponsesDialog
        isOpen={responsesOpen}
        onClose={() => setResponsesOpen(false)}
        flow={viewingResponsesFlow}
      />

      <SendFlowDialog
        isOpen={sendOpen}
        onClose={() => setSendOpen(false)}
        flow={sendingFlow}
        flows={flows}
        channelId={currentChannelId}
      />
    </div>
  );
}

const sampleTemplatesList = [
  {
    id: "lead_gen",
    name: "Lead Qualification Form",
    category: "Lead Generation",
    metaCategory: "LEAD_GENERATION",
    icon: Sparkles,
    description: "Capture prospect requirements, budget, industry, and contact info directly in chat.",
    fields: "Full Name, Company, Email, Industry Dropdown, Budget Range, Project Details",
    keywords: ["lead", "quote", "pricing", "inquiry"],
    header: "💼 Business Inquiry",
    body: "Please complete our quick qualification form so we can assign the best specialist for you.",
    cta: "Start Form",
    json: {
      version: "6.0",
      screens: [
        {
          id: "SCREEN_LEAD",
          title: "Lead Qualification",
          terminal: true,
          data: {},
          layout: {
            type: "SingleColumnLayout",
            children: [
              { type: "TextHeading", text: "Tell us about your requirements" },
              { type: "TextInput", name: "full_name", label: "Full Name", required: true },
              { type: "TextInput", name: "company_name", label: "Company Name", required: true },
              { type: "TextInput", name: "work_email", label: "Work Email", required: true, input_type: "email" },
              {
                type: "Dropdown",
                name: "budget",
                label: "Estimated Budget",
                required: true,
                options: [
                  { id: "b1", title: "Under $1,000" },
                  { id: "b2", title: "$1,000 - $5,000" },
                  { id: "b3", title: "$5,000 - $15,000" },
                  { id: "b4", title: "$15,000+" },
                ],
              },
              { type: "TextArea", name: "project_details", label: "Project Notes", required: false },
              {
                type: "Footer",
                label: "Submit Application",
                on_click_action: {
                  name: "complete",
                  payload: {
                    full_name: "${form.full_name}",
                    company_name: "${form.company_name}",
                    work_email: "${form.work_email}",
                    budget: "${form.budget}",
                    project_details: "${form.project_details}",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: "feedback_nps",
    name: "Customer Feedback & NPS",
    category: "Surveys & Reviews",
    metaCategory: "SURVEY",
    icon: CheckCircle2,
    description: "Collect CSAT/NPS ratings, feature reviews, and improvement suggestions.",
    fields: "NPS Rating (1-10), Liked Aspects Checkboxes, Suggestions Comments",
    keywords: ["feedback", "review", "rate", "survey"],
    header: "⭐ Experience Survey",
    body: "How was your recent experience with our team? Your review helps us improve.",
    cta: "Give Feedback",
    json: {
      version: "6.0",
      screens: [
        {
          id: "SCREEN_SURVEY",
          title: "Feedback Survey",
          terminal: true,
          data: {},
          layout: {
            type: "SingleColumnLayout",
            children: [
              { type: "TextHeading", text: "Rate your experience" },
              {
                type: "Dropdown",
                name: "nps_rating",
                label: "Rating (1 - 10)",
                required: true,
                options: [
                  { id: "10", title: "10 - Extremely Likely 🌟" },
                  { id: "8", title: "8 - Likely" },
                  { id: "5", title: "5 - Average" },
                  { id: "1", title: "1 - Unlikely" },
                ],
              },
              { type: "TextArea", name: "suggestions", label: "Comments or Suggestions", required: false },
              {
                type: "Footer",
                label: "Submit Feedback",
                on_click_action: {
                  name: "complete",
                  payload: {
                    nps_rating: "${form.nps_rating}",
                    suggestions: "${form.suggestions}",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: "appointment_booking",
    name: "Appointment & Consultation",
    category: "Booking & Scheduling",
    metaCategory: "APPOINTMENT_BOOKING",
    icon: Calendar,
    description: "Let clients pick consultation type, preferred date, and time slot directly in WhatsApp.",
    fields: "Service Selection, Date Picker, Time Slot Dropdown, Meeting Notes",
    keywords: ["book", "appointment", "schedule", "meeting", "consultation"],
    header: "📅 Schedule Consultation",
    body: "Choose your preferred date and time slot for a personalized consultation.",
    cta: "Book Appointment",
    json: {
      version: "6.0",
      screens: [
        {
          id: "SCREEN_BOOKING",
          title: "Book Appointment",
          terminal: true,
          data: {},
          layout: {
            type: "SingleColumnLayout",
            children: [
              { type: "TextHeading", text: "Select your session details" },
              {
                type: "Dropdown",
                name: "service_type",
                label: "Service",
                required: true,
                options: [
                  { id: "audit", title: "Initial Strategy Audit (30 Min)" },
                  { id: "demo", title: "Product Demo (45 Min)" },
                ],
              },
              { type: "DatePicker", name: "preferred_date", label: "Preferred Date", required: true },
              {
                type: "Dropdown",
                name: "time_slot",
                label: "Preferred Time Slot",
                required: true,
                options: [
                  { id: "m1", title: "10:00 AM - 11:00 AM" },
                  { id: "a1", title: "02:00 PM - 03:00 PM" },
                  { id: "e1", title: "05:00 PM - 06:00 PM" },
                ],
              },
              {
                type: "Footer",
                label: "Confirm Booking",
                on_click_action: {
                  name: "complete",
                  payload: {
                    service_type: "${form.service_type}",
                    preferred_date: "${form.preferred_date}",
                    time_slot: "${form.time_slot}",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
];
