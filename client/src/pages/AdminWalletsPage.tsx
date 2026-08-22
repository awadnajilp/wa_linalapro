/**
 * ============================================================
 * © 2026 Antigravity - Superadmin Tenant Wallets Panel
 * ============================================================
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { CreditCard, Settings, RefreshCw, CheckCircle, XCircle, Search, AlertCircle, PlusCircle, ArrowUpRight, ArrowDownRight, Loader2, Eye } from "lucide-react";

export default function AdminWalletsPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("wallets");

  // Modals state
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  
  const [selectedUserWallet, setSelectedUserWallet] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  // Form values
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [verifyDescription, setVerifyDescription] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // ────────────────────────────────────────────────────────
  // Queries
  // ────────────────────────────────────────────────────────
  
  // 1. Get all wallets in system
  const { data: walletsData, isLoading: isWalletsLoading } = useQuery({
    queryKey: ["/api/admin/wallets"],
    queryFn: () => apiRequest("GET", "/api/admin/wallets").then(res => res.json()),
  });

  // 2. Get all transaction logs
  const { data: txData, isLoading: isTxLoading } = useQuery({
    queryKey: ["/api/admin/wallet-transactions"],
    queryFn: () => apiRequest("GET", "/api/admin/wallet-transactions").then(res => res.json()),
  });

  // 3. Get global wallet settings (UPI / Margins / Exchange Rates)
  const { data: settingsData, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["/api/admin/wallet/settings"],
    queryFn: () => apiRequest("GET", "/api/admin/wallet/settings").then(res => res.json()),
  });

  // ────────────────────────────────────────────────────────
  // Mutations
  // ────────────────────────────────────────────────────────

  // 1. Toggle user wallet restrictions limits
  const toggleWalletLimitMutation = useMutation({
    mutationFn: (data: { userId: string; enabled: boolean }) =>
      apiRequest("POST", "/api/admin/wallets/toggle", data).then(res => res.json()),
    onSuccess: (data) => {
      toast({
        title: "Restriction Updated",
        description: data.message || "Wallet restriction status updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message || "Could not toggle restriction limit.",
        variant: "destructive",
      });
    }
  });

  // 2. Admin direct adjust balance mutation
  const adjustBalanceMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/admin/wallets/recharge-manual", data).then(res => res.json()),
    onSuccess: (data) => {
      toast({
        title: "Wallet Adjusted",
        description: data.message || "Wallet balance adjusted successfully.",
      });
      setShowAdjustDialog(false);
      setAdjustAmount("");
      setAdjustDescription("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet-transactions"] });
    },
    onError: (err: any) => {
      toast({
        title: "Adjustment Failed",
        description: err.message || "Could not adjust wallet balance.",
        variant: "destructive",
      });
    }
  });

  // 3. Admin verify manual payment transaction mutation
  const verifyManualMutation = useMutation({
    mutationFn: (data: { transactionId: string; status: "completed" | "failed"; description?: string }) =>
      apiRequest("POST", `/api/admin/wallet-transactions/${data.transactionId}/verify`, {
        status: data.status,
        description: data.description
      }).then(res => res.json()),
    onSuccess: (data) => {
      toast({
        title: "Transaction Verified",
        description: data.message || "Manual payment processed successfully.",
      });
      setShowVerifyDialog(false);
      setVerifyDescription("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet-transactions"] });
    },
    onError: (err: any) => {
      toast({
        title: "Verification Failed",
        description: err.message || "Could not verify manual transaction.",
        variant: "destructive",
      });
    }
  });

  // 4. Update global settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PUT", "/api/admin/wallet/settings", data).then(res => res.json()),
    onSuccess: (data) => {
      toast({
        title: "Settings Saved",
        description: data.message || "Global wallet configurations updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet/settings"] });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message || "Could not save configuration settings.",
        variant: "destructive",
      });
    }
  });

  // ────────────────────────────────────────────────────────
  // Event Handlers
  // ────────────────────────────────────────────────────────

  const handleToggleLimit = (userId: string, currentEnabled: boolean) => {
    toggleWalletLimitMutation.mutate({
      userId,
      enabled: !currentEnabled
    });
  };

  const handleAdjustBalance = () => {
    const amt = parseFloat(adjustAmount);
    if (isNaN(amt) || amt <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please specify a positive adjustment amount",
        variant: "destructive",
      });
      return;
    }

    if (!selectedUserWallet) return;

    adjustBalanceMutation.mutate({
      userId: selectedUserWallet.userId,
      amount: amt,
      type: adjustType,
      description: adjustDescription || `Admin manual ${adjustType} adjustment`
    });
  };

  const handleVerifyTransaction = (status: "completed" | "failed") => {
    if (!selectedTransaction) return;

    verifyManualMutation.mutate({
      transactionId: selectedTransaction.id,
      status,
      description: verifyDescription || `Manual verification: ${status}`
    });
  };

  const handleSaveSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const settings = {
      upiId: formData.get("upiId") as string,
      bankDetails: formData.get("bankDetails") as string,
      qrPrice: parseFloat(formData.get("qrPrice") as string || "0.0001"),
      marketingMargin: parseFloat(formData.get("marketingMargin") as string || "0"),
      utilityMargin: parseFloat(formData.get("utilityMargin") as string || "0"),
      authMargin: parseFloat(formData.get("authMargin") as string || "0"),
      serviceMargin: parseFloat(formData.get("serviceMargin") as string || "0"),
      qrMargin: parseFloat(formData.get("qrMargin") as string || "0"),
      exchangeRates: {
        USD: parseFloat(formData.get("rateUSD") as string || "1"),
        INR: parseFloat(formData.get("rateINR") as string || "83"),
        AED: parseFloat(formData.get("rateAED") as string || "3.67"),
        SAR: parseFloat(formData.get("rateSAR") as string || "3.75"),
        GBP: parseFloat(formData.get("rateGBP") as string || "0.78"),
        EUR: parseFloat(formData.get("rateEUR") as string || "0.92"),
        KWD: parseFloat(formData.get("rateKWD") as string || "0.31"),
        BHD: parseFloat(formData.get("rateBHD") as string || "0.38"),
        OMR: parseFloat(formData.get("rateOMR") as string || "0.38"),
        QAR: parseFloat(formData.get("rateQAR") as string || "3.64"),
        EGP: parseFloat(formData.get("rateEGP") as string || "48"),
      }
    };

    updateSettingsMutation.mutate(settings);
  };

  const wallets = walletsData?.wallets || [];
  const transactions = txData?.transactions || [];
  const walletSettings = settingsData?.walletSettings || {};

  // Filters
  const filteredWallets = wallets.filter((w: any) => {
    const user = w.user || {};
    const search = searchTerm.toLowerCase();
    return (
      user.username?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.firstName?.toLowerCase().includes(search) ||
      w.userId.toLowerCase().includes(search)
    );
  });

  const pendingManualCount = transactions.filter((t: any) => t.status === "pending" && ["upi", "account_transfer", "cash"].includes(t.paymentMethod)).length;

  return (
    <div className="flex-1 bg-gray-50 text-gray-900 min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Tenant Wallet Administration</h1>
            <p className="text-gray-500 mt-1">Manage tenant wallet balances, credit restrictions, manual payment approvals, and global pricing margins.</p>
          </div>
          <div className="flex gap-2">
            {pendingManualCount > 0 && (
              <Badge variant="destructive" className="animate-pulse px-3 py-1.5 font-bold flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {pendingManualCount} Pending Manual Recharge(s)
              </Badge>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border p-1 rounded-lg">
            <TabsTrigger value="wallets" className="px-4 py-2 font-semibold">Tenant Balances</TabsTrigger>
            <TabsTrigger value="transactions" className="px-4 py-2 font-semibold flex items-center gap-2">
              Transaction Approvals
              {pendingManualCount > 0 && (
                <span className="bg-red-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-extrabold">
                  {pendingManualCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="px-4 py-2 font-semibold">Wallet & Margin Settings</TabsTrigger>
          </TabsList>

          {/* TAB 1: WALLET BALANCES LIST */}
          <TabsContent value="wallets" className="space-y-4 outline-none">
            <div className="flex items-center gap-2 max-w-sm">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tenant username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white border-gray-200"
                />
              </div>
            </div>

            <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {isWalletsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                  </div>
                ) : filteredWallets.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No matching tenant wallets found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-500">Tenant (User)</TableHead>
                          <TableHead className="font-semibold text-gray-500">Wallet ID</TableHead>
                          <TableHead className="font-semibold text-gray-500">Balance</TableHead>
                          <TableHead className="font-semibold text-gray-500 text-center">Wallet Restrictions Limit</TableHead>
                          <TableHead className="font-semibold text-gray-500">Last Updated</TableHead>
                          <TableHead className="font-semibold text-gray-500 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWallets.map((w: any) => {
                          const userObj = w.user || { username: "N/A", email: "N/A", walletEnabled: false };
                          return (
                            <TableRow key={w.id} className="hover:bg-gray-50/50">
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-bold text-gray-900">{userObj.firstName} {userObj.lastName}</span>
                                  <span className="text-xs text-gray-400">{userObj.email}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-gray-500 max-w-[100px] truncate" title={w.id}>
                                {w.id}
                              </TableCell>
                              <TableCell className="font-extrabold text-sm text-green-700">
                                {w.balance} {w.currency}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Switch
                                    checked={userObj.walletEnabled}
                                    onCheckedChange={() => handleToggleLimit(w.userId, userObj.walletEnabled)}
                                    className="data-[state=checked]:bg-green-600"
                                  />
                                  <Badge variant={userObj.walletEnabled ? "default" : "secondary"} className={userObj.walletEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                    {userObj.walletEnabled ? "Restricted" : "Unlimited Credits"}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-gray-500">
                                {new Date(w.updatedAt).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUserWallet(w);
                                    setShowAdjustDialog(true);
                                  }}
                                  className="text-xs py-1.5 border-green-600 text-green-600 hover:bg-green-50"
                                >
                                  <PlusCircle className="w-3.5 h-3.5 mr-1" /> Adjust Balance
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: TRANSACTION LOGS AND MANUAL VERIFICATION */}
          <TabsContent value="transactions" className="space-y-4 outline-none">
            <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-lg font-bold">Transaction History & Verification</CardTitle>
                <CardDescription>Verify manual payment deposits (UPI, Cash, Bank Transfer) or review auto-debit messaging costs.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isTxLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No transactions logs found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-500">Tenant (User)</TableHead>
                          <TableHead className="font-semibold text-gray-500">Date</TableHead>
                          <TableHead className="font-semibold text-gray-500">Method</TableHead>
                          <TableHead className="font-semibold text-gray-500">Type</TableHead>
                          <TableHead className="font-semibold text-gray-500">Amount</TableHead>
                          <TableHead className="font-semibold text-gray-500">Status</TableHead>
                          <TableHead className="font-semibold text-gray-500">Description</TableHead>
                          <TableHead className="font-semibold text-gray-500 text-right">Verification</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx: any) => {
                          const userObj = tx.user || { username: "N/A", email: "N/A" };
                          const isManualPending = tx.status === "pending" && ["upi", "account_transfer", "cash"].includes(tx.paymentMethod);
                          return (
                            <TableRow key={tx.id} className="hover:bg-gray-50/50">
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-bold text-xs text-gray-900">{userObj.firstName} {userObj.lastName}</span>
                                  <span className="text-[10px] text-gray-400">{userObj.email}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-gray-500">
                                {new Date(tx.createdAt).toLocaleString()}
                              </TableCell>
                              <TableCell className="capitalize text-xs font-semibold">
                                {tx.paymentMethod.replace("_", " ")}
                              </TableCell>
                              <TableCell>
                                <Badge variant={tx.type === "credit" ? "outline" : "secondary"} className={tx.type === "credit" ? "text-green-700 bg-green-50 border-green-200" : "text-red-700 bg-red-50 border-red-200"}>
                                  {tx.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-bold text-xs">
                                {tx.type === "credit" ? "+" : "-"}{tx.amount.toFixed(4)} {tx.currency}
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  tx.status === "completed" 
                                    ? "bg-green-100 text-green-800" 
                                    : tx.status === "pending" 
                                      ? "bg-yellow-100 text-yellow-800" 
                                      : "bg-red-100 text-red-800"
                                }>
                                  {tx.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-gray-500 max-w-xs truncate" title={tx.description}>
                                {tx.description}
                              </TableCell>
                              <TableCell className="text-right">
                                {isManualPending ? (
                                  <Button
                                    size="xs"
                                    onClick={() => {
                                      setSelectedTransaction(tx);
                                      setShowVerifyDialog(true);
                                    }}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold h-7 text-xs px-2.5"
                                  >
                                    <Eye className="w-3.5 h-3.5 mr-1" /> Review
                                  </Button>
                                ) : (
                                  tx.receiptUrl ? (
                                    <a 
                                      href={tx.receiptUrl} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="text-xs text-blue-600 underline hover:text-blue-800 flex items-center justify-end gap-1"
                                    >
                                      View Receipt
                                    </a>
                                  ) : (
                                    <span className="text-xs text-gray-300">-</span>
                                  )
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: WALLET GLOBAL CONFIGURATION & MARGINS */}
          <TabsContent value="settings" className="outline-none">
            {isSettingsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Manual UPI & Bank Details Config */}
                <Card className="md:col-span-1 border border-gray-200 bg-white shadow-sm">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      🔌 Manual Payment Setup
                    </CardTitle>
                    <CardDescription>Configure local payment details for tenants' click-to-pay intent.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 block">Global UPI Address</label>
                      <Input
                        name="upiId"
                        placeholder="e.g. pay@bankupi"
                        defaultValue={walletSettings.upiId || ""}
                        className="border-gray-200"
                      />
                      <p className="text-[10px] text-gray-400">Used for generating direct upi click intent pay links.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 block">Bank Account Transfer Details</label>
                      <textarea
                        name="bankDetails"
                        rows={4}
                        placeholder="Bank Name:&#10;Account No:&#10;IFSC Code:&#10;Branch Name:"
                        defaultValue={walletSettings.bankDetails || ""}
                        className="w-full text-sm border border-gray-200 rounded-lg p-3 bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                      <p className="text-[10px] text-gray-400">Details displayed to tenants selecting Account Transfer method.</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Margins Percent Config */}
                <Card className="md:col-span-1 border border-gray-200 bg-white shadow-sm">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      📈 Cost Margins & pricing
                    </CardTitle>
                    <CardDescription>Apply markups (%) to base Meta pricing and set default prices.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 block">Marketing Margin (%)</label>
                        <Input
                          type="number"
                          step="0.1"
                          name="marketingMargin"
                          defaultValue={walletSettings.marketingMargin || "0"}
                          className="border-gray-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 block">Utility Margin (%)</label>
                        <Input
                          type="number"
                          step="0.1"
                          name="utilityMargin"
                          defaultValue={walletSettings.utilityMargin || "0"}
                          className="border-gray-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 block">Auth Margin (%)</label>
                        <Input
                          type="number"
                          step="0.1"
                          name="authMargin"
                          defaultValue={walletSettings.authMargin || "0"}
                          className="border-gray-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 block">Service Margin (%)</label>
                        <Input
                          type="number"
                          step="0.1"
                          name="serviceMargin"
                          defaultValue={walletSettings.serviceMargin || "0"}
                          className="border-gray-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 block">QR Price (USD/msg)</label>
                        <Input
                          type="number"
                          step="0.00001"
                          name="qrPrice"
                          defaultValue={walletSettings.qrPrice !== undefined ? walletSettings.qrPrice : "0.0001"}
                          className="border-gray-200 font-mono"
                        />
                        <p className="text-[9px] text-gray-400 leading-tight">Default per-message price for QR code channels.</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 block">QR Margin (%)</label>
                        <Input
                          type="number"
                          step="0.1"
                          name="qrMargin"
                          defaultValue={walletSettings.qrMargin || "0"}
                          className="border-gray-200"
                        />
                        <p className="text-[9px] text-gray-400 leading-tight">Markup applied to QR channel base price.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Exchange Rates Configurations */}
                <Card className="md:col-span-1 border border-gray-200 bg-white shadow-sm flex flex-col justify-between">
                  <div>
                    <CardHeader className="pb-3 border-b">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        💱 Exchange Rates (vs USD)
                      </CardTitle>
                      <CardDescription>Convert wallet balances from USD base to selected currencies.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-1">
                      {Object.entries(walletSettings.exchangeRates || {
                        USD: 1.0, INR: 83.0, AED: 3.67, SAR: 3.75, GBP: 0.78, EUR: 0.92, KWD: 0.31, BHD: 0.38, OMR: 0.38, QAR: 3.64, EGP: 48.0
                      }).map(([curr, rate]) => (
                        <div key={curr} className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 block">{curr} Rate</label>
                          <Input
                            type="number"
                            step="0.01"
                            name={`rate${curr}`}
                            defaultValue={rate as number}
                            className="border-gray-200 h-9 font-mono text-xs"
                          />
                        </div>
                      ))}
                    </CardContent>
                  </div>
                  <CardContent className="pt-4 border-t">
                    <Button 
                      type="submit" 
                      disabled={updateSettingsMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-11"
                    >
                      {updateSettingsMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                        </>
                      ) : (
                        "Save Configurations"
                      )}
                    </Button>
                  </CardContent>
                </Card>

              </form>
            )}
          </TabsContent>
        </Tabs>

      </div>

      {/* ==================== ADMIN MODALS ==================== */}

      {/* 1. Direct Adjust Balance Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              Adjust Tenant Balance
            </DialogTitle>
            <DialogDescription>
              Adjust wallet balance directly. This creates a manual debit/credit transaction record.
            </DialogDescription>
          </DialogHeader>

          {selectedUserWallet && (
            <div className="space-y-4 py-3">
              <div className="bg-gray-50 border p-3 rounded-lg text-xs space-y-1.5">
                <p><span className="text-gray-400 font-semibold">Tenant:</span> <span className="font-bold text-gray-700">{selectedUserWallet.user?.firstName} ({selectedUserWallet.user?.email})</span></p>
                <p><span className="text-gray-400 font-semibold">Current Balance:</span> <span className="font-extrabold text-sm text-green-600">{selectedUserWallet.balance} {selectedUserWallet.currency}</span></p>
              </div>

              {/* Adjust Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={adjustType === "credit" ? "default" : "outline"}
                    className={adjustType === "credit" ? "bg-green-600 hover:bg-green-700 text-white font-bold h-10" : "h-10"}
                    onClick={() => setAdjustType("credit")}
                  >
                    <ArrowUpRight className="w-4 h-4 mr-1 text-green-500" /> Credit (+)
                  </Button>
                  <Button
                    type="button"
                    variant={adjustType === "debit" ? "default" : "outline"}
                    className={adjustType === "debit" ? "bg-red-600 hover:bg-red-700 text-white font-bold h-10" : "h-10"}
                    onClick={() => setAdjustType("debit")}
                  >
                    <ArrowDownRight className="w-4 h-4 mr-1 text-red-500" /> Debit (-)
                  </Button>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Adjustment Amount</label>
                <Input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  placeholder="Enter amount"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="border-gray-200"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Adjustment Rationale</label>
                <Input
                  placeholder="e.g. Campaign backfill credit / Service compensation"
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                  className="border-gray-200"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button 
                  onClick={handleAdjustBalance}
                  disabled={adjustBalanceMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-11"
                >
                  {adjustBalanceMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adjusting...
                    </>
                  ) : (
                    `Confirm manual ${adjustType} of ${adjustAmount || '0'} ${selectedUserWallet.currency}`
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Manual Payment review and verification Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              Review Manual Payment Deposit
            </DialogTitle>
            <DialogDescription>
              Verify manual UPI, Cash or Bank account transfer receipts to complete the wallet top-up.
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4 py-2">
              <div className="bg-gray-50 border p-4 rounded-xl text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">User:</span>
                  <span className="font-bold text-gray-800">{selectedTransaction.user?.firstName} ({selectedTransaction.user?.email})</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-gray-400 font-semibold">Payment Method:</span>
                  <span className="font-bold text-gray-800 uppercase">{selectedTransaction.paymentMethod}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-gray-400 font-semibold">Deposit Amount:</span>
                  <span className="font-extrabold text-sm text-green-600">{selectedTransaction.amount} {selectedTransaction.currency}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-gray-400 font-semibold">Transaction Date:</span>
                  <span className="font-medium text-gray-600">{new Date(selectedTransaction.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Receipt Preview */}
              {selectedTransaction.receiptUrl && (
                <div className="space-y-1.5 border-t pt-3">
                  <span className="text-xs font-bold text-gray-700 block">Uploaded Transfer Receipt</span>
                  <div className="border rounded-xl p-2 bg-gray-50 max-h-48 overflow-hidden flex justify-center items-center">
                    {selectedTransaction.receiptUrl.endsWith(".pdf") ? (
                      <a 
                        href={selectedTransaction.receiptUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline font-semibold flex items-center gap-1"
                      >
                        📄 Download PDF Receipt
                      </a>
                    ) : (
                      <img 
                        src={selectedTransaction.receiptUrl} 
                        alt="receipt" 
                        className="max-h-40 rounded border shadow-sm cursor-pointer object-contain" 
                        onClick={() => window.open(selectedTransaction.receiptUrl, "_blank")}
                      />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 text-center">Click image to view full scale in a new tab.</p>
                </div>
              )}

              {/* Verification Remarks */}
              <div className="space-y-1.5 border-t pt-3">
                <label className="text-xs font-bold text-gray-700">Verification remarks (Optional)</label>
                <Input
                  placeholder="e.g. Receipt verified successfully against bank statement"
                  value={verifyDescription}
                  onChange={(e) => setVerifyDescription(e.target.value)}
                  className="border-gray-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <Button 
                  onClick={() => handleVerifyTransaction("completed")}
                  disabled={verifyManualMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold h-11"
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Approve & Credit
                </Button>
                <Button 
                  onClick={() => handleVerifyTransaction("failed")}
                  disabled={verifyManualMutation.isPending}
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 font-bold h-11"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Decline / Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
