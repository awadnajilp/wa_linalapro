import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LifeBuoy, Plus, Trash, Edit, FileSpreadsheet, Settings, UserCheck, Calendar, Filter, Sparkles, Volume2, Paperclip, Mail, ShieldAlert } from "lucide-react";
import { useChannelContext } from "@/contexts/channel-context";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface SupportTicket {
  id: string;
  ticketId: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string | null;
  mediaUrl: string | null;
  loggedByName: string | null;
  loggedByPhone: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SupportTicketConfig {
  id: string;
  triggerKeyword: string;
  retrievalKeyword: string;
  reportingNumber: string | null;
  reportInterval: string;
  reportEmail: string | null;
  emailEnabled: boolean;
  forwardEmail: string | null;
  forwardEnabled: boolean;
  isActive: boolean;
  aiPrompt: string;
}

export default function SupportTicketsLedger() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeChannel } = useChannelContext();

  // Filters
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [timeframe, setTimeframe] = useState("month"); // today, week, month, year, custom
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  React.useEffect(() => {
    setPage(1);
  }, [category, status, priority, timeframe, startDate, endDate, search, activeChannel]);

  // Modals open state
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Form states - Create Ticket
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("general");
  const [ticketPriority, setTicketPriority] = useState("medium");
  const [ticketStatus, setTicketStatus] = useState("open");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketAssigned, setTicketAssigned] = useState("");
  const [ticketMedia, setTicketMedia] = useState("");

  // Form states - Edit Ticket
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editCategory, setEditCategory] = useState("general");
  const [editPriority, setEditPriority] = useState("medium");
  const [editStatus, setEditStatus] = useState("open");
  const [editDesc, setEditDesc] = useState("");
  const [editAssigned, setEditAssigned] = useState("");

  // Form states - Configuration
  const [botTrigger, setBotTrigger] = useState("ticket");
  const [botRetrieval, setBotRetrieval] = useState("getticket");
  const [reportNumber, setReportNumber] = useState("");
  const [reportInterval, setReportInterval] = useState("daily");
  const [reportEmail, setReportEmail] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [forwardEmail, setForwardEmail] = useState("");
  const [forwardEnabled, setForwardEnabled] = useState(false);
  const [botActive, setBotActive] = useState(true);
  const [botPrompt, setBotPrompt] = useState("You are a helper AI for a Support Ticket app. Analyze the text representing a support ticket issue, description, or raw chat, and extract the subject, category, priority, and description.");
  const [configChannelId, setConfigChannelId] = useState("");

  // Fetch Addons Subscription
  const { data: addons } = useQuery<any[]>({
    queryKey: ["/api/tenant/addons"],
  });

  const ticketAddon = addons?.find(a => a.slug === "support-tickets");
  const purchaseType = ticketAddon?.subscription?.purchaseType || "flow";
  const [botModeType, setBotModeType] = useState("flow");

  React.useEffect(() => {
    if (purchaseType) {
      setBotModeType(purchaseType);
    }
  }, [purchaseType]);

  // Bind active channel when it changes
  React.useEffect(() => {
    if (activeChannel?.id) {
      setConfigChannelId(activeChannel.id);
    }
  }, [activeChannel?.id]);

  // Fetch Config
  const { data: config } = useQuery<SupportTicketConfig>({
    queryKey: ["/api/tickets/config", configChannelId],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/config?channelId=${configChannelId}`);
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json();
    },
    enabled: !!configChannelId,
  });

  React.useEffect(() => {
    if (config) {
      setBotTrigger(config.triggerKeyword || "ticket");
      setBotRetrieval(config.retrievalKeyword || "getticket");
      setReportNumber(config.reportingNumber || "");
      setReportInterval(config.reportInterval || "daily");
      setReportEmail(config.reportEmail || "");
      setEmailEnabled(config.emailEnabled);
      setForwardEmail(config.forwardEmail || "");
      setForwardEnabled(config.forwardEnabled);
      setBotActive(config.isActive !== undefined ? config.isActive : true);
      setBotPrompt(config.aiPrompt || "You are a helper AI for a Support Ticket app. Analyze the text representing a support ticket issue, description, or raw chat, and extract the subject, category, priority, and description.");
    }
  }, [config]);

  // Calculate dates based on timeframe
  const dates = useMemo(() => {
    if (timeframe === "custom") {
      return { start: startDate, end: endDate };
    }
    const end = new Date();
    const start = new Date();
    if (timeframe === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (timeframe === "week") {
      start.setDate(end.getDate() - 7);
    } else if (timeframe === "month") {
      start.setDate(end.getDate() - 30);
    } else if (timeframe === "year") {
      start.setDate(end.getDate() - 365);
    }
    end.setSeconds(0, 0);
    start.setSeconds(0, 0);
    return { start: start.toISOString(), end: end.toISOString() };
  }, [timeframe, startDate, endDate]);

  // Fetch Tickets list with Filters
  const { data } = useQuery<{
    tickets: SupportTicket[];
    total: number;
  }>({
    queryKey: [
      "/api/tickets",
      category,
      status,
      priority,
      timeframe,
      dates.start,
      dates.end,
      search,
      activeChannel?.id,
      page,
    ],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (activeChannel?.id) q.set("channelId", activeChannel.id);
      if (category !== "all") q.set("category", category);
      if (status !== "all") q.set("status", status);
      if (priority !== "all") q.set("priority", priority);
      if (dates.start) q.set("startDate", dates.start);
      if (dates.end) q.set("endDate", dates.end);
      if (search) q.set("search", search);
      q.set("page", page.toString());
      q.set("limit", limit.toString());

      const res = await fetch(`/api/tickets?${q.toString()}`);
      return res.json();
    },
  });

  const tickets = data?.tickets || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Mutations
  const createTicketMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/tickets", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Ticket Logged", description: "The support ticket has been created manually." });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setIsTicketOpen(false);
      setTicketSubject("");
      setTicketDesc("");
      setTicketAssigned("");
      setTicketMedia("");
    }
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await apiRequest("PUT", `/api/tickets/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Ticket Updated", description: "Support ticket details have been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setIsEditOpen(false);
      setEditingTicket(null);
    }
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/tickets/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Ticket Deleted", description: "The ticket was removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    }
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/tickets/config", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings Saved", description: "Support Tickets bot configurations updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets/config", configChannelId] });
      setIsConfigOpen(false);
    }
  });

  const reloadFlowMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tickets/load-flow", { channelId: activeChannel?.id });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Flow Reloaded", description: "Predefined WhatsApp Support Ticket Bot flow has been reloaded." });
    }
  });

  const handleExport = () => {
    if (!activeChannel?.id) return;
    const q = new URLSearchParams();
    q.set("channelId", activeChannel.id);
    if (category !== "all") q.set("category", category);
    if (status !== "all") q.set("status", status);
    if (priority !== "all") q.set("priority", priority);
    if (dates.start) q.set("startDate", dates.start);
    if (dates.end) q.set("endDate", dates.end);
    if (search) q.set("search", search);
    
    window.location.href = `/api/tickets/export?${q.toString()}`;
  };

  const handleOpenEdit = (tkt: SupportTicket) => {
    setEditingTicket(tkt);
    setEditSubject(tkt.subject);
    setEditCategory(tkt.category);
    setEditPriority(tkt.priority);
    setEditStatus(tkt.status);
    setEditDesc(tkt.description || "");
    setEditAssigned(tkt.assignedTo || "");
    setIsEditOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <LifeBuoy className="w-7 h-7 text-rose-500" /> Support Tickets
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage customer support tickets created from WhatsApp sessions, assign priorities, and configure automated email alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5 border-gray-200">
            <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export Excel
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsConfigOpen(true)} className="flex items-center gap-1.5 border-gray-200">
            <Settings className="w-4 h-4 text-gray-500" /> Settings & Bot Config
          </Button>

          <Button size="sm" onClick={() => setIsTicketOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Create Ticket
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-gray-500">Total Tickets</CardTitle>
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <LifeBuoy className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-gray-900">{total}</div>
            <p className="text-xs text-gray-500 mt-1">Logged on active channel</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-gray-500">Open Tickets</CardTitle>
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-green-600">
              {tickets.filter(t => t.status === "open").length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Requires response</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Tickets</CardTitle>
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-amber-500">
              {tickets.filter(t => t.status === "pending").length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Awaiting client / info</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-gray-500">Active Addon Mode</CardTitle>
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              {botModeType === "ai" ? <Sparkles className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg font-bold text-indigo-600 flex items-center gap-1">
              {botModeType === "ai" ? "AI Agent Mode" : "Standard Flow Mode"}
            </div>
            <p className="text-xs text-gray-500 mt-1">Configure in settings panel</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col lg:flex-row gap-4 items-end">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 w-full">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500">Search</Label>
              <Input
                placeholder="Search subject, phone, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500">Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="sales">Sales</option>
                <option value="general">General</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500">Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500">Priority</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500">Timeframe</Label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white focus:outline-none"
              >
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
                <option value="custom">Custom Date</option>
              </select>
            </div>
          </div>

          {timeframe === "custom" && (
            <div className="flex gap-2 items-center w-full lg:w-auto shrink-0 mt-3 lg:mt-0">
              <div className="space-y-1.5 w-full">
                <Label className="text-xs font-semibold text-gray-500">Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5 w-full">
                <Label className="text-xs font-semibold text-gray-500">End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card className="shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[120px]">Ticket ID</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length > 0 ? (
              tickets.map((tkt) => (
                <TableRow key={tkt.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-bold text-gray-900">{tkt.ticketId}</TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">{tkt.subject}</div>
                    {tkt.description && (
                      <div className="text-xs text-gray-500 truncate max-w-[200px] mt-0.5">
                        {tkt.description}
                      </div>
                    )}
                    {tkt.mediaUrl && (
                      <a href={tkt.mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 mt-1 hover:underline">
                        <Paperclip className="w-3 h-3" /> Screenshot Attached
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">{tkt.loggedByName || "Manual"}</div>
                    <div className="text-xs text-gray-500">{tkt.loggedByPhone || "N/A"}</div>
                  </TableCell>
                  <TableCell className="capitalize text-xs font-medium">{tkt.category}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                      tkt.priority === "urgent" ? "bg-red-100 text-red-700" :
                      tkt.priority === "high" ? "bg-orange-100 text-orange-700" :
                      tkt.priority === "medium" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {tkt.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      tkt.status === "open" ? "bg-green-50 text-green-700 border border-green-200" :
                      tkt.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      tkt.status === "resolved" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        tkt.status === "open" ? "bg-green-500" :
                        tkt.status === "pending" ? "bg-amber-500" :
                        tkt.status === "resolved" ? "bg-blue-500" :
                        "bg-gray-500"
                      }`}></span>
                      <span className="capitalize">{tkt.status}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-600">{tkt.assignedTo || "Unassigned"}</TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {new Date(tkt.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-500 hover:text-gray-900" onClick={() => handleOpenEdit(tkt)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteTicketMutation.mutate(tkt.id)}>
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-gray-400">
                  <LifeBuoy className="w-12 h-12 mx-auto mb-3 opacity-30 text-rose-500" />
                  <p className="font-bold text-gray-600">No Support Tickets Logged</p>
                  <p className="text-sm">Logged tickets from customers on WhatsApp will appear here.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-150">
            <span className="text-sm text-gray-500">
              Showing page <b>{page}</b> of <b>{totalPages}</b>
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal - Create Ticket */}
      <Dialog open={isTicketOpen} onOpenChange={setIsTicketOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Support Ticket</DialogTitle>
            <DialogDescription>Manually log a customer issue or internal support request.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label>Ticket Subject / Title</Label>
              <Input placeholder="e.g. Server connection timeout error" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select value={ticketCategory} onChange={(e) => setTicketCategory(e.target.value)} className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white">
                  <option value="general">General</option>
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  <option value="sales">Sales</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <select value={ticketPriority} onChange={(e) => setTicketPriority(e.target.value)} className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select value={ticketStatus} onChange={(e) => setTicketStatus(e.target.value)} className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white">
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Assign To Agent (Name)</Label>
                <Input placeholder="e.g. John Doe" value={ticketAssigned} onChange={(e) => setTicketAssigned(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description / Notes</Label>
              <Textarea placeholder="Provide extra detail about the issue..." rows={3} value={ticketDesc} onChange={(e) => setTicketDesc(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Attachment / Screenshot URL (Optional)</Label>
              <Input placeholder="https://..." value={ticketMedia} onChange={(e) => setTicketMedia(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTicketOpen(false)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => createTicketMutation.mutate({
              subject: ticketSubject,
              category: ticketCategory,
              priority: ticketPriority,
              status: ticketStatus,
              description: ticketDesc,
              assignedTo: ticketAssigned,
              mediaUrl: ticketMedia,
              channelId: activeChannel?.id
            })}>Save Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal - Edit Ticket */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Ticket details ({editingTicket?.ticketId})</DialogTitle>
            <DialogDescription>Modify ticket status, priority, description, or assignment.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label>Ticket Subject / Title</Label>
              <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white">
                  <option value="general">General</option>
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  <option value="sales">Sales</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white">
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Assign To Agent (Name)</Label>
                <Input value={editAssigned} onChange={(e) => setEditAssigned(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description / Notes</Label>
              <Textarea rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => updateTicketMutation.mutate({
              id: editingTicket!.id,
              payload: {
                subject: editSubject,
                category: editCategory,
                priority: editPriority,
                status: editStatus,
                description: editDesc,
                assignedTo: editAssigned
              }
            })}>Update Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal - Config Settings */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[550px] overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Configure WhatsApp Support Tickets Bot</DialogTitle>
            <DialogDescription>Setup keywords, email alerts, forwarding, and AI mode preferences.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* active toggle */}
            <div className="flex items-center justify-between border-b pb-3.5">
              <div>
                <Label className="text-sm font-bold text-gray-800">Bot Active Status</Label>
                <p className="text-xs text-gray-500">Enable or disable Support Tickets bot on this channel.</p>
              </div>
              <Switch checked={botActive} onCheckedChange={setBotActive} />
            </div>

            {/* execution mode view */}
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <Label className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Subscription Mode</Label>
                <p className="text-sm font-semibold text-gray-800 mt-1 capitalize">{botModeType} Mode Active</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {botModeType === "ai" 
                    ? "In AI Mode, messages containing keywords or attachment photos are transcribed and analyzed by the LLM dynamically." 
                    : "In Flow Mode, the predefined Q&A chat flow is executed to register tickets sequentially."}
                </p>
              </div>
            </div>

            {/* keywords setup */}
            <div className="grid grid-cols-2 gap-3 border-b pb-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Trigger Keyword</Label>
                <Input value={botTrigger} onChange={(e) => setBotTrigger(e.target.value)} placeholder="e.g. ticket" />
                <p className="text-[10px] text-gray-400">Word that triggers ticket creation</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">Retrieval Keyword</Label>
                <Input value={botRetrieval} onChange={(e) => setBotRetrieval(e.target.value)} placeholder="e.g. getticket" />
                <p className="text-[10px] text-gray-400">Word to query logged ticket details</p>
              </div>
            </div>

            {/* Email Forwarding Alert */}
            <div className="space-y-3.5 border-b pb-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-bold text-gray-800">Email Ticket Forwarding</Label>
                  <p className="text-xs text-gray-500">Send an immediate email alert when a new support ticket is created.</p>
                </div>
                <Switch checked={forwardEnabled} onCheckedChange={setForwardEnabled} />
              </div>
              
              {forwardEnabled && (
                <div className="space-y-1.5 pl-2 border-l-2 border-rose-200">
                  <Label className="text-xs font-bold">Forward Email Address</Label>
                  <Input type="email" placeholder="e.g. support@company.com" value={forwardEmail} onChange={(e) => setForwardEmail(e.target.value)} />
                </div>
              )}
            </div>

            {/* Periodic reports */}
            <div className="space-y-4 border-b pb-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-bold text-gray-800">Periodic Report Alerts</Label>
                  <p className="text-xs text-gray-500">Send periodic summary Excel sheets and status metrics.</p>
                </div>
                <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
              </div>

              {emailEnabled && (
                <div className="space-y-3 pl-2 border-l-2 border-amber-200">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Report Email Address</Label>
                    <Input type="email" placeholder="e.g. admin@company.com" value={reportEmail} onChange={(e) => setReportEmail(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Report Interval</Label>
                      <select value={reportInterval} onChange={(e) => setReportInterval(e.target.value)} className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Alert Phone Number (WhatsApp)</Label>
                      <Input placeholder="e.g. +91XXXXXXXXXX" value={reportNumber} onChange={(e) => setReportNumber(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Custom AI prompt configuration */}
            {botModeType === "ai" && (
              <div className="space-y-1.5 border-b pb-3.5">
                <Label className="text-sm font-bold text-gray-800">Custom AI Prompt (Ocr/LLM)</Label>
                <Textarea value={botPrompt} onChange={(e) => setBotPrompt(e.target.value)} rows={3} className="text-xs" />
                <p className="text-[10px] text-gray-400">Instruct the LLM on how to extract categories or handle ticket subjects.</p>
              </div>
            )}

            {/* Reload flow template button */}
            <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between border">
              <div>
                <Label className="text-xs font-bold text-gray-700">Chatbot Predefined Flow</Label>
                <p className="text-[10px] text-gray-500">Restore or load the default predefined support tickets canvas template.</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => reloadFlowMutation.mutate()}>
                Reload Flow template
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => saveConfigMutation.mutate({
              channelId: activeChannel?.id,
              triggerKeyword: botTrigger,
              retrievalKeyword: botRetrieval,
              reportingNumber: reportNumber || null,
              reportInterval,
              reportEmail: reportEmail || null,
              emailEnabled,
              forwardEmail: forwardEmail || null,
              forwardEnabled,
              isActive: botActive,
              aiPrompt: botPrompt,
              purchaseType: botModeType
            })}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
