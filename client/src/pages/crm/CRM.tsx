import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useChannelContext } from "@/contexts/channel-context";
import { Loading } from "@/components/ui/loading";
import { 
  Briefcase, 
  TrendingUp, 
  Plus, 
  Shuffle, 
  Settings, 
  Layers, 
  DollarSign, 
  User, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Filter,
  Clock,
  MessageSquare,
  Search
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import CadencesSettingsDialog from "@/components/crm/CadencesSettingsDialog";
import { useAuth } from "@/contexts/auth-context";
import { useTranslation } from "@/lib/i18n";

export default function CRM() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { selectedChannel } = useChannelContext();
  const channelId = selectedChannel?.id;

  const [viewMode, setViewMode] = useState<"board" | "list" | "performance">("board");
  const [listStageFilter, setListStageFilter] = useState("all");
  const [listPage, setListPage] = useState(1);
  const listLimit = 10;
  const [masterSearchQuery, setMasterSearchQuery] = useState("");
  const [performancePeriod, setPerformancePeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [targetDealsWon, setTargetDealsWon] = useState<string>("10");
  const [targetValueWon, setTargetValueWon] = useState<string>("1000.00");
  
  const [reportEmail, setReportEmail] = useState<string>("");
  const [reportDailyEnabled, setReportDailyEnabled] = useState<boolean>(false);
  const [reportWeeklyEnabled, setReportWeeklyEnabled] = useState<boolean>(false);

  const [activePipelineId, setActivePipelineId] = useState<string>("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [targetAddStageId, setTargetAddStageId] = useState("");
  const [isCadencesOpen, setIsCadencesOpen] = useState(false);

  // CRM Settings state
  const [isLeadQualificationEnabled, setIsLeadQualificationEnabled] = useState(false);
  const [qualificationFlowId, setQualificationFlowId] = useState<string | null>(null);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showEditContactDropdown, setShowEditContactDropdown] = useState(false);

  // New Deal Form states
  const [newDealTitle, setNewDealTitle] = useState("");
  const [newDealValue, setNewDealValue] = useState("0.00");
  const [newDealCurrency, setNewDealCurrency] = useState("USD");
  const [newDealContactId, setNewDealContactId] = useState("");
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [newDealAgentId, setNewDealAgentId] = useState<string | null>(null);
  const [isCreateNewContact, setIsCreateNewContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");

  // New Pipeline Form states
  const [isCreatePipelineOpen, setIsCreatePipelineOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newPipelineStages, setNewPipelineStages] = useState("");

  // Deal Details Modal states
  const [selectedDeal, setSelectedDeal] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editContactId, setEditContactId] = useState("");
  const [editContactSearchQuery, setEditContactSearchQuery] = useState("");
  const [editPreferredContactMethod, setEditPreferredContactMethod] = useState<string>("both");
  const [editTitle, setEditTitle] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editAssignedTo, setEditAssignedTo] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("open");
  const [editLostReason, setEditLostReason] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editCustomFollowUpDate, setEditCustomFollowUpDate] = useState("");
  const [editIsAutomatedFollowUpEnabled, setEditIsAutomatedFollowUpEnabled] = useState(false);
  const [editFollowUpMessage, setEditFollowUpMessage] = useState("");
  const [editFollowUpTemplateName, setEditFollowUpTemplateName] = useState("");
  const [editFollowUpTemplateLanguage, setEditFollowUpTemplateLanguage] = useState("en_US");
  const [editFollowUpTemplateVariables, setEditFollowUpTemplateVariables] = useState<any[]>([]);

  // Sub-modal for templates config
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);

  // Query: get CRM settings
  const { data: crmSettingsData, isLoading: isLoadingSettings, refetch: refetchSettings } = useQuery<any>({
    queryKey: ["/api/crm/settings", channelId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/crm/settings?channelId=${channelId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!channelId,
  });

  // Query: pipelines for this channel
  const { data: pipelines = [], isLoading: isLoadingPipelines } = useQuery<any[]>({
    queryKey: ["/api/crm/pipelines", channelId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/crm/pipelines?channelId=${channelId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!channelId,
  });

  // Default pipeline selection
  useEffect(() => {
    if (pipelines.length > 0 && !activePipelineId) {
      setActivePipelineId(pipelines[0].id);
    }
  }, [pipelines, activePipelineId]);

  // Query: stages for active pipeline
  const { data: stages = [], isLoading: isLoadingStages } = useQuery<any[]>({
    queryKey: ["/api/crm/stages", activePipelineId],
    queryFn: async () => {
      if (!activePipelineId) return [];
      const res = await apiRequest("GET", `/api/crm/stages?pipelineId=${activePipelineId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activePipelineId,
  });

  // Query: deals for channel
  const { data: deals = [], isLoading: isLoadingDeals } = useQuery<any[]>({
    queryKey: ["/api/crm/deals", channelId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/crm/deals?channelId=${channelId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!channelId,
  });

  const filteredDeals = useMemo(() => {
    return (deals || []).filter((deal: any) => {
      if (selectedAgentId !== "all" && deal.assignedTo !== selectedAgentId) {
        return false;
      }

      if (masterSearchQuery.trim()) {
        const query = masterSearchQuery.toLowerCase().trim();
        const matchTitle = (deal.title || "").toLowerCase().includes(query);
        const matchContactName = (deal.contactName || "").toLowerCase().includes(query);
        const matchContactPhone = (deal.contactPhone || "").toLowerCase().includes(query);
        const matchContactEmail = (deal.contactEmail || "").toLowerCase().includes(query);
        const matchNotes = (deal.notes || "").toLowerCase().includes(query);

        let matchTags = false;
        try {
          const tagsArray = Array.isArray(deal.tags)
            ? deal.tags
            : (typeof deal.tags === "string" ? JSON.parse(deal.tags) : []);
          matchTags = tagsArray.some((t: string) => t.toLowerCase().includes(query));
        } catch {}

        if (!matchTitle && !matchContactName && !matchContactPhone && !matchContactEmail && !matchNotes && !matchTags) {
          return false;
        }
      }

      return true;
    });
  }, [deals, selectedAgentId, masterSearchQuery]);



  // Query: contacts for deal creation selector (on-demand)
  const { data: contactsData } = useQuery<any>({
    queryKey: ["/api/contacts", channelId, contactSearchQuery],
    queryFn: async () => {
      if (!channelId) return { data: [] };
      const res = await apiRequest("GET", `/api/contacts?channelId=${channelId}&limit=50&search=${encodeURIComponent(contactSearchQuery)}`);
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: !!channelId,
  });

  const contacts = contactsData?.data || [];

  // Query: contacts for deal details selector (on-demand)
  const { data: editContactsData } = useQuery<any>({
    queryKey: ["/api/contacts", channelId, "edit", editContactSearchQuery],
    queryFn: async () => {
      if (!channelId) return { data: [] };
      const res = await apiRequest("GET", `/api/contacts?channelId=${channelId}&limit=50&search=${encodeURIComponent(editContactSearchQuery)}`);
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: isDetailsOpen && !!channelId,
  });

  const editContacts = editContactsData?.data || [];

  // Query: automations for qualification select dropdown
  const { data: automations = [] } = useQuery<any[]>({
    queryKey: ["/api/automations", channelId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/automations?channelId=${channelId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!channelId,
  });

  // Query: team members
  const { data: teamMembers = [] } = useQuery<any>({
    queryKey: ["/api/team/members"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/team/members?limit=1000");
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
  });

  const membersArray = useMemo(() => {
    return Array.isArray(teamMembers) ? teamMembers : ((teamMembers as any)?.data || []);
  }, [teamMembers]);

  // Leads List helper maps and filtering/pagination logic
  const stageNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (stages || []).forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [stages]);

  const agentNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (membersArray || []).forEach((m: any) => {
      map[m.id] = `${m.firstName || ""} ${m.lastName || m.username}`.trim();
    });
    return map;
  }, [membersArray]);

  const listFilteredDeals = useMemo(() => {
    const activeStageIds = new Set(stages.map((s) => s.id));
    return (filteredDeals || []).filter((deal: any) => {
      // 1. Active pipeline stages only
      if (!activeStageIds.has(deal.stageId)) {
        return false;
      }
      // 2. Stage filter
      if (listStageFilter !== "all" && deal.stageId !== listStageFilter) {
        return false;
      }
      return true;
    });
  }, [filteredDeals, stages, listStageFilter]);

  useEffect(() => {
    setListPage(1);
  }, [masterSearchQuery, listStageFilter]);

  const totalListPages = Math.ceil(listFilteredDeals.length / listLimit) || 1;
  const paginatedListDeals = useMemo(() => {
    return listFilteredDeals.slice((listPage - 1) * listLimit, listPage * listLimit);
  }, [listFilteredDeals, listPage]);

  // Load CRM settings to state
  useEffect(() => {
    if (crmSettingsData) {
      setIsLeadQualificationEnabled(!!crmSettingsData.isLeadQualificationEnabled);
      setQualificationFlowId(crmSettingsData.qualificationFlowId || null);
      setReportEmail(crmSettingsData.reportEmailRecipient || "");
      setReportDailyEnabled(!!crmSettingsData.isDailyReportEnabled);
      setReportWeeklyEnabled(!!crmSettingsData.isWeeklyReportEnabled);
    }
  }, [crmSettingsData]);

  // Update CRM Settings Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/crm/settings", {
        channelId,
        isLeadQualificationEnabled,
        qualificationFlowId: qualificationFlowId === "_empty" ? null : qualificationFlowId,
        isDailyReportEnabled: reportDailyEnabled,
        isWeeklyReportEnabled: reportWeeklyEnabled,
        reportEmailRecipient: reportEmail || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "CRM Settings Saved",
        description: "Your CRM settings have been successfully updated.",
      });
      refetchSettings();
      setIsSettingsOpen(false);
      setIsReportModalOpen(false);
    },
  });

  // GET CRM performance query
  const { data: performanceData, isLoading: isLoadingPerformance } = useQuery<any>({
    queryKey: ["/api/crm/performance", channelId, performancePeriod],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/crm/performance?channelId=${channelId}&period=${performancePeriod}`);
      if (!res.ok) throw new Error("Failed to load performance metrics");
      return res.json();
    },
    enabled: !!channelId && viewMode === "performance",
  });

  // POST set target mutation
  const setTargetMutation = useMutation({
    mutationFn: async (payload: { userId: string; targetDealsWon: number; targetValueWon: string; period: string }) => {
      const res = await apiRequest("POST", "/api/crm/targets", {
        ...payload,
        channelId
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to set target");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Target Updated",
        description: "Agent target has been set successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/performance", channelId] });
      setIsTargetModalOpen(false);
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Error setting target",
        description: err.message
      });
    }
  });

  // POST log call mutation
  const logCallMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const res = await apiRequest("POST", `/api/crm/deals/${dealId}/log-call`);
      if (!res.ok) throw new Error("Failed to log call");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Call Logged",
        description: "Manual call logged and Times Contacted counter incremented."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", channelId] });
      if (selectedDeal) {
        setSelectedDeal((prev: any) => prev ? {
          ...prev,
          contactedCount: data.contactedCount,
          notes: data.notes
        } : null);
      }
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Error logging call",
        description: err.message
      });
    }
  });

  // Create Pipeline Mutation
  const createPipelineMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/crm/pipelines", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create pipeline");
      }
      return res.json();
    },
    onSuccess: (newPipeline) => {
      toast({
        title: "Pipeline Created",
        description: `Successfully created pipeline "${newPipeline.name}" with its stages.`,
      });
      setIsCreatePipelineOpen(false);
      setActivePipelineId(newPipeline.id);
      queryClient.invalidateQueries({ queryKey: ["/api/crm/pipelines", channelId] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Create Deal Mutation
  const createDealMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/crm/deals", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Deal Created",
        description: "New deal successfully added to board column.",
      });
      setIsAddDealOpen(false);
      // Reset form
      setNewDealTitle("");
      setNewDealValue("0.00");
      setNewDealContactId("");
      setNewDealAgentId(null);
      setIsCreateNewContact(false);
      setNewContactName("");
      setNewContactPhone("");
      setNewContactEmail("");
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", channelId] });
    },
  });

  // Move Stage Mutation (Drag & Drop)
  const transitionStageMutation = useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      const res = await apiRequest("PUT", `/api/crm/deals/${dealId}/stage`, { stageId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", channelId] });
    },
    onError: (err: any) => {
      toast({
        title: "Move Failed",
        description: err.message || "Failed to update deal stage.",
        variant: "destructive",
      });
    },
  });

  // Drag & Drop HTML5 Handler
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("text/plain", dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    const dealId = e.dataTransfer.getData("text/plain");
    if (dealId) {
      transitionStageMutation.mutate({ dealId, stageId: targetStageId });
    }
  };

  const openAddDeal = (stageId: string) => {
    setTargetAddStageId(stageId);
    setIsAddDealOpen(true);
  };

  const submitCreateDeal = async () => {
    let contactIdToUse = newDealContactId;
    let contactNameToUse = "";

    if (isCreateNewContact) {
      if (!newContactName.trim() || !newContactPhone.trim()) {
        toast({
          title: "Fields Required",
          description: "Please enter contact name and phone number.",
          variant: "destructive",
        });
        return;
      }

      try {
        const createContactRes = await apiRequest("POST", `/api/contacts?channelId=${channelId}`, {
          name: newContactName,
          phone: newContactPhone,
          email: newContactEmail || undefined,
          channelId
        });

        if (!createContactRes.ok) {
          const errData = await createContactRes.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to create new contact.");
        }

        const newContact = await createContactRes.json();
        contactIdToUse = newContact.id;
        contactNameToUse = newContact.name;

        queryClient.invalidateQueries({ queryKey: ["/api/contacts", channelId] });
      } catch (e: any) {
        toast({
          title: "Contact Creation Failed",
          description: e.message,
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!contactIdToUse) {
        toast({
          title: "Contact Required",
          description: "Please select an existing contact or create a new one.",
          variant: "destructive",
        });
        return;
      }
      const existingContact = contacts.find((c) => c.id === contactIdToUse);
      contactNameToUse = existingContact?.name || "New Lead";
    }

    createDealMutation.mutate({
      contactId: contactIdToUse,
      channelId,
      stageId: targetAddStageId,
      title: newDealTitle || `${contactNameToUse} Deal`,
      value: newDealValue,
      currency: newDealCurrency,
      assignedTo: newDealAgentId === "_empty" ? null : newDealAgentId,
      status: "open",
    });
  };

  // Query: get templates for channel
  const { data: localTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/templates", { channelId }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/templates?channelId=${channelId}`);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json?.data || [];
    },
    enabled: !!channelId,
  });

  // Query: get cadences for channel
  const { data: cadences = [] } = useQuery<any[]>({
    queryKey: ["/api/crm/cadences", { channelId }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/crm/cadences?channelId=${channelId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!channelId,
  });

  const updateDealMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await apiRequest("PUT", `/api/crm/deals/${id}`, payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update deal details");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Deal Updated",
        description: "Deal details have been successfully saved.",
      });
      setIsDetailsOpen(false);
      setSelectedDeal(null);
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", channelId] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/crm/deals/${id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete deal");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Deal Deleted",
        description: "The deal has been deleted.",
      });
      setIsDetailsOpen(false);
      setSelectedDeal(null);
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals", channelId] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const extractTemplateVariables = (body: string) => {
    const matches = body.match(/\{\{\d+\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.replace(/[\{\}]/g, "")))).sort((a, b) => Number(a) - Number(b));
  };

  const handleSelectTemplate = (tplName: string) => {
    const tpl = localTemplates.find(t => t.name === tplName);
    if (!tpl) return;
    setEditFollowUpTemplateName(tpl.name);
    setEditFollowUpTemplateLanguage(tpl.language || "en_US");
    
    // Auto populate template variables structure
    const variables = extractTemplateVariables(tpl.body);
    const defaultVars = variables.map(vIdx => ({ index: vIdx, value: "" }));
    setEditFollowUpTemplateVariables(defaultVars);
  };

  const handleOpenDetails = (deal: any) => {
    setSelectedDeal(deal);
    setEditPreferredContactMethod(deal.preferredContactMethod || "both");
    setEditTitle(deal.title || "");
    setEditValue(deal.value || "0.00");
    setEditCurrency(deal.currency || "USD");
    setEditAssignedTo(deal.assignedTo || "_empty");
    setEditStatus(deal.status || "open");
    setEditLostReason(deal.lostReason || "");
    setEditNotes(deal.notes || "");
    setEditTags(Array.isArray(deal.tags) ? deal.tags.join(", ") : "");
    setEditContactId(deal.contactId || "");
    setEditContactSearchQuery(deal.contactName ? `${deal.contactName} (${deal.contactPhone})` : "");
    
    if (deal.customFollowUpDate) {
      const d = new Date(deal.customFollowUpDate);
      const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setEditCustomFollowUpDate(localISO);
    } else {
      setEditCustomFollowUpDate("");
    }
    
    setEditIsAutomatedFollowUpEnabled(!!deal.isAutomatedFollowUpEnabled);
    setEditFollowUpMessage(deal.followUpMessage || "");
    setEditFollowUpTemplateName(deal.followUpTemplateName || "");
    setEditFollowUpTemplateLanguage(deal.followUpTemplateLanguage || "en_US");
    
    let parsedVars = [];
    if (deal.followUpTemplateVariables) {
      try {
        parsedVars = typeof deal.followUpTemplateVariables === 'string' 
          ? JSON.parse(deal.followUpTemplateVariables) 
          : deal.followUpTemplateVariables;
      } catch (err) {
        parsedVars = [];
      }
    }
    setEditFollowUpTemplateVariables(parsedVars);

    setIsDetailsOpen(true);
  };

  const handleSaveChanges = () => {
    if (!editTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please specify a deal title.",
        variant: "destructive",
      });
      return;
    }
    
    const parsedTags = editTags
      ? editTags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    updateDealMutation.mutate({
      id: selectedDeal.id,
      payload: {
        title: editTitle.trim(),
        value: editValue || "0.00",
        currency: editCurrency,
        contactId: editContactId,
        assignedTo: editAssignedTo === "_empty" ? null : editAssignedTo,
        status: editStatus,
        lostReason: editStatus === "lost" ? editLostReason.trim() : null,
        notes: editNotes.trim() || null,
        tags: parsedTags,
        preferredContactMethod: editPreferredContactMethod,
        customFollowUpDate: editCustomFollowUpDate ? new Date(editCustomFollowUpDate).toISOString() : null,
        isAutomatedFollowUpEnabled: editIsAutomatedFollowUpEnabled,
        followUpMessage: editFollowUpMessage.trim() || null,
        followUpTemplateName: editFollowUpTemplateName || null,
        followUpTemplateLanguage: editFollowUpTemplateLanguage || "en_US",
        followUpTemplateVariables: editFollowUpTemplateVariables,
      },
    });
  };

  if (!channelId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-150 shadow-sm m-6">
        <AlertCircle className="w-8 h-8 text-amber-500 mb-2 animate-bounce" />
        <p className="text-gray-600 font-medium">Please select a WhatsApp Channel to configure CRM Pipelines.</p>
      </div>
    );
  }

  if (isLoadingPipelines || isLoadingStages || isLoadingDeals) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loading />
        <p className="text-gray-500 text-sm mt-4">Loading CRM Pipeline Board...</p>
      </div>
    );
  }

  // Calculate Pipeline statistics
  const totalPipelineValue = filteredDeals
    .filter((d) => d.status === "open" || d.status === "won")
    .reduce((sum, d) => sum + Number(d.value), 0);

  const activeDealsCount = filteredDeals.filter((d) => d.status === "open").length;

  return (
    <div className="flex flex-col h-screen max-h-[100dvh] w-full max-w-full overflow-hidden bg-slate-50">
      {/* Board Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Briefcase className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{t("crm.title")}</h1>
          </div>
          <p className="text-xs text-slate-500">
            Pipeline total: <span className="font-semibold text-slate-800">${totalPipelineValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> | Active Deals: <span className="font-semibold text-slate-800">{activeDealsCount}</span>
          </p>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 mt-2 max-w-[360px] w-full">
            <button
              onClick={() => setViewMode("board")}
              className={`flex-1 text-center py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${viewMode === "board" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 text-center py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${viewMode === "list" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Leads List
            </button>
            {(user?.role === "admin" || user?.isAdminMember === true || user?.role === "superadmin") && (
              <button
                onClick={() => setViewMode("performance")}
                className={`flex-1 text-center py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${viewMode === "performance" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Team Performance
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Pipeline Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <Select value={activePipelineId} onValueChange={setActivePipelineId}>
              <SelectTrigger className="w-[170px] bg-transparent border-0 text-slate-700 h-8 focus:ring-0 shadow-none">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setNewPipelineName("");
                setNewPipelineStages("");
                setIsCreatePipelineOpen(true);
              }}
              className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-slate-100/80 cursor-pointer shrink-0"
              title="Create new pipeline"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Agent Filter Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="w-[170px] bg-transparent border-0 text-slate-700 h-8 focus:ring-0 shadow-none">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {membersArray.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.firstName || m.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Master Search Input */}
          <div className="relative w-full sm:w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search leads (title, name, phone, tags, notes...)"
              value={masterSearchQuery}
              onChange={(e) => setMasterSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-200 text-xs h-9 w-full focus-visible:ring-indigo-500"
            />
          </div>

          {/* CRM Settings trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="h-9 border-slate-200 hover:bg-slate-50 gap-1.5 text-slate-700 font-medium"
          >
            <Settings className="w-4 h-4 text-indigo-500" />
            Lead Qualification Settings
          </Button>

          {/* Automated Follow-up Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCadencesOpen(true)}
            className="h-9 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 gap-1.5 font-medium"
          >
            <Clock className="w-4 h-4 text-indigo-500" />
            Automated Follow-ups
          </Button>
        </div>
      </div>

      {/* Performance View / Kanban Board Container */}
      {viewMode === "performance" ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Performance Period Filter & Settings Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overview Period:</span>
              <Select value={performancePeriod} onValueChange={(val: any) => setPerformancePeriod(val)}>
                <SelectTrigger className="w-[150px] bg-slate-50 border-slate-200 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Overview</SelectItem>
                  <SelectItem value="weekly">Weekly Overview</SelectItem>
                  <SelectItem value="monthly">Monthly Overview</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 font-semibold text-xs border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                onClick={() => {
                  setTargetUserId("");
                  setTargetDealsWon("10");
                  setTargetValueWon("1000.00");
                  setIsTargetModalOpen(true);
                }}
              >
                🎯 Configure Targets
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 font-semibold text-xs border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 flex items-center gap-1.5"
                onClick={() => setIsReportModalOpen(true)}
              >
                ✉️ Email Report Settings
              </Button>
            </div>
          </div>

          {isLoadingPerformance ? (
            <div className="h-64 flex flex-col items-center justify-center">
              <Loading />
              <p className="text-slate-500 text-xs mt-3">Loading performance metrics...</p>
            </div>
          ) : (
            <>
              {/* Summary Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
                <Card className="border-slate-200/85 shadow-sm hover:shadow-md transition-shadow bg-white">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Active Leads</p>
                      <h3 className="text-2xl font-bold text-slate-800">{performanceData?.summary?.totalLeads || 0}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Briefcase className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/85 shadow-sm hover:shadow-md transition-shadow bg-white">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Deals Won</p>
                      <h3 className="text-2xl font-bold text-slate-800">{performanceData?.summary?.dealsWon || 0}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/85 shadow-sm hover:shadow-md transition-shadow bg-white">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Closed Value</p>
                      <h3 className="text-2xl font-bold text-slate-800">
                        ${(performanceData?.summary?.totalValueWon || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/85 shadow-sm hover:shadow-md transition-shadow bg-white">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Conversion Win Rate</p>
                      <h3 className="text-2xl font-bold text-slate-800">{performanceData?.summary?.winRate || 0}%</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Leaderboard Section */}
              <Card className="border-slate-200/80 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4">
                  <CardTitle className="text-sm font-bold text-slate-800">Agent Performance & Targets Leaderboard</CardTitle>
                  <CardDescription className="text-xs text-slate-400">Overview of team members and progress against their assigned sales targets.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/20 border-b border-slate-150 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          <th className="p-4">Agent Name</th>
                          <th className="p-4 text-center">Leads Assigned</th>
                          <th className="p-4 text-center">Won</th>
                          <th className="p-4 text-center">Lost</th>
                          <th className="p-4 text-right">Revenue Closed</th>
                          <th className="p-4">Target Progress (Deals Won)</th>
                          <th className="p-4 text-center">Avg Response Time</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {performanceData?.agentPerformance?.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-xs text-slate-400">
                              No team members or activity found for the selected period.
                            </td>
                          </tr>
                        ) : (
                          performanceData?.agentPerformance?.map((agent: any) => (
                            <tr key={agent.agentId} className="hover:bg-slate-50/60 transition-colors">
                              <td className="p-4 font-semibold text-xs text-slate-800">{agent.agentName}</td>
                              <td className="p-4 text-center text-xs text-slate-600 font-semibold">{agent.leadsAssigned}</td>
                              <td className="p-4 text-center text-xs text-emerald-600 font-bold">{agent.dealsWon}</td>
                              <td className="p-4 text-center text-xs text-rose-500 font-medium">{agent.dealsLost}</td>
                              <td className="p-4 text-right text-xs font-bold text-slate-800">
                                ${agent.totalValueWon.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-4 min-w-[200px]">
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                    <span>Target: {agent.targets.targetDealsWon} won</span>
                                    <span>{agent.targets.dealsProgressPercent}%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-150">
                                    <div
                                      className="bg-indigo-600 h-full transition-all duration-500"
                                      style={{ width: `${Math.min(100, agent.targets.dealsProgressPercent)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-center text-xs text-slate-500">
                                <span className="flex items-center justify-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                  {agent.avgResponseTimeMinutes || 0}m
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50"
                                  onClick={() => {
                                    setTargetUserId(agent.agentId);
                                    setTargetDealsWon(String(agent.targets.targetDealsWon));
                                    setTargetValueWon(String(agent.targets.targetValueWon));
                                    setIsTargetModalOpen(true);
                                  }}
                                >
                                  Edit Target
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      ) : viewMode === "list" ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
          {/* Filters card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Filter Stage:</span>
              <div className="w-[180px]">
                <Select value={listStageFilter} onValueChange={setListStageFilter}>
                  <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 text-xs h-9">
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-slate-500 font-medium whitespace-nowrap">
              Found <span className="font-bold text-slate-800">{listFilteredDeals.length}</span> leads
            </div>
          </div>

          {/* List Table Card */}
          <Card className="border-slate-200/85 shadow-sm bg-white overflow-hidden flex-1 flex flex-col">
            <CardContent className="p-0 flex-1 overflow-y-auto min-h-[300px]">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 bg-slate-50/75 text-slate-500 text-[10px] font-bold uppercase tracking-wider select-none">
                      <th className="p-4">Lead Title</th>
                      <th className="p-4">Contact Details</th>
                      <th className="p-4">Stage</th>
                      <th className="p-4 text-right">Value</th>
                      <th className="p-4">Assigned Agent</th>
                      <th className="p-4">Tags</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedListDeals.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Briefcase className="w-8 h-8 text-slate-300" />
                            <p className="text-sm font-medium">No leads found</p>
                            <p className="text-xs">Try adjusting your filters or active pipeline.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedListDeals.map((deal: any) => {
                        let parsedTags: string[] = [];
                        try {
                          parsedTags = Array.isArray(deal.tags)
                            ? deal.tags
                            : (typeof deal.tags === "string" ? JSON.parse(deal.tags) : []);
                        } catch {}

                        const stageName = stageNameMap[deal.stageId] || "Unknown Stage";
                        const agentName = agentNameMap[deal.assignedTo] || "Unassigned";

                        return (
                          <tr key={deal.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-4">
                              <button
                                onClick={() => handleOpenDetails(deal)}
                                className="font-semibold text-slate-800 hover:text-indigo-600 hover:underline text-left"
                              >
                                {deal.title || `${deal.contactName || "New Lead"} Deal`}
                              </button>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800">{deal.contactName}</span>
                                <span className="text-[10px] text-slate-500 font-medium">{deal.contactPhone}</span>
                                {deal.contactEmail && (
                                  <span className="text-[10px] text-slate-400">{deal.contactEmail}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {stageName}
                              </span>
                            </td>
                            <td className="p-4 text-right font-bold text-slate-800">
                              {Number(deal.value).toLocaleString(undefined, { minimumFractionDigits: 2 })} {deal.currency || "USD"}
                            </td>
                            <td className="p-4 text-slate-600 font-medium">
                              {agentName}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {parsedTags.length === 0 ? (
                                  <span className="text-[10px] text-slate-400 italic">-</span>
                                ) : (
                                  parsedTags.map((tag: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-medium border border-slate-200"
                                    >
                                      {tag}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-slate-500 font-medium">
                              {new Date(deal.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDetails(deal)}
                                className="h-7 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50"
                              >
                                View Details
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>

            {/* Pagination Controls */}
            {totalListPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-150 p-4 bg-slate-50/50">
                <p className="text-[11px] text-slate-500 font-medium">
                  Showing page <span className="font-semibold text-slate-800">{listPage}</span> of <span className="font-semibold text-slate-800">{totalListPages}</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={listPage <= 1}
                    onClick={() => setListPage((prev) => prev - 1)}
                    className="h-8 font-semibold text-xs border-slate-200 text-slate-700 bg-white"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={listPage >= totalListPages}
                    onClick={() => setListPage((prev) => prev + 1)}
                    className="h-8 font-semibold text-xs border-slate-200 text-slate-700 bg-white"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-6 flex gap-6 items-start select-none">
          {stages.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stageId === stage.id);
            const stageTotalValue = stageDeals.reduce((sum, d) => sum + Number(d.value), 0);

            return (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="w-72 bg-slate-100 rounded-xl border border-slate-200 flex flex-col max-h-full shrink-0 shadow-sm"
              >
                {/* Stage Header */}
                <div className="p-3.5 flex items-center justify-between border-b border-slate-200 bg-white rounded-t-xl">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: stage.color || "#94a3b8" }}
                      />
                      <h3 className="font-semibold text-slate-800 text-sm">{stage.name}</h3>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      ${stageTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} • {stageDeals.length} deals
                    </p>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openAddDeal(stage.id)}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Cards List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px]">
                  {stageDeals.length === 0 ? (
                    <div className="h-24 flex items-center justify-center border border-dashed border-slate-300 rounded-lg text-[10px] text-slate-400">
                      Drag deals here
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const agent = membersArray.find((m: any) => m.id === deal.assignedTo);
                      return (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal.id)}
                          onClick={() => handleOpenDetails(deal)}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-slate-800 text-xs leading-normal line-clamp-2">
                              {deal.title}
                            </h4>
                          </div>

                          {/* Tags Display */}
                          {Array.isArray(deal.tags) && deal.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {deal.tags.map((tag: string) => (
                                <span key={tag} className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 text-[10px] border-t border-slate-100 pt-2 shrink-0">
                            <span className="font-bold text-slate-800 bg-slate-50 rounded px-1.5 py-0.5">
                              {Number(deal.value).toLocaleString(undefined, { minimumFractionDigits: 2 })} {deal.currency}
                            </span>

                            <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5 max-w-[120px] truncate">
                              <User className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{agent?.name || agent?.username || "Owner"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
          {/* Right-most padding spacer to prevent clipping */}
          <div className="w-6 shrink-0" />
        </div>
      )}

      {/* LEAD QUALIFICATION SETTINGS DIALOG */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-base font-bold">
              <Shuffle className="w-4 h-4 text-indigo-500" />
              Lead Qualification Settings
            </DialogTitle>
            <DialogDescription className="text-xs">
              Direct incoming customer conversations to an automation flow for pre-qualification before round-robin distribution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-slate-800">Enable Automated Qualification</Label>
                <p className="text-[10px] text-slate-400">Trigger qualification chatbot on new chats</p>
              </div>
              <Switch 
                checked={isLeadQualificationEnabled}
                onCheckedChange={setIsLeadQualificationEnabled}
              />
            </div>

            {isLeadQualificationEnabled && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <Label className="text-xs font-semibold text-slate-700">Target Automation Flow</Label>
                <Select 
                  value={qualificationFlowId || ""} 
                  onValueChange={setQualificationFlowId}
                >
                  <SelectTrigger className="w-full bg-white border-slate-200 text-xs">
                    <SelectValue placeholder="Select qualification flow" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_empty">No active flow selected</SelectItem>
                    {automations.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[9px] text-slate-400 leading-normal">
                  Make sure this flow builder template ends with a <strong>Route to CRM Round-Robin</strong> action node to assign the lead.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={() => saveSettingsMutation.mutate()}
              disabled={saveSettingsMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QUICK ADD DEAL DIALOG */}
      <Dialog open={isAddDealOpen} onOpenChange={setIsAddDealOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-500" />
              Quick Add Deal
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manually register a new deal inside the active pipeline stage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-100">
              <Label className="font-semibold text-slate-700">Create New Contact instead of selecting?</Label>
              <Switch checked={isCreateNewContact} onCheckedChange={setIsCreateNewContact} />
            </div>

            {!isCreateNewContact ? (
              <div className="space-y-1.5 relative">
                <Label className="font-semibold text-slate-700">Lead Contact</Label>
                <div className="relative">
                  <Input
                    placeholder="Type name or phone to search contacts..."
                    value={contactSearchQuery}
                    onChange={(e) => {
                      setContactSearchQuery(e.target.value);
                      setShowContactDropdown(true);
                      if (newDealContactId) {
                        setNewDealContactId("");
                      }
                    }}
                    onFocus={() => setShowContactDropdown(true)}
                    onBlur={() => setTimeout(() => setShowContactDropdown(false), 200)}
                    className="border-slate-200 text-xs pr-8 bg-white h-9"
                  />
                  {newDealContactId && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewDealContactId("");
                        setContactSearchQuery("");
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-650 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {showContactDropdown && (
                  <div className="absolute z-[100] w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                    {contacts.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-[11px] font-medium">
                        No matching contacts found.
                      </div>
                    ) : (
                      contacts.map((c: any) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setNewDealContactId(c.id);
                            setContactSearchQuery(`${c.name} (${c.phone})`);
                            setShowContactDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex flex-col cursor-pointer"
                        >
                          <span className="font-semibold">{c.name}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{c.phone}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700">New Contact Name</Label>
                  <Input
                    placeholder="E.g. John Doe"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700">Phone Number (Required)</Label>
                  <Input
                    placeholder="E.g. 919633348491"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700">Email Address (Optional)</Label>
                  <Input
                    placeholder="E.g. john@example.com"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    className="border-slate-200 text-xs"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Deal Title (Optional)</Label>
              <Input
                value={newDealTitle}
                onChange={(e) => setNewDealTitle(e.target.value)}
                placeholder="E.g. Website Overhaul Deal"
                className="border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700">Value</Label>
                <Input
                  type="number"
                  value={newDealValue}
                  onChange={(e) => setNewDealValue(e.target.value)}
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700">Currency</Label>
                <Select value={newDealCurrency} onValueChange={setNewDealCurrency}>
                  <SelectTrigger className="border-slate-200 bg-white text-xs">
                    <SelectValue placeholder="USD" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="AED">AED (د.إ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Assign Agent (Optional)</Label>
              <Select value={newDealAgentId || ""} onValueChange={(val) => setNewDealAgentId(val)}>
                <SelectTrigger className="border-slate-200 bg-white text-xs">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_empty">Unassigned</SelectItem>
                  {membersArray.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name || m.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddDealOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={submitCreateDeal}
              disabled={createDealMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {createDealMutation.isPending ? "Creating..." : "Add Deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE PIPELINE DIALOG */}
      <Dialog open={isCreatePipelineOpen} onOpenChange={setIsCreatePipelineOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-indigo-500" />
              Create CRM Pipeline
            </DialogTitle>
            <DialogDescription className="text-xs">
              Register a new pipeline for this channel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Pipeline Name</Label>
              <Input
                value={newPipelineName}
                onChange={(e) => setNewPipelineName(e.target.value)}
                placeholder="E.g., Partner Onboarding, Support Tickets"
                className="border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Pipeline Stages (Comma-separated)</Label>
              <Input
                value={newPipelineStages}
                onChange={(e) => setNewPipelineStages(e.target.value)}
                placeholder="E.g., Application, Screening, Offer, Closed"
                className="border-slate-200"
              />
              <p className="text-[10px] text-slate-400 leading-normal">
                Leave empty to seed the default Sales pipeline stages: <em>Lead, Contacted, Qualified, Proposal, Won, Lost</em>.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCreatePipelineOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={() => {
                if (!newPipelineName.trim()) {
                  toast({
                    title: "Name Required",
                    description: "Please specify a name for the new pipeline.",
                    variant: "destructive",
                  });
                  return;
                }
                const stageList = newPipelineStages.trim()
                  ? newPipelineStages.split(",").map((s) => s.trim()).filter(Boolean)
                  : [];
                createPipelineMutation.mutate({
                  name: newPipelineName.trim(),
                  channelId,
                  stages: stageList,
                });
              }}
              disabled={createPipelineMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {createPipelineMutation.isPending ? "Creating..." : "Create Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CadencesSettingsDialog
        open={isCadencesOpen}
        onOpenChange={setIsCadencesOpen}
        channelId={channelId || ""}
        stages={stages}
      />

      {/* DEAL DETAILS DIALOG */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5 text-slate-800">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              Deal Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              View and edit deal values, assignees, notes, tags, and follow-up settings.
            </DialogDescription>
          </DialogHeader>

          {selectedDeal && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Left Column: Core Fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700">Deal Title</Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-1.5 relative bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Linked Lead Contact</Label>
                  <div className="relative">
                    <Input
                      placeholder="Type name or phone to search contacts..."
                      value={editContactSearchQuery}
                      onChange={(e) => {
                        setEditContactSearchQuery(e.target.value);
                        setShowEditContactDropdown(true);
                        if (editContactId) {
                          setEditContactId("");
                        }
                      }}
                      onFocus={() => setShowEditContactDropdown(true)}
                      onBlur={() => setTimeout(() => setShowEditContactDropdown(false), 200)}
                      className="border-slate-200 text-xs pr-8 bg-white h-8 mt-1"
                    />
                    {editContactId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditContactId("");
                          setEditContactSearchQuery("");
                        }}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-650 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {showEditContactDropdown && (
                    <div className="absolute z-[100] w-full left-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                      {editContacts.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 text-[11px] font-medium">
                          No matching contacts found.
                        </div>
                      ) : (
                        editContacts.map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setEditContactId(c.id);
                              setEditContactSearchQuery(`${c.name} (${c.phone})`);
                              setShowEditContactDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex flex-col cursor-pointer"
                          >
                            <span className="font-semibold">{c.name}</span>
                            <span className="text-[10px] text-slate-500 font-medium">{c.phone}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-slate-700">Value</Label>
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-slate-700">Currency</Label>
                    <Select value={editCurrency} onValueChange={setEditCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="AED">AED (د.إ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700">Assigned Agent</Label>
                  <Select
                    value={editAssignedTo || "_empty"}
                    onValueChange={(val) => setEditAssignedTo(val === "_empty" ? null : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_empty">Unassigned</SelectItem>
                      {membersArray.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.firstName ? `${m.firstName} (${m.username})` : m.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700">Preferred Contact Method</Label>
                  <Select
                    value={editPreferredContactMethod}
                    onValueChange={setEditPreferredContactMethod}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact method..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call Only</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp Only</SelectItem>
                      <SelectItem value="both">Both (Call & WhatsApp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Outreach Tracking</span>
                    <div className="text-xs font-semibold text-slate-700">
                      Contacted: <span className="text-indigo-600 font-bold text-sm">{selectedDeal?.contactedCount || 0}</span> times
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 font-semibold text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-1"
                    disabled={logCallMutation.isPending}
                    type="button"
                    onClick={() => logCallMutation.mutate(selectedDeal.id)}
                  >
                    📞 Log Call
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700">Deal Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editStatus === "lost" && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <Label className="font-semibold text-slate-700 text-rose-600">Lost Reason</Label>
                    <Input
                      value={editLostReason}
                      onChange={(e) => setEditLostReason(e.target.value)}
                      placeholder="Why was this lead/deal lost?"
                      className="border-rose-200 focus:border-rose-400"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700">Deal Notes</Label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Enter context, updates, or comments..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700">Tags (Comma-separated)</Label>
                  <Input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="E.g., high-intent, hot, enterprise"
                    className="border-slate-200"
                  />
                  <p className="text-[10px] text-slate-400">
                    Separate multiple tags with a comma.
                  </p>
                </div>
              </div>

              {/* Right Column: Custom Follow-up Config */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4">
                <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Follow-up Scheduling
                </h5>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700">Custom Follow-up Date</Label>
                  <Input
                    type="datetime-local"
                    value={editCustomFollowUpDate}
                    onChange={(e) => setEditCustomFollowUpDate(e.target.value)}
                    className="border-slate-200"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Schedule a follow-up reminder for this specific lead.
                  </p>
                </div>

                {/* Warning if a stage cadence is active */}
                {(() => {
                  const isCadenceActive = cadences.some(
                    (c: any) => c.triggerStageId === selectedDeal?.stageId && c.isActive
                  );
                  if (!isCadenceActive) return null;
                  return (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2.5 text-[10px] leading-relaxed">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Automated Cadence Active:</strong> An automated follow-up cadence is active for the current stage. Any custom automated message set below will be ignored in favor of the stage sequence.
                      </div>
                    </div>
                  );
                })()}

                {/* Automated Follow-up Trigger options */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border p-3 rounded-lg bg-slate-50 border-slate-150">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold text-slate-700">Automated WA Message</Label>
                      <p className="text-[9px] text-slate-400 leading-normal max-w-[170px]">
                        Send an automated WA follow-up message when the date is reached.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {editIsAutomatedFollowUpEnabled && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[10px] font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                          onClick={() => setIsFollowUpModalOpen(true)}
                        >
                          Configure
                        </Button>
                      )}
                      <Switch
                        checked={editIsAutomatedFollowUpEnabled}
                        onCheckedChange={(checked) => {
                          setEditIsAutomatedFollowUpEnabled(checked);
                          if (checked) {
                            setIsFollowUpModalOpen(true);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {editIsAutomatedFollowUpEnabled && (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 space-y-2">
                      <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Configured Message:</span>
                      {editFollowUpTemplateName ? (
                        <div className="space-y-1">
                          <p className="text-[11px] font-medium text-slate-700">
                            <strong>Template Name:</strong> {editFollowUpTemplateName}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            <strong>Vars:</strong> {editFollowUpTemplateVariables.length > 0 ? editFollowUpTemplateVariables.map((v: any) => `${v.index}: ${v.value}`).join(", ") : "None"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-600 line-clamp-3 italic">
                          {editFollowUpMessage || "(No custom text configured yet)"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              className="text-rose-600 border-rose-200 hover:bg-rose-50 font-semibold"
              disabled={deleteDealMutation.isPending}
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this deal?")) {
                  deleteDealMutation.mutate(selectedDeal.id);
                }
              }}
            >
              Delete Deal
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsDetailsOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveChanges}
                disabled={updateDealMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {updateDealMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIGURE FOLLOW-UP MESSAGE DIALOG */}
      <Dialog open={isFollowUpModalOpen} onOpenChange={setIsFollowUpModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5 text-indigo-700">
              <MessageSquare className="w-5 h-5" />
              Automated Follow-Up Message
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure the message content or templates to send automatically when follow-up date hits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Follow-up Message Type</Label>
              <Select
                value={editFollowUpTemplateName ? "template" : "text"}
                onValueChange={(val) => {
                  if (val === "text") {
                    setEditFollowUpTemplateName("");
                  } else {
                    if (localTemplates.length > 0) {
                      handleSelectTemplate(localTemplates[0].name);
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Custom Text Message</SelectItem>
                  <SelectItem value="template">WhatsApp Pre-approved Template</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* A. TEXT MESSAGE INPUT */}
            {!editFollowUpTemplateName && (
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700">Custom Text Message</Label>
                <Textarea
                  value={editFollowUpMessage}
                  onChange={(e) => setEditFollowUpMessage(e.target.value)}
                  placeholder="Enter custom follow-up message text..."
                  className="min-h-[120px]"
                />
                <p className="text-[10px] text-slate-400 leading-normal">
                  Tip: You can use contact variables by writing their names inside double brackets (e.g. <code>{"{{name}}"}</code>).
                </p>
              </div>
            )}

            {/* B. TEMPLATE SELECTOR AND VARIABLE INPUTS */}
            {!!editFollowUpTemplateName && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700">Pre-approved Template</Label>
                  <Select
                    value={editFollowUpTemplateName}
                    onValueChange={(val) => handleSelectTemplate(val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {localTemplates.map((t: any) => (
                        <SelectItem key={t.id} value={t.name}>
                          {t.name} ({t.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Show template body preview */}
                {(() => {
                  const selectedTpl = localTemplates.find(t => t.name === editFollowUpTemplateName);
                  if (!selectedTpl) return null;
                  return (
                    <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Template Preview</span>
                        <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{selectedTpl.body}</p>
                      </div>

                      {/* Variable inputs */}
                      {(() => {
                        const variables = extractTemplateVariables(selectedTpl.body);
                        if (variables.length === 0) return null;
                        return (
                          <div className="space-y-2 border-t pt-2.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configure Parameters</span>
                            <div className="space-y-2">
                              {variables.map((vIdx) => {
                                const currentVar = editFollowUpTemplateVariables.find((v: any) => v.index === vIdx) || { index: vIdx, value: "" };
                                return (
                                  <div key={vIdx} className="flex items-center gap-2">
                                    <Label className="text-xs font-semibold text-slate-500 min-w-[60px]">Var `{"{{"}{vIdx}{"}}"}`</Label>
                                    <Input
                                      value={currentVar.value}
                                      placeholder={`Enter parameter value for {{${vIdx}}}...`}
                                      onChange={(e) => {
                                        const nextValue = e.target.value;
                                        setEditFollowUpTemplateVariables((prev) => {
                                          const filtered = prev.filter((v: any) => v.index !== vIdx);
                                          return [...filtered, { index: vIdx, value: nextValue }].sort((a, b) => Number(a.index) - Number(b.index));
                                        });
                                      }}
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold w-full"
              onClick={() => setIsFollowUpModalOpen(false)}
            >
              Done & Save Message Config
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIGURE TARGETS DIALOG */}
      <Dialog open={isTargetModalOpen} onOpenChange={setIsTargetModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5 text-indigo-700">
              🎯 Configure Agent Sales Targets
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set performance goals (Won Deals & Closed Value) for team members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Select Team Member</Label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent>
                  {membersArray.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.firstName ? `${m.firstName} (${m.username})` : m.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700">Target Won Deals</Label>
                <Input
                  type="number"
                  value={targetDealsWon}
                  onChange={(e) => setTargetDealsWon(e.target.value)}
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700">Target Closed Value ($)</Label>
                <Input
                  type="number"
                  value={targetValueWon}
                  onChange={(e) => setTargetValueWon(e.target.value)}
                  className="border-slate-200"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Target Period</Label>
              <Select value={performancePeriod} onValueChange={(val: any) => setPerformancePeriod(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly Target</SelectItem>
                  <SelectItem value="monthly">Monthly Target</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsTargetModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              disabled={setTargetMutation.isPending}
              onClick={() => {
                if (!targetUserId) {
                  toast({ title: "Select Member", description: "Please choose a team member.", variant: "destructive" });
                  return;
                }
                setTargetMutation.mutate({
                  userId: targetUserId,
                  targetDealsWon: Number(targetDealsWon) || 0,
                  targetValueWon: targetValueWon || "0.00",
                  period: performancePeriod
                });
              }}
            >
              {setTargetMutation.isPending ? "Saving..." : "Save Target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EMAIL REPORT SETTINGS DIALOG */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5 text-indigo-700">
              ✉️ Automated Performance Reports
            </DialogTitle>
            <DialogDescription className="text-xs">
              Schedule automated daily or weekly HTML report notifications to admin emails.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3 text-xs">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3.5">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-slate-800">Daily Performance Email</Label>
                <p className="text-[9px] text-slate-400">Sent every day at 8:00 PM</p>
              </div>
              <Switch checked={reportDailyEnabled} onCheckedChange={setReportDailyEnabled} />
            </div>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3.5">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-slate-800">Weekly Performance Email</Label>
                <p className="text-[9px] text-slate-400">Sent every Sunday at 8:00 PM</p>
              </div>
              <Switch checked={reportWeeklyEnabled} onCheckedChange={setReportWeeklyEnabled} />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Additional Recipient Emails (Comma-separated)</Label>
              <Input
                value={reportEmail}
                onChange={(e) => setReportEmail(e.target.value)}
                placeholder="E.g., admin@company.com, ceo@company.com"
                className="border-slate-200 text-xs"
              />
              <p className="text-[9px] text-slate-400 leading-normal">
                Leave blank to send to the main channel owner and administrative team members only.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsReportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              disabled={saveSettingsMutation.isPending}
              onClick={() => saveSettingsMutation.mutate()}
            >
              {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
