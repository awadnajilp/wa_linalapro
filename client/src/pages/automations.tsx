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

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Bot,
  Trash2,
  Edit,
  GitBranch,
  Clock,
  Workflow,
  Zap,
  Activity,
  BarChart3,
  Layers,
  ArrowRight,
  FileEdit,
  X,
  Sparkles,
  Loader2,
  Search,
  Download,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth-context";
import AutomationFlowBuilder from "@/components/automation-flow-builder/AutomationFlowBuilder";
import { useTranslation } from "@/lib/i18n";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Automation = {
  id: string;
  name: string;
  description?: string;
  status: "active" | "inactive" | "paused";
  trigger: string;
  executionCount: number | null;
  lastExecutedAt?: string | null;
  automation_nodes?: any[];
  automation_edges?: any[];
};

interface AutomationDraft {
  id: string;
  name: string;
  description: string;
  trigger: string;
  nodes: any[];
  edges: any[];
  channelId: string;
  savedAt: string;
}

function getDraftStorageKey(channelId: string) {
  return `automation_drafts_${channelId}`;
}

function loadDrafts(channelId: string): AutomationDraft[] {
  try {
    const raw = localStorage.getItem(getDraftStorageKey(channelId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDrafts(channelId: string, drafts: AutomationDraft[]) {
  localStorage.setItem(getDraftStorageKey(channelId), JSON.stringify(drafts));
}

function deleteDraft(channelId: string, draftId: string) {
  const drafts = loadDrafts(channelId).filter((d) => d.id !== draftId);
  saveDrafts(channelId, drafts);
}

export default function Automations() {
  const [showFlowBuilder, setShowFlowBuilder] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<any>(null);
  const { toast } = useToast();

  const { data: activeChannel } = useQuery({
    queryKey: ["/api/channels/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });

  const [drafts, setDrafts] = useState<AutomationDraft[]>([]);
  const [activeTab, setActiveTab] = useState<"flows" | "data" | "logs">("flows");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "name" | "phone">("all");
  const [selectedFlowId, setSelectedFlowId] = useState<string>("all");
  const [selectedContactForLogs, setSelectedContactForLogs] = useState<any | null>(null);

  const { data: flowData = [], isLoading: isLoadingFlowData } = useQuery<any[]>({
    queryKey: ["/api/automations/executions/flow-data", activeChannel?.id, searchQuery, filterType, selectedFlowId],
    queryFn: async () => {
      if (!activeChannel?.id) return [];
      const queryParams = new URLSearchParams();
      queryParams.append("channelId", activeChannel.id);
      if (searchQuery) {
        queryParams.append("search", searchQuery);
      }
      if (filterType !== "all") {
        queryParams.append("searchType", filterType);
      }
      if (selectedFlowId !== "all") {
        queryParams.append("automationId", selectedFlowId);
      }
      const res = await fetch(`/api/automations/executions/flow-data?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch flow data");
      return await res.json();
    },
    enabled: !!activeChannel?.id && activeTab === "data",
  });

  const { data: logsSummary = [], isLoading: isLoadingLogsSummary, refetch: refetchLogsSummary } = useQuery<any[]>({
    queryKey: ["/api/automations/executions/logs/summary", activeChannel?.id],
    queryFn: async () => {
      if (!activeChannel?.id) return [];
      const res = await fetch(`/api/automations/executions/logs/summary?channelId=${activeChannel.id}`);
      if (!res.ok) throw new Error("Failed to fetch logs summary");
      return await res.json();
    },
    enabled: !!activeChannel?.id && activeTab === "logs",
  });

  const { data: contactExecutions = [], isLoading: isLoadingContactExecutions } = useQuery<any[]>({
    queryKey: ["/api/automations/executions/logs/contact", selectedContactForLogs?.contactId],
    queryFn: async () => {
      if (!selectedContactForLogs?.contactId) return [];
      const res = await fetch(`/api/automations/executions/logs/contact/${selectedContactForLogs.contactId}`);
      if (!res.ok) throw new Error("Failed to fetch contact executions");
      return await res.json();
    },
    enabled: !!selectedContactForLogs?.contactId,
  });

  const clearMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const res = await fetch(`/api/automations/executions/logs/contact/${contactId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to clear flow logs");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Logs Cleared",
        description: "All flow run records for this number have been successfully deleted.",
      });
      refetchLogsSummary();
      setSelectedContactForLogs(null);
    },
    onError: (err: any) => {
      toast({
        title: "Clear Failed",
        description: err.message || "Failed to clear execution logs.",
        variant: "destructive",
      });
    },
  });

  const exportToExcel = async (data: any[]) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Flow Data");

      if (data.length === 0) {
        toast({ title: "Export failed", description: "No data to export.", variant: "destructive" });
        return;
      }

      // Collect all unique custom variable keys (excluding keys starting with '_')
      const variableKeys = Array.from(new Set(
        data.flatMap(row => {
          const vars = row.variables || {};
          return Object.keys(vars).filter(k => !k.startsWith('_') && ![
            'message',
            'trigger',
            'channelId',
            'contactId',
            'timestamp',
            'conversationId',
            'whatsappMessageId',
            'matchedKeyword',
            'lastConditionResult'
          ].includes(k));
        })
      ));

      // Define columns
      const columns = [
        { header: "Date/Time", key: "dateTime", width: 25 },
        { header: "Flow Name", key: "flowName", width: 25 },
        { header: "Contact Name", key: "contactName", width: 20 },
        { header: "Contact Phone", key: "contactPhone", width: 20 },
        { header: "Status", key: "status", width: 15 },
        ...variableKeys.map(key => ({
          header: key,
          key: `var_${key}`,
          width: 20
        }))
      ];

      worksheet.columns = columns;

      // Add rows
      data.forEach(row => {
        const vars = row.variables || {};
        const rowData: any = {
          dateTime: format(new Date(row.startedAt), "yyyy-MM-dd HH:mm:ss"),
          flowName: row.flowName || "",
          contactName: row.contactName || "Unknown",
          contactPhone: row.contactPhone || "",
          status: row.status || ""
        };

        // Populate variables
        variableKeys.forEach(key => {
          const val = vars[key];
          rowData[`var_${key}`] = typeof val === 'object' ? JSON.stringify(val) : (val ?? '');
        });

        worksheet.addRow(rowData);
      });

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `flow_collected_data_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
      toast({ title: "Data exported successfully", description: "Excel file download started." });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  const { t } = useTranslation();
  const { user } = useAuth();

  useEffect(() => {
    if (activeChannel?.id) {
      setDrafts(loadDrafts(activeChannel.id));
    }
  }, [activeChannel?.id]);

  const { data: automations = [], isLoading } = useQuery<Automation[]>({
    queryKey: ["/api/automations", activeChannel?.id],
    queryFn: async () => {
      if (!activeChannel?.id) return [];
      const res = await fetch(`/api/automations?channelId=${activeChannel.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to fetch automations");
      return data as Promise<Automation[]>;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/automations/${id}/toggle`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to toggle automation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({ title: "Automation status updated" });
    },
    onError: () => {
      toast({
        title: "Failed to update automation",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/automations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete automation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({ title: "Automation deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to delete automation",
        variant: "destructive",
      });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      if (!activeChannel?.id) throw new Error("No active channel");
      const response = await fetch("/api/automations/seed-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ channelId: activeChannel.id }),
      });
      if (!response.ok) throw new Error("Failed to load templates");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({
        title: "Sample templates loaded!",
        description: `${data.created?.length || 0} automation templates have been added. They are inactive by default — review and activate them when ready.`,
      });
    },
    onError: () => {
      toast({ title: "Failed to load templates", variant: "destructive" });
    },
  });

  const handleCreateNew = () => {
    setSelectedAutomation(null);
    setShowFlowBuilder(true);
  };

  const handleEdit = (automation: any) => {
    setSelectedAutomation(automation);
    setShowFlowBuilder(true);
  };

  const handleResumeDraft = (draft: AutomationDraft) => {
    setSelectedAutomation({
      _isDraft: true,
      _draftId: draft.id,
      name: draft.name,
      description: draft.description,
      trigger: draft.trigger,
      automation_nodes: draft.nodes,
      automation_edges: draft.edges,
    });
    setShowFlowBuilder(true);
  };

  const handleDeleteDraft = (draftId: string) => {
    if (!activeChannel?.id) return;
    deleteDraft(activeChannel.id, draftId);
    setDrafts(loadDrafts(activeChannel.id));
    toast({ title: "Draft deleted" });
  };

  const refreshDrafts = useCallback(() => {
    if (activeChannel?.id) {
      setDrafts(loadDrafts(activeChannel.id));
    }
  }, [activeChannel?.id]);

  const handleCloseFlowBuilder = () => {
    setShowFlowBuilder(false);
    setSelectedAutomation(null);
    queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
  };

  const activeCount = automations.filter((a: any) => a.status === "active").length;
  const totalExecutions = automations.reduce((sum: number, a: any) => sum + (a.executionCount || 0), 0);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-4 w-20 bg-gray-100 rounded mb-2" />
              <div className="h-6 w-10 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse">
              <div className="h-5 w-40 bg-gray-200 rounded mb-3" />
              <div className="h-4 w-full bg-gray-100 rounded mb-2" />
              <div className="h-4 w-2/3 bg-gray-100 rounded mb-4" />
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <div className="h-8 flex-1 bg-gray-100 rounded" />
                <div className="h-8 flex-1 bg-gray-100 rounded" />
                <div className="h-8 flex-1 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Automation Flows</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage conversation flows with drag-and-drop visual builder</p>
        </div>
        <div className="flex items-center gap-2">
          {automations.length === 0 && (
            <Button
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="gap-1.5"
            >
              {seedMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Load Sample Templates
            </Button>
          )}
          <Button
            onClick={handleCreateNew}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create New Flow
          </Button>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("flows")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "flows"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Flows
        </button>
        <button
          onClick={() => setActiveTab("data")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "data"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Collected Flow Data
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "logs"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Flow Run Logs
        </button>
      </div>

      {activeTab === "flows" ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Layers className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Flows</p>
                <p className="text-lg font-semibold text-gray-900">{automations.length}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                <Activity className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active Flows</p>
                <p className="text-lg font-semibold text-gray-900">{activeCount}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Executions</p>
                <p className="text-lg font-semibold text-gray-900">{totalExecutions}</p>
              </div>
            </div>
          </div>

          {drafts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-amber-500" />
                Unsaved Drafts ({drafts.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="bg-amber-50/50 border border-amber-200 rounded-lg p-4 hover:border-amber-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileEdit className="h-4 w-4 text-amber-500 shrink-0" />
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {draft.name || "Untitled Draft"}
                        </h3>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] shrink-0">
                        Draft
                      </Badge>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-3">
                      Saved {format(new Date(draft.savedAt), "MMM d, h:mm a")}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-8 text-amber-700 border-amber-300 hover:bg-amber-100"
                        onClick={() => handleResumeDraft(draft)}
                      >
                        <Edit className="h-3 w-3 mr-1" /> Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                        onClick={() => handleDeleteDraft(draft.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {automations.length === 0 && drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white border border-gray-200 rounded-lg">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Workflow className="h-7 w-7 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {t("automations.empityAuto.title")}
              </h3>
              <p className="text-sm text-gray-500 max-w-sm text-center mb-5">
                {t("automations.empityAuto.Subtitle")}
              </p>
              <Button
                onClick={handleCreateNew}
                data-testid="button-create-first-automation"
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                {t("automations.empityAuto.buttonTitle")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {automations.map((automation: any) => {
                const isActive = automation.status === "active";
                const nodeCount = automation.automation_nodes?.length || 0;
                const edgeCount = automation.automation_edges?.length || 0;

                return (
                  <div
                    key={automation.id}
                    className="bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                    data-testid={`card-automation-${automation.id}`}
                  >
                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${isActive ? "bg-green-500" : "bg-gray-300"}`} />
                          <h3
                            className="font-medium text-sm text-gray-900 truncate"
                            data-testid={`text-name-${automation.id}`}
                          >
                            {automation.name}
                          </h3>
                        </div>
                        <Switch
                          checked={isActive}
                          onCheckedChange={() => toggleMutation.mutate(automation.id)}
                          disabled={user?.username === "demouser" || toggleMutation.isPending}
                          data-testid={`button-toggle-${automation.id}`}
                          className="data-[state=checked]:bg-green-500 shrink-0"
                        />
                      </div>
                    </div>

                    <div className="px-4 pb-3">
                      {automation.description ? (
                        <p
                          className="text-xs text-gray-500 line-clamp-2 mb-3"
                          data-testid={`text-description-${automation.id}`}
                        >
                          {automation.description}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic mb-3">
                          No description
                        </p>
                      )}

                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          <Zap className="h-3 w-3" />
                          {automation.trigger || "New Chat"}
                        </span>
                        <Badge
                          variant={isActive ? "default" : "secondary"}
                          className={`text-[10px] px-1.5 py-0 rounded font-medium ${isActive ? "bg-green-100 text-green-700 hover:bg-green-100 border-0" : "bg-gray-100 text-gray-500 hover:bg-gray-100 border-0"}`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          {nodeCount} nodes
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Workflow className="h-3 w-3" />
                          {edgeCount} edges
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          {automation.executionCount || 0} runs
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs h-9 text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-none font-medium"
                        onClick={() => handleEdit(automation)}
                        data-testid={`button-edit-${automation.id}`}
                        disabled={user?.username === "demouser"}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <div className="w-px h-5 bg-gray-100" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs h-9 text-gray-600 hover:text-red-600 hover:bg-red-50/50 rounded-none font-medium"
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this automation?"
                            )
                          ) {
                            deleteMutation.mutate(automation.id);
                          }
                        }}
                        disabled={
                          user?.username === "demouser"
                            ? true
                            : deleteMutation.isPending
                        }
                        data-testid={`button-delete-${automation.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : activeTab === "data" ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 border border-gray-200 rounded-lg">
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <Select value={filterType} onValueChange={(val: any) => setFilterType(val)}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Search by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Name or Phone</SelectItem>
                  <SelectItem value="name">Name Only</SelectItem>
                  <SelectItem value="phone">Phone Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Flows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Flows</SelectItem>
                  {automations.map((flow) => (
                    <SelectItem key={flow.id} value={flow.id}>
                      {flow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => exportToExcel(flowData)}
              disabled={flowData.length === 0}
              variant="outline"
              className="w-full md:w-auto gap-1.5 shrink-0 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-medium"
            >
              <Download className="h-4 w-4 text-gray-500" />
              Export to Excel
            </Button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {isLoadingFlowData ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-500" />
                <p className="text-sm">Loading collected flow data...</p>
              </div>
            ) : flowData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center px-4">
                <Workflow className="h-10 w-10 text-gray-300 mb-3" />
                <h3 className="text-sm font-semibold text-gray-700">No collected variables found</h3>
                <p className="text-xs text-gray-500 max-w-xs mt-1">Variables collected during flow executions (excluding system variables) will list here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="p-4">Date/Time</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Flow Name</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Collected Data (Variables)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {flowData.map((row: any) => {
                      const customVars = Object.entries(row.variables || {}).filter(
                        ([k]) => !k.startsWith('_') && ![
                          'message',
                          'trigger',
                          'channelId',
                          'contactId',
                          'timestamp',
                          'conversationId',
                          'whatsappMessageId',
                          'matchedKeyword',
                          'lastConditionResult'
                        ].includes(k)
                      );
                      const formattedTime = format(new Date(row.startedAt), "MMM d, yyyy h:mm a");

                      return (
                        <tr key={row.executionId} className="hover:bg-gray-50/50">
                          <td className="p-4 whitespace-nowrap text-xs text-gray-500">
                            {formattedTime}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{row.contactName || "Unknown Contact"}</div>
                            <div className="text-xs text-gray-500">{row.contactPhone || "No Phone"}</div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="font-medium text-gray-700">{row.flowName}</span>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <Badge
                              variant={row.status === "completed" ? "default" : row.status === "paused" ? "secondary" : "destructive"}
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                row.status === "completed"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : row.status === "paused"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {row.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {customVars.length === 0 ? (
                              <span className="text-xs text-gray-400 italic">No variables collected</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {customVars.map(([key, val]) => (
                                  <Badge
                                    key={key}
                                    variant="outline"
                                    className="bg-blue-50/50 border-blue-200 text-blue-800 text-[10px] py-0.5 px-2 rounded-md font-mono flex items-center gap-1 max-w-[220px] truncate"
                                  >
                                    <span className="font-semibold text-blue-500 shrink-0">{key}:</span>
                                    <span className="truncate">{typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}</span>
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {isLoadingLogsSummary ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-500" />
                <p className="text-sm">Loading flow run summaries...</p>
              </div>
            ) : logsSummary.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center px-4">
                <History className="h-10 w-10 text-gray-300 mb-3" />
                <h3 className="text-sm font-semibold text-gray-700">No flow logs found</h3>
                <p className="text-xs text-gray-500 max-w-xs mt-1">Users executing flows will list here with their run histories.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="p-4">Contact</th>
                      <th className="p-4">Total Runs</th>
                      <th className="p-4">Last Active</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {logsSummary.map((row: any) => (
                      <tr key={row.contactId} className="hover:bg-gray-50/50">
                        <td className="p-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{row.contactName || "Unknown Contact"}</div>
                          <div className="text-xs text-gray-500">{row.contactPhone || "No Phone"}</div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 font-semibold px-2.5 py-0.5 rounded">
                            {row.totalRuns} runs
                          </Badge>
                        </td>
                        <td className="p-4 whitespace-nowrap text-xs text-gray-500">
                          {row.lastRunAt ? format(new Date(row.lastRunAt), "MMM d, yyyy h:mm a") : "N/A"}
                        </td>
                        <td className="p-4 whitespace-nowrap text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs font-medium border-gray-200 text-gray-700 hover:bg-gray-50 gap-1"
                            onClick={() => setSelectedContactForLogs(row)}
                          >
                            <History className="h-3 w-3 text-gray-500" />
                            Flow Logs
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flow Logs Modal */}
      <Dialog open={!!selectedContactForLogs} onOpenChange={(open) => { if (!open) setSelectedContactForLogs(null); }}>
        <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="pb-4 border-b border-gray-150">
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Flow Logs: {selectedContactForLogs?.contactName || "Unknown Contact"}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-0.5">
                  All automation executions for {selectedContactForLogs?.contactPhone || "No Phone"}
                </DialogDescription>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 shrink-0 text-xs"
                onClick={() => {
                  if (selectedContactForLogs && confirm("Are you sure you want to clear all flow runs for this number? This will delete all variable histories and execution records.")) {
                    clearMutation.mutate(selectedContactForLogs.contactId);
                  }
                }}
                disabled={clearMutation.isPending}
              >
                {clearMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Clear Logs
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 min-h-[250px]">
            {isLoadingContactExecutions ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-500" />
                <p className="text-sm">Loading runs history...</p>
              </div>
            ) : contactExecutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center">
                <History className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-700">No runs found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {contactExecutions.map((run: any) => {
                  const runTime = format(new Date(run.startedAt), "MMM d, yyyy h:mm a");
                  return (
                    <div key={run.executionId} className="p-4 border border-gray-150 rounded-lg bg-gray-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-gray-900 text-sm">{run.flowName}</span>
                          <span className="text-xs text-gray-500 ml-2">({runTime})</span>
                        </div>
                        <Badge
                          variant={run.status === "completed" ? "default" : run.status === "paused" ? "secondary" : "destructive"}
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            run.status === "completed"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : run.status === "paused"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {run.status}
                        </Badge>
                      </div>

                      {run.error && (
                        <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-100 font-mono">
                          <strong>Error:</strong> {run.error}
                        </div>
                      )}

                      {run.result && run.result !== run.error && (
                        <div className="text-xs text-gray-600 bg-white p-2.5 rounded border border-gray-150">
                          <strong>Result:</strong> {run.result}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFlowBuilder} onOpenChange={(open) => { if (!open) handleCloseFlowBuilder(); else setShowFlowBuilder(true); }}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 [&>button.absolute]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Automation Flow Builder</DialogTitle>
            <DialogDescription>
              Create and edit automation workflows
            </DialogDescription>
          </DialogHeader>

          <AutomationFlowBuilder
            automation={selectedAutomation}
            channelId={activeChannel?.id}
            onClose={handleCloseFlowBuilder}
            onDraftSaved={refreshDrafts}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
