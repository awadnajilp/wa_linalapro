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
import { Bell, Calendar, Plus, Trash, Settings, Sparkles, Filter, Search, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useChannelContext } from "@/contexts/channel-context";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Reminder {
  id: string;
  contactPhone: string;
  contactName: string | null;
  title: string;
  dueTime: string;
  leadTimeMinutes: number;
  status: string; // "pending", "reminded_early", "reminded_main", "cancelled"
  createdAt: string;
}

interface ReminderConfig {
  id: string;
  triggerKeyword: string;
  todoKeyword: string;
  defaultLeadTimeMinutes: number;
  aiPrompt: string;
  apiKeySource?: "own_key" | "admin_key";
  isActive: boolean;
}

export default function RemindersLedger() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedChannel } = useChannelContext();

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [contactFilter, setContactFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;

  React.useEffect(() => {
    setPage(1);
  }, [statusFilter, contactFilter, searchQuery, selectedChannel]);

  // Modals open state
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Forms states
  const [newTitle, setNewTitle] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newDueTime, setNewDueTime] = useState("");
  const [newLeadTime, setNewLeadTime] = useState("15");

  const [botTrigger, setBotTrigger] = useState("remind");
  const [botTodo, setBotTodo] = useState("todo");
  const [botLeadTime, setBotLeadTime] = useState("15");
  const [botActive, setBotActive] = useState(true);
  const [botPrompt, setBotPrompt] = useState("You are a helper AI for a Reminders and To-Do app. Extract the task description (What) and the scheduled time (When) from the user's message. Interpret natural dates like 'tomorrow at 5pm' or 'next week 12th at 1pm' correctly.");
  const [apiKeySource, setApiKeySource] = useState<"own_key" | "admin_key">("own_key");
  const [configChannelId, setConfigChannelId] = useState("");

  // Fetch Channels
  const { data: channels } = useQuery<any[]>({
    queryKey: ["/api/channels"],
    queryFn: () => apiRequest("GET", "/api/channels").then((res) => res.json()),
  });

  // Fetch Addons Subscription
  const { data: addons } = useQuery<any[]>({
    queryKey: ["/api/tenant/addons"],
  });

  const remindersAddon = addons?.find(a => a.slug === "reminders-module");
  const purchaseType = remindersAddon?.subscription?.purchaseType || "flow";
  const [botModeType, setBotModeType] = useState("flow");

  // Sync purchase type state when loaded
  React.useEffect(() => {
    if (purchaseType) {
      setBotModeType(purchaseType);
    }
  }, [purchaseType]);

  // Bind active channel when it changes
  React.useEffect(() => {
    if (selectedChannel?.id) {
      setConfigChannelId(selectedChannel.id);
    }
  }, [selectedChannel?.id]);

  // Fetch Distinct Contacts with Reminders
  const { data: contactsWithReminders = [] } = useQuery<Array<{ contactPhone: string; contactName: string | null; totalCount: number; pendingCount: number }>>({
    queryKey: ["/api/reminders/contacts", selectedChannel?.id],
    queryFn: async () => {
      if (!selectedChannel?.id) return [];
      const res = await fetch(`/api/reminders/contacts?channelId=${selectedChannel.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedChannel?.id,
  });

  // Fetch Config
  const { data: config } = useQuery<ReminderConfig>({
    queryKey: ["/api/reminders/config", configChannelId],
    queryFn: async () => {
      const res = await fetch(`/api/reminders/config?channelId=${configChannelId}`);
      if (!res.ok) throw new Error("Failed to fetch reminders config");
      return res.json();
    },
    enabled: !!configChannelId,
  });

  React.useEffect(() => {
    if (config) {
      setBotTrigger(config.triggerKeyword || "remind");
      setBotTodo(config.todoKeyword || "todo");
      setBotLeadTime(String(config.defaultLeadTimeMinutes || 15));
      setBotActive(config.isActive !== undefined ? config.isActive : true);
      setBotPrompt(config.aiPrompt || "You are a helper AI for a Reminders and To-Do app. Extract the task description (What) and the scheduled time (When) from the user's message. Interpret natural dates like 'tomorrow at 5pm' or 'next week 12th at 1pm' correctly.");
      setApiKeySource(config.apiKeySource || "own_key");
    }
  }, [config]);

  // Fetch Reminders
  const { data } = useQuery<{
    data: Reminder[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: [
      "/api/reminders",
      selectedChannel?.id,
      statusFilter,
      contactFilter,
      searchQuery,
      page
    ],
    queryFn: async () => {
      if (!selectedChannel?.id) return { data: [], total: 0, page: 1, limit };
      const params = new URLSearchParams({
        channelId: selectedChannel.id,
        status: statusFilter,
        contactPhone: contactFilter,
        search: searchQuery,
        page: String(page),
        limit: String(limit)
      });
      const res = await fetch(`/api/reminders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load reminders");
      return res.json();
    },
    enabled: !!selectedChannel?.id,
  });

  const reminders = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Stats
  const activeRemindersCount = useMemo(() => {
    return reminders.filter(r => r.status === "pending" || r.status === "reminded_early").length;
  }, [reminders]);

  // Mutations
  const createReminderMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/reminders", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Reminder scheduled successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/contacts", selectedChannel?.id] });
      setIsReminderOpen(false);
      setNewTitle("");
      setNewPhone("");
      setNewName("");
      setNewDueTime("");
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/reminders/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Reminder removed successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/contacts", selectedChannel?.id] });
    }
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/reminders/config", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Reminders bot configurations updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/config", configChannelId] });
      setIsConfigOpen(false);
    }
  });

  const handleCreateReminder = () => {
    if (!newTitle.trim() || !newPhone.trim() || !newDueTime) {
      toast({ title: "Required Fields", description: "Please complete Task title, Phone, and due time.", variant: "destructive" });
      return;
    }
    createReminderMutation.mutate({
      channelId: selectedChannel?.id,
      contactPhone: newPhone,
      contactName: newName || null,
      title: newTitle,
      dueTime: new Date(newDueTime).toISOString(),
      leadTimeMinutes: parseInt(newLeadTime)
    });
  };

  const handleSaveConfig = () => {
    if (!configChannelId) return;
    saveConfigMutation.mutate({
      channelId: configChannelId,
      triggerKeyword: botTrigger,
      todoKeyword: botTodo,
      defaultLeadTimeMinutes: parseInt(botLeadTime),
      aiPrompt: botPrompt,
      apiKeySource,
      isActive: botActive,
      purchaseType: botModeType
    });
  };

  const handleDeleteReminder = (id: string) => {
    if (confirm("Are you sure you want to cancel/delete this reminder?")) {
      deleteReminderMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            <Bell className="text-indigo-600 w-8 h-8 animate-swing" /> Reminders &amp; To-Do Ledger
          </h1>
          <p className="text-gray-500 text-sm">
            WhatsApp interactive scheduling bot that sends early notification messages (e.g. 15m before) and event time alerts.
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Channel: <strong className="text-gray-700 font-bold">{selectedChannel?.name || "None Selected"}</strong>
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              botActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            }`}>
              {botActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Bot Config Dialog */}
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-gray-200 text-gray-700 flex items-center gap-1.5 h-10 font-medium">
                <Settings className="w-4 h-4" /> Bot Configurations
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[540px] text-xs">
              <DialogHeader>
                <DialogTitle>Reminders Bot Configurations</DialogTitle>
                <DialogDescription>Setup trigger words, modes, AI providers, and default alert metrics.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[75vh] overflow-y-auto px-1">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="configChannel" className="text-right font-medium">Channel</Label>
                  <select
                    id="configChannel"
                    value={configChannelId}
                    onChange={(e) => setConfigChannelId(e.target.value)}
                    className="col-span-3 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    {channels?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phoneNumber || "QR Code Session"})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Enable Bot</Label>
                  <div className="flex items-center col-span-3">
                    <Switch checked={botActive} onCheckedChange={setBotActive} />
                    <span className="text-slate-500 ml-2">Active parser webhook intercepts</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="botMode" className="text-right font-medium">Bot Mode</Label>
                  <select
                    id="botMode"
                    value={botModeType}
                    onChange={(e) => setBotModeType(e.target.value)}
                    className="col-span-3 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <option value="flow">Flow Mode (Structured Questions)</option>
                    <option value="ai">AI Mode (Fully conversational context)</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="triggerK" className="text-right font-medium">Trigger Keyword</Label>
                  <Input id="triggerK" value={botTrigger} onChange={(e) => setBotTrigger(e.target.value)} className="col-span-3 h-9" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="todoK" className="text-right font-medium">Todo Keyword</Label>
                  <Input id="todoK" value={botTodo} onChange={(e) => setBotTodo(e.target.value)} className="col-span-3 h-9" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="leadK" className="text-right font-medium">Default Lead Alert</Label>
                  <select
                    id="leadK"
                    value={botLeadTime}
                    onChange={(e) => setBotLeadTime(e.target.value)}
                    className="col-span-3 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <option value="0">At Event Time Only</option>
                    <option value="5">5 Minutes Before</option>
                    <option value="10">10 Minutes Before</option>
                    <option value="15">15 Minutes Before</option>
                    <option value="30">30 Minutes Before</option>
                    <option value="60">60 Minutes Before</option>
                  </select>
                </div>

                {/* API Key Source Selection */}
                <div className="border border-indigo-100 rounded-lg p-3 bg-indigo-50/40 space-y-2 col-span-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-semibold text-xs text-gray-900 block">AI API Key & Billing Provider</Label>
                      <span className="text-[11px] text-gray-500 block">
                        Choose whether to use your own API keys or Platform keys with pay-as-you-go wallet billing.
                      </span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      apiKeySource === "admin_key"
                        ? "bg-purple-100 text-purple-800 border-purple-300"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      {apiKeySource === "admin_key" ? "Platform Admin Keys" : "Own API Keys (Free)"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div
                      onClick={() => setApiKeySource("own_key")}
                      className={`cursor-pointer rounded-lg p-2.5 border transition-all ${
                        apiKeySource === "own_key"
                          ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/20 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="reminderApiKeySource"
                          checked={apiKeySource === "own_key"}
                          onChange={() => setApiKeySource("own_key")}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-xs text-gray-900">Use My Own API Keys</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 pl-5 leading-relaxed">
                        Uses OpenAI, Sarvam &amp; Groq keys configured in your AI Settings. <strong>Zero wallet charges</strong>.
                      </p>
                    </div>

                    <div
                      onClick={() => setApiKeySource("admin_key")}
                      className={`cursor-pointer rounded-lg p-2.5 border transition-all ${
                        apiKeySource === "admin_key"
                          ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/20 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="reminderApiKeySource"
                          checked={apiKeySource === "admin_key"}
                          onChange={() => setApiKeySource("admin_key")}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-xs text-gray-900">Use Platform Admin Keys</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 pl-5 leading-relaxed">
                        Zero setup needed. Pay-as-you-go based on AI tokens used directly from your wallet balance.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2 col-span-full">
                  <div className="flex justify-between items-center">
                    <Label className="text-slate-500 font-bold uppercase text-[11px]">AI Parsing Agent Prompt</Label>
                    {purchaseType === "ai" && (
                      <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200 uppercase">AI Mode Active</span>
                    )}
                  </div>
                  <Textarea
                    value={botPrompt}
                    onChange={(e) => setBotPrompt(e.target.value)}
                    className="w-full min-h-[85px] text-xs"
                    placeholder="Instruct the AI how to parse dates..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setIsConfigOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSaveConfig} className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* New Reminder Dialog */}
          <Dialog open={isReminderOpen} onOpenChange={setIsReminderOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 h-10 font-semibold shadow-sm">
                <Plus className="w-4 h-4" /> Create Reminder
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] text-xs">
              <DialogHeader>
                <DialogTitle>Schedule New Reminder</DialogTitle>
                <DialogDescription>Manually configure and queue a scheduled alert sequence.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div className="space-y-1.5">
                  <Label htmlFor="remTitle">Task / To-Do description</Label>
                  <Input id="remTitle" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="E.g., Call doctor to confirm appointment" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="remPhone">WhatsApp number (With country code)</Label>
                  <Input id="remPhone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="E.g., 919876543210" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="remName">Recipient Name (Optional)</Label>
                  <Input id="remName" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="E.g., John Doe" className="h-9" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="remDue">Due Date &amp; Time</Label>
                    <Input id="remDue" type="datetime-local" value={newDueTime} onChange={(e) => setNewDueTime(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="remLead">Alert Advance Notify</Label>
                    <select
                      id="remLead"
                      value={newLeadTime}
                      onChange={(e) => setNewLeadTime(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <option value="0">At Event Time Only</option>
                      <option value="5">5 Mins Before</option>
                      <option value="10">10 Mins Before</option>
                      <option value="15">15 Mins Before</option>
                      <option value="30">30 Mins Before</option>
                      <option value="60">60 Mins Before</option>
                    </select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setIsReminderOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleCreateReminder} className="bg-indigo-650 hover:bg-indigo-700 text-white">Schedule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Scheduled Tasks</CardTitle>
            <span className="text-3xl font-extrabold text-slate-800">{total}</span>
          </CardHeader>
        </Card>
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Active Pending Reminders</CardTitle>
            <span className="text-3xl font-extrabold text-indigo-600">{activeRemindersCount}</span>
          </CardHeader>
        </Card>
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Flow trigger Keyword</CardTitle>
            <span className="text-xl font-bold text-slate-800 font-mono">/{botTrigger}</span>
          </CardHeader>
        </Card>
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Todo trigger Keyword</CardTitle>
            <span className="text-xl font-bold text-slate-800 font-mono">/{botTodo}</span>
          </CardHeader>
        </Card>
      </div>

      {/* Filter and Table Section */}
      <Card className="border-slate-200/80 shadow-xs bg-white">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-slate-800">Reminders Alerts Queue</CardTitle>
              <CardDescription className="text-xs">Monitor upcoming, completed, and early notification sequences.</CardDescription>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative w-full sm:w-[220px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search task, recipient phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-50 border-slate-200 text-xs h-9"
                />
              </div>

              {/* Contact Filter */}
              <select
                value={contactFilter}
                onChange={(e) => setContactFilter(e.target.value)}
                className="flex h-9 w-[180px] rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 truncate"
              >
                <option value="all">All Contacts ({contactsWithReminders.length})</option>
                {contactsWithReminders.map((c) => (
                  <option key={c.contactPhone} value={c.contactPhone}>
                    {c.contactName ? `${c.contactName} (${c.contactPhone})` : c.contactPhone} — {c.pendingCount} pending
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-9 w-[130px] rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reminded_early">Early Sent</option>
                <option value="reminded_main">Completed Alert</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-150 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <TableHead>Task / Description</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Event Due Time</TableHead>
                <TableHead className="text-center">Lead Alert</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {reminders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Clock className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium">No Reminders found</p>
                      <p className="text-xs">Active triggers will display pending alerts here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                reminders.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-semibold text-slate-800">{r.title}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{r.contactName || "No Name"}</span>
                        <span className="text-[10px] text-slate-500 font-medium font-mono">{r.contactPhone}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-600">
                      {new Date(r.dueTime).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-500">
                      {r.leadTimeMinutes === 0 ? "At event time" : `${r.leadTimeMinutes} mins before`}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        r.status === "pending"
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : r.status === "reminded_early"
                          ? "bg-blue-50 text-blue-700 border-blue-100"
                          : r.status === "reminded_main"
                          ? "bg-green-50 text-green-700 border-green-100"
                          : "bg-slate-50 text-slate-700 border-slate-100"
                      }`}>
                        {r.status === "pending"
                          ? "Pending"
                          : r.status === "reminded_early"
                          ? "Early Sent (15m)"
                          : r.status === "reminded_main"
                          ? "Completed"
                          : "Cancelled"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteReminder(r.id)}
                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                        title="Cancel Reminder"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 p-4 bg-slate-50/30">
              <span className="text-[11px] text-slate-500">
                Page <span className="font-semibold text-slate-800">{page}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="h-8 text-xs border-slate-200"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="h-8 text-xs border-slate-200"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
