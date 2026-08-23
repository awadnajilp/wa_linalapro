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
import { Wallet, Coins, Plus, Trash, FileSpreadsheet, Settings, UserCheck, Calendar, Filter, Sparkles, Volume2 } from "lucide-react";
import { useChannelContext } from "@/contexts/channel-context";
import { Switch } from "@/components/ui/switch";

interface Expense {
  id: string;
  amount: string;
  category: string;
  paymentAccountId: string | null;
  description: string | null;
  date: string;
}

interface PaymentAccount {
  id: string;
  name: string;
  type: string;
  balance: string;
}

interface ExpenseConfig {
  id: string;
  triggerKeyword: string;
  retrievalKeyword: string;
  reportingNumber: string | null;
  reportInterval: string;
  reportEmail: string | null;
  emailEnabled: boolean;
  isActive: boolean;
}

export default function ExpenseLedger() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeChannel } = useChannelContext();

  // Filters
  const [category, setCategory] = useState("all");
  const [paymentAccountId, setPaymentAccountId] = useState("all");
  const [timeframe, setTimeframe] = useState("month"); // today, week, month, year, custom
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  // Modals open state
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Forms states
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Food");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);

  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("cash");
  const [accountBalance, setAccountBalance] = useState("0");

  const [botTrigger, setBotTrigger] = useState("expense");
  const [botRetrieval, setBotRetrieval] = useState("getexpense");
  const [reportNumber, setReportNumber] = useState("");
  const [reportInterval, setReportInterval] = useState("daily");
  const [reportEmail, setReportEmail] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [botActive, setBotActive] = useState(true);

  // Fetch Accounts
  const { data: accounts } = useQuery<PaymentAccount[]>({
    queryKey: ["/api/expenses/payment-accounts"],
  });

  // Fetch Config
  const { data: config } = useQuery<ExpenseConfig>({
    queryKey: ["/api/expenses/config", activeChannel?.id],
    enabled: !!activeChannel?.id,
    onSuccess: (data) => {
      if (data) {
        setBotTrigger(data.triggerKeyword);
        setBotRetrieval(data.retrievalKeyword);
        setReportNumber(data.reportingNumber || "");
        setReportInterval(data.reportInterval);
        setReportEmail(data.reportEmail || "");
        setEmailEnabled(data.emailEnabled);
        setBotActive(data.isActive !== undefined ? data.isActive : true);
      }
    }
  });

  // Calculate dates based on timeframe
  // Calculate dates based on timeframe (memoized to prevent infinite query loops)
  const dates = useMemo(() => {
    if (timeframe === "custom") {
      return { start: startDate, end: endDate };
    }
    const end = new Date();
    const start = new Date();
    if (timeframe === "today") {
      start.setHours(0,0,0,0);
    } else if (timeframe === "week") {
      start.setDate(end.getDate() - 7);
    } else if (timeframe === "month") {
      start.setDate(end.getDate() - 30);
    } else if (timeframe === "year") {
      start.setDate(end.getDate() - 365);
    }
    // Set static hour bounds to ensure stable ISO strings
    end.setSeconds(0, 0);
    start.setSeconds(0, 0);
    return { start: start.toISOString(), end: end.toISOString() };
  }, [timeframe, startDate, endDate]);

  // Fetch Expenses with Filters
  const { data: expenses } = useQuery<Expense[]>({
    queryKey: [
      "/api/expenses",
      category,
      paymentAccountId,
      timeframe,
      dates.start,
      dates.end,
      search,
      activeChannel?.id,
    ],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (activeChannel?.id) q.set("channelId", activeChannel.id);
      if (category !== "all") q.set("category", category);
      if (paymentAccountId !== "all") q.set("paymentAccountId", paymentAccountId);
      if (dates.start) q.set("startDate", dates.start);
      if (dates.end) q.set("endDate", dates.end);
      if (search) q.set("search", search);

      const res = await fetch(`/api/expenses?${q.toString()}`);
      return res.json();
    },
  });

  // Mutations
  const createExpenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/expenses", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Expense Added", description: "Manual expense successfully logged." });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/payment-accounts"] });
      setIsExpenseOpen(false);
      setExpenseAmount("");
      setExpenseDesc("");
    }
  });

  const createAccountMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/expenses/payment-accounts", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account Created", description: "Payment account registered." });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/payment-accounts"] });
      setIsAccountOpen(false);
      setAccountName("");
      setAccountBalance("0");
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/expenses/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Expense log deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/payment-accounts"] });
    }
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/expenses/config", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Bot triggers configured." });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/config", activeChannel?.id] });
      setIsConfigOpen(false);
    }
  });

  const loadFlowMutation = useMutation({
    mutationFn: async (payload: { channelId: string }) => {
      const res = await apiRequest("POST", "/api/expenses/load-flow", payload);
      if (!res.ok) throw new Error("Failed to load flow");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Default Flow Preloaded", description: data.message || "Predefined Expense tracker flow added to your automations." });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to preload default flow template.", variant: "destructive" });
    }
  });

  const handleLoadFlow = () => {
    if (!activeChannel?.id) return;
    loadFlowMutation.mutate({ channelId: activeChannel.id });
  };

  const handleExport = () => {
    const q = new URLSearchParams();
    if (activeChannel?.id) q.set("channelId", activeChannel.id);
    if (category !== "all") q.set("category", category);
    if (paymentAccountId !== "all") q.set("paymentAccountId", paymentAccountId);
    if (dates.start) q.set("startDate", dates.start);
    if (dates.end) q.set("endDate", dates.end);

    window.open(`/api/expenses/export?${q.toString()}`, "_blank");
  };

  const handleCreateExpense = () => {
    createExpenseMutation.mutate({
      amount: expenseAmount,
      category: expenseCategory,
      paymentAccountId: expenseAccountId || null,
      description: expenseDesc,
      date: expenseDate,
      channelId: activeChannel?.id
    });
  };

  const handleCreateAccount = () => {
    createAccountMutation.mutate({
      name: accountName,
      type: accountType,
      balance: accountBalance
    });
  };

  const handleSaveConfig = () => {
    if (!activeChannel?.id) return;
    saveConfigMutation.mutate({
      channelId: activeChannel.id,
      triggerKeyword: botTrigger,
      retrievalKeyword: botRetrieval,
      reportingNumber: reportNumber,
      reportInterval: reportInterval,
      reportEmail: reportEmail,
      emailEnabled: emailEnabled,
      isActive: botActive
    });
  };

  const totalSpent = expenses?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            <Coins className="text-indigo-600 w-8 h-8" /> WhatsApp Expense Tracker
          </h1>
          <p className="text-gray-500">
            Interactive AI bot logging, expense ledgers, accounts balances, and periodic reporting schedules.
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Channel: <strong className="text-gray-700 font-bold">{activeChannel?.name || "None Selected"}</strong>
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              botActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            }`}>
              {botActive ? "Bot Active" : "Bot Inactive"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-gray-200 text-gray-700 flex items-center gap-1.5 h-10">
                <Settings className="w-4 h-4" /> Bot Configurations
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>WhatsApp Bot Config</DialogTitle>
                <DialogDescription>Setup keywords to trigger and retrieve expenses on WhatsApp.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Enable Bot</Label>
                  <div className="flex items-center col-span-3">
                    <Switch checked={botActive} onCheckedChange={setBotActive} />
                    <span className="text-xs text-gray-500 ml-2">Toggle bot parsing for this channel</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="triggerK" className="text-right">Trigger Word</Label>
                  <Input id="triggerK" value={botTrigger} onChange={(e) => setBotTrigger(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="retrievalK" className="text-right">Retrieval Word</Label>
                  <Input id="retrievalK" value={botRetrieval} onChange={(e) => setBotRetrieval(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="repNumber" className="text-right">Report Phone</Label>
                  <Input id="repNumber" value={reportNumber} onChange={(e) => setReportNumber(e.target.value)} className="col-span-3" placeholder="Phone with country prefix" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="interval" className="text-right">Interval</Label>
                  <select id="interval" value={reportInterval} onChange={(e) => setReportInterval(e.target.value)} className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="repEmail" className="text-right">Report Email</Label>
                  <Input id="repEmail" value={reportEmail} onChange={(e) => setReportEmail(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Email Reports</Label>
                  <div className="flex items-center col-span-3">
                    <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
                    <span className="text-xs text-gray-500 ml-2">Attach ledger as Excel (.xlsx)</span>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4 space-y-3 col-span-full">
                  <Label className="text-xs font-bold text-gray-400 uppercase">Automation Canvas Flow</Label>
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={handleLoadFlow}
                      className="w-full text-indigo-650 hover:bg-indigo-50 border-indigo-100 text-xs flex items-center justify-center gap-1 h-9"
                      disabled={loadFlowMutation.isPending}
                    >
                      {loadFlowMutation.isPending ? "Loading..." : "Load Default Flow"}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => window.location.href = "/automation?editFlowName=WhatsApp%20Expense%20Tracker%20Bot"}
                      className="w-full text-gray-700 hover:bg-gray-100 border-gray-200 text-xs flex items-center justify-center gap-1 h-9"
                    >
                      Edit Flow
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfigOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveConfig} className="bg-green-600 hover:bg-green-700 text-white">Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAccountOpen} onOpenChange={setIsAccountOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-gray-200 text-gray-700 flex items-center gap-1.5 h-10">
                <Wallet className="w-4 h-4" /> Add Payment Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>New Ledger Account</DialogTitle>
                <DialogDescription>Create a Cash account, Bank Account, or Credit Card ledger.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="accName" className="text-right">Name</Label>
                  <Input id="accName" value={accountName} onChange={(e) => setAccountName(e.target.value)} className="col-span-3" placeholder="Cash, ICICI Bank, Card" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="accType" className="text-right">Type</Label>
                  <select id="accType" value={accountType} onChange={(e) => setAccountType(e.target.value)} className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Account</option>
                    <option value="credit_card">Credit Card</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="accBal" className="text-right">Init Balance</Label>
                  <Input id="accBal" type="number" value={accountBalance} onChange={(e) => setAccountBalance(e.target.value)} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAccountOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateAccount} className="bg-green-600 hover:bg-green-700 text-white">Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5 h-10">
                <Plus className="w-4 h-4" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Add Manual Expense</DialogTitle>
                <DialogDescription>Log an expense entry directly into the ledger.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="expAmt" className="text-right">Amount</Label>
                  <Input id="expAmt" type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="col-span-3" placeholder="50.00" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="expCat" className="text-right">Category</Label>
                  <select id="expCat" value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option value="Food">Food</option>
                    <option value="Travel">Travel</option>
                    <option value="Office">Office</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Utility">Utility</option>
                    <option value="Rent">Rent</option>
                    <option value="Salaries">Salaries</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="expAcc" className="text-right">Account</Label>
                  <select id="expAcc" value={expenseAccountId} onChange={(e) => setExpenseAccountId(e.target.value)} className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option value="">Select Account (Default Cash)</option>
                    {accounts?.map(a => (
                      <option key={a.id} value={a.id}>{a.name} (${parseFloat(a.balance).toFixed(2)})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="expDesc" className="text-right">Description</Label>
                  <Input id="expDesc" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} className="col-span-3" placeholder="Taxi ride, office chairs" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="expDate" className="text-right">Date</Label>
                  <Input id="expDate" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsExpenseOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateExpense} className="bg-green-600 hover:bg-green-700 text-white">Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Accounts & Metrics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold opacity-85 uppercase tracking-wide">Total Logged Expense</CardTitle>
            <span className="text-3xl font-extrabold">${totalSpent.toFixed(2)}</span>
          </CardHeader>
          <CardContent className="pt-2 text-xs opacity-75 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> For the selected filters period
          </CardContent>
        </Card>

        {accounts?.map((acc) => (
          <Card key={acc.id} className="border border-gray-150 shadow-xs">
            <CardHeader className="pb-2">
              <CardDescription className="capitalize text-xs font-semibold text-gray-400 uppercase tracking-wider">{acc.type.replace("_", " ")}</CardDescription>
              <CardTitle className="text-lg font-bold text-gray-800">{acc.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-baseline pt-2">
              <span className="text-2xl font-extrabold text-gray-900">${parseFloat(acc.balance).toFixed(2)}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ledger filter controls bar */}
      <div className="bg-gray-50 border border-gray-150 p-4 rounded-lg flex flex-wrap gap-4 items-center justify-between shadow-xs">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-2.5 py-1 text-sm">
              <option value="all">All Categories</option>
              <option value="Food">Food</option>
              <option value="Travel">Travel</option>
              <option value="Office">Office</option>
              <option value="Marketing">Marketing</option>
              <option value="Utility">Utility</option>
              <option value="Rent">Rent</option>
              <option value="Salaries">Salaries</option>
              <option value="General">General</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Payment Account</span>
            <select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-2.5 py-1 text-sm">
              <option value="all">All Accounts</option>
              {accounts?.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Timeframe</span>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-2.5 py-1 text-sm">
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last 365 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {timeframe === "custom" && (
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Start</span>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 px-2 py-1" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase">End</span>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 px-2 py-1" />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Search</span>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 px-2 py-1" placeholder="Search logs..." />
          </div>
        </div>

        <Button onClick={handleExport} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 h-9 font-medium shadow-xs self-end">
          <FileSpreadsheet className="w-4 h-4" /> Export Excel
        </Button>
      </div>

      {/* Ledger lists Table */}
      <div className="bg-white border border-gray-150 rounded-lg shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses && expenses.length > 0 ? (
              expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.date).toLocaleString()}</TableCell>
                  <TableCell className="font-bold text-gray-800">${parseFloat(e.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      {e.category}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    {accounts?.find(a => a.id === e.paymentAccountId)?.name || "Cash"}
                  </TableCell>
                  <TableCell className="text-gray-500">{e.description || "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => deleteExpenseMutation.mutate(e.id)} className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 border-red-100">
                      <Trash className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                  No expense records found. Try sending text/voice reports to your bot!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bot Instructions Tip Box */}
      <Card className="bg-indigo-50/50 border border-indigo-100 p-4 flex gap-4 items-start shadow-xs">
        <Sparkles className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-1"><Volume2 className="w-4 h-4" /> AI Voice-to-Expense Enablement</h4>
          <p className="text-xs text-indigo-700 leading-relaxed">
            Your Expense Bot supports hands-free voice message logging. Simply press record on WhatsApp, and speak naturally. For example: 
            _“Just spent 45 dollars on lunch from credit card”_ or _“paid 120 dollars for internet bill from bank”_. The AI automatically detects your message, transcribes it, extracts the amount, matches the payment account, and saves it instantly!
          </p>
        </div>
      </Card>
    </div>
  );
}
