import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import { DollarSign, Briefcase, Plus, Shuffle, TrendingUp, User, Trash2, Calendar, AlertCircle, Minimize2, Cpu, Play, Pause, RotateCcw } from "lucide-react";

interface InboxDealSidebarProps {
  contactId: string;
  channelId: string;
  contactName?: string;
  conversationId?: string;
}

export default function InboxDealSidebar({ contactId, channelId, contactName, conversationId }: InboxDealSidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Active Execution Type
  interface ActiveExecution {
    executionId: string;
    startedAt: string;
    status: string;
    flowName: string;
    flowId: string;
    currentNodeId: string;
  }

  // Query: get active executions for this conversation
  const { data: activeExecutions = [], refetch: refetchExecutions, isLoading: isLoadingExecutions } = useQuery<ActiveExecution[]>({
    queryKey: ["/api/automations/executions/active/conversation", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const res = await apiRequest("GET", `/api/automations/executions/active/conversation/${conversationId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!conversationId,
  });

  // Mutations for execution controls
  const pauseMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/automations/executions/conversation/${conversationId}/pause`);
    },
    onSuccess: () => {
      toast({
        title: "Automation Paused",
        description: "The running flow has been successfully paused.",
      });
      refetchExecutions();
    }
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/automations/executions/conversation/${conversationId}/resume`);
    },
    onSuccess: () => {
      toast({
        title: "Automation Resumed",
        description: "The flow execution has been resumed.",
      });
      refetchExecutions();
    }
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/automations/executions/conversation/${conversationId}/reset`);
    },
    onSuccess: () => {
      toast({
        title: "Automation Reset",
        description: "The flow execution has been stopped/cancelled.",
      });
      refetchExecutions();
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return localStorage.getItem("inbox-pipeline-minimized") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("inbox-pipeline-minimized", String(isMinimized));
    } catch (e) {
      // ignore
    }
  }, [isMinimized]);

  // Form states
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("0.00");
  const [currency, setCurrency] = useState("USD");
  const [pipelineId, setPipelineId] = useState("");
  const [stageId, setStageId] = useState("");
  const [status, setStatus] = useState("open");
  const [lostReason, setLostReason] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  // Query: get deal for this contact
  const { data: deal, isLoading: isLoadingDeal, refetch: refetchDeal } = useQuery<any>({
    queryKey: ["/api/crm/deals/contact", contactId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/crm/deals/contact/${contactId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!contactId,
  });

  // Query: pipelines for selector
  const { data: pipelines = [] } = useQuery<any[]>({
    queryKey: ["/api/crm/pipelines", channelId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/crm/pipelines?channelId=${channelId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!channelId,
  });

  // Query: stages for selected pipeline
  const activePipelineId = pipelineId || (pipelines.length > 0 ? pipelines[0].id : "");
  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ["/api/crm/stages", activePipelineId],
    queryFn: async () => {
      if (!activePipelineId) return [];
      const res = await apiRequest("GET", `/api/crm/stages?pipelineId=${activePipelineId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activePipelineId,
  });

  // Query: team members for selector
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/team/members"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/team/members?limit=1000");
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
  });

  // Load deal variables
  useEffect(() => {
    if (deal) {
      setTitle(deal.title || "");
      setValue(deal.value || "0.00");
      setCurrency(deal.currency || "USD");
      setStageId(deal.stageId || "");
      setStatus(deal.status || "open");
      setLostReason(deal.lostReason || "");
      setAssignedTo(deal.assignedTo || "");
      setIsEditing(false);
    } else {
      setTitle(`${contactName || "Contact"} Deal`);
      setValue("0.00");
      setCurrency("USD");
      setStageId("");
      setStatus("open");
      setLostReason("");
      setAssignedTo("");
      setIsEditing(true); // default to create form
    }
  }, [deal, contactName]);

  // Sync pipeline selection when deal stage is resolved
  useEffect(() => {
    if (deal && stages.length > 0 && !pipelineId) {
      const activeStage = stages.find((s) => s.id === deal.stageId);
      if (activeStage) {
        setPipelineId(activeStage.pipelineId);
      }
    }
  }, [deal, stages, pipelineId]);

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/crm/deals", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Deal Created",
        description: "The lead has been successfully added to your CRM pipeline.",
      });
      refetchDeal();
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", channelId] });
    },
  });

  // Update deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("PUT", `/api/crm/deals/${deal.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Deal Updated",
        description: "Deal parameters have been successfully updated.",
      });
      refetchDeal();
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", channelId] });
    },
  });

  // Transition stage mutation
  const transitionStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const res = await apiRequest("PUT", `/api/crm/deals/${deal.id}/stage`, { stageId });
      return res.json();
    },
    onSuccess: (updated) => {
      toast({
        title: "Stage Transformed",
        description: `Deal stage updated successfully.`,
      });
      refetchDeal();
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", channelId] });
    },
  });

  // Delete deal mutation
  const deleteDealMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/crm/deals/${deal.id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Deal Deleted",
        description: "The deal was successfully removed from the database.",
      });
      refetchDeal();
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", channelId] });
    },
  });

  const handleCreate = () => {
    if (!stageId) {
      toast({
        title: "Stage Required",
        description: "Please select an initial pipeline stage to register this deal.",
        variant: "destructive",
      });
      return;
    }
    createDealMutation.mutate({
      contactId,
      channelId,
      stageId,
      title,
      value,
      currency,
      assignedTo: assignedTo === "_empty" || assignedTo === "" ? null : assignedTo,
      status,
    });
  };

  const handleUpdate = () => {
    updateDealMutation.mutate({
      title,
      value,
      currency,
      assignedTo: assignedTo === "_empty" || assignedTo === "" ? null : assignedTo,
      status,
      lostReason: status === "lost" ? lostReason : null,
    });
  };

  if (isLoadingDeal) {
    return (
      <div className={`border-l border-gray-200 bg-white flex flex-col items-center justify-center p-6 shrink-0 transition-all duration-300 ${isMinimized ? "w-12 overflow-hidden" : "w-80"}`}>
        {isMinimized ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(false)}
            className="h-8 w-8 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full"
            title="Expand Pipeline"
          >
            <Briefcase className="w-5 h-5 text-indigo-500" />
          </Button>
        ) : (
          <>
            <Loading />
            <p className="text-xs text-gray-400 mt-2">Loading CRM Deal...</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`border-l border-gray-200 bg-white flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out ${isMinimized ? "w-12" : "w-80"}`}>
      {isMinimized ? (
        <div className="flex flex-col items-center py-4 h-full overflow-hidden select-none">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(false)}
            className="h-8 w-8 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full mb-4"
            title="Expand Pipeline"
          >
            <Briefcase className="w-5 h-5 text-indigo-500" />
          </Button>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">
              CRM Pipeline
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="p-4 border-b border-gray-150 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-1.5 font-semibold text-gray-800 text-sm">
              <Briefcase className="w-4 h-4 text-indigo-500" />
              CRM Pipeline Deal
            </div>
            <div className="flex items-center gap-1">
              {deal && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs text-indigo-600 font-medium px-2 py-1 h-7"
                >
                  {isEditing ? "Cancel" : "Edit Details"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(true)}
                className="h-7 w-7 text-gray-400 hover:text-gray-600 rounded-md"
                title="Minimize Pipeline"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="p-4 flex-1 space-y-4 overflow-y-auto">
            {deal && !isEditing ? (
              // Deal View
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-gray-900 leading-snug">{deal.title}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="font-semibold text-slate-800 bg-slate-100 rounded px-1.5 py-0.5">
                      {Number(deal.value).toLocaleString(undefined, { minimumFractionDigits: 2 })} {deal.currency}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className={`px-1.5 py-0.5 rounded font-medium text-[10px] ${
                      deal.status === "won" ? "bg-emerald-100 text-emerald-800" :
                      deal.status === "lost" ? "bg-rose-100 text-rose-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {deal.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Stage Selector */}
                <div className="space-y-1.5 border-t border-gray-100 pt-3">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Pipeline Stage</Label>
                  <Select 
                    value={deal.stageId} 
                    onValueChange={(val) => transitionStageMutation.mutate(val)}
                    disabled={transitionStageMutation.isPending}
                  >
                    <SelectTrigger className="h-9 bg-white border-gray-200">
                      <SelectValue placeholder="Select Stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Owner Details */}
                {deal.assignedTo && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase font-bold text-gray-400">Assigned Agent</p>
                      <p className="text-xs font-semibold text-gray-700">
                        {teamMembers.find((m) => m.id === deal.assignedTo)?.name || 
                         teamMembers.find((m) => m.id === deal.assignedTo)?.username || "WABA Owner"}
                      </p>
                    </div>
                  </div>
                )}

                {deal.status === "lost" && deal.lostReason && (
                  <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-xs text-rose-800 flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Reason for Lost:</span> {deal.lostReason}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Deal Form (Create / Edit)
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Deal Title</Label>
                  <Input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="Deal Title" 
                    className="border-gray-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Value</Label>
                    <Input 
                      type="number" 
                      value={value} 
                      onChange={(e) => setValue(e.target.value)} 
                      className="border-gray-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="border-gray-200 bg-white">
                        <SelectValue placeholder="USD" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="AED">AED (د.إ)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Only show Pipeline/Stage selectors on Creation */}
                {!deal && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Pipeline</Label>
                      <Select value={pipelineId} onValueChange={setPipelineId}>
                        <SelectTrigger className="border-gray-200 bg-white">
                          <SelectValue placeholder="Select Pipeline" />
                        </SelectTrigger>
                        <SelectContent>
                          {pipelines.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Stage</Label>
                      <Select value={stageId} onValueChange={setStageId}>
                        <SelectTrigger className="border-gray-200 bg-white">
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
                  </>
                )}

                {deal && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Deal Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="border-gray-200 bg-white">
                        <SelectValue placeholder="Open" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {status === "lost" && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <Label className="text-xs font-semibold text-gray-750">Reason for Lost</Label>
                    <Input 
                      value={lostReason} 
                      onChange={(e) => setLostReason(e.target.value)} 
                      placeholder="E.g., Competitor pricing" 
                      className="border-gray-205"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Assignee</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger className="border-gray-200 bg-white">
                      <SelectValue placeholder="No assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_empty">Unassigned</SelectItem>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name || m.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    onClick={deal ? handleUpdate : handleCreate}
                    disabled={createDealMutation.isPending || updateDealMutation.isPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                  >
                    {deal ? "Save Deal Changes" : "Add to Pipeline"}
                  </Button>

                  {deal && (
                    <Button
                      variant="destructive"
                      onClick={() => deleteDealMutation.mutate()}
                      disabled={deleteDealMutation.isPending}
                      className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Deal
                    </Button>
                  )}
                </div>
              </div>
            )}

            {conversationId && (
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-gray-650 uppercase tracking-wider flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> Active Automations
                  </Label>
                  {activeExecutions.length > 0 && (
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {activeExecutions.length}
                    </span>
                  )}
                </div>

                {isLoadingExecutions ? (
                  <div className="flex items-center justify-center py-4">
                    <Loading />
                  </div>
                ) : activeExecutions.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No running automation flows for this contact.</p>
                ) : (
                  <div className="space-y-3">
                    {activeExecutions.map((exec) => {
                      const isSuspended = exec.status === "suspended";
                      return (
                        <div key={exec.executionId} className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-gray-800 leading-snug">{exec.flowName}</p>
                              <p className="text-[10px] text-gray-400">
                                Started: {new Date(exec.startedAt).toLocaleString()}
                              </p>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded font-semibold text-[9px] uppercase tracking-wide border ${
                              isSuspended ? "bg-amber-100 text-amber-800 border-amber-250" :
                              exec.status === "paused" ? "bg-indigo-100 text-indigo-800 border-indigo-200" :
                              "bg-emerald-100 text-emerald-800 border-emerald-200"
                            }`}>
                              {exec.status}
                            </span>
                          </div>

                          <div className="flex gap-2 pt-1">
                            {isSuspended ? (
                              <Button
                                onClick={() => resumeMutation.mutate()}
                                disabled={resumeMutation.isPending}
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 border-emerald-200 hover:bg-emerald-50 bg-white"
                              >
                                <Play className="w-3 h-3 mr-1 shrink-0" /> Resume
                              </Button>
                            ) : (
                              <Button
                                onClick={() => pauseMutation.mutate()}
                                disabled={pauseMutation.isPending}
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 text-[11px] font-semibold text-amber-700 hover:text-amber-800 border-amber-200 hover:bg-amber-50 bg-white"
                              >
                                <Pause className="w-3 h-3 mr-1 shrink-0" /> Pause
                              </Button>
                            )}

                            <Button
                              onClick={() => resetMutation.mutate()}
                              disabled={resetMutation.isPending}
                              size="sm"
                              variant="outline"
                              className="flex-1 h-7 text-[11px] font-semibold text-rose-700 hover:text-rose-800 border-rose-200 hover:bg-rose-50 bg-white"
                            >
                              <RotateCcw className="w-3 h-3 mr-1 shrink-0" /> Reset Flow
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
