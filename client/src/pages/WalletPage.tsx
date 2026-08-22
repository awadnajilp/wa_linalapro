/**
 * ============================================================
 * © 2026 Antigravity - Tenant Wallet Dashboard
 * ============================================================
 */

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { CreditCard, History, PlusCircle, AlertCircle, Info, Upload, Check, Loader2 } from "lucide-react";

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [rechargeAmount, setRechargeAmount] = useState<string>("50");
  const [paymentMethod, setPaymentMethod] = useState<string>("upi");
  const [customCurrency, setCustomCurrency] = useState<string>("USD");

  // Recharge workflow modal states
  const [showUpiDialog, setShowUpiDialog] = useState(false);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [showGatewayDialog, setShowGatewayDialog] = useState(false);

  // Active transaction info for modals
  const [activeTx, setActiveTx] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);

  // Predefined currencies
  const currencies = ["USD", "INR", "AED", "SAR", "GBP", "EUR", "KWD", "BHD", "OMR", "QAR", "EGP"];

  // Fetch Wallet
  const { data: walletData, isLoading: isWalletLoading } = useQuery({
    queryKey: ["/api/wallet/my-wallet"],
    queryFn: () => apiRequest("GET", "/api/wallet/my-wallet").then(res => res.json()),
  });

  // Fetch Transactions
  const { data: txData, isLoading: isTxLoading } = useQuery({
    queryKey: ["/api/wallet/transactions"],
    queryFn: () => apiRequest("GET", "/api/wallet/transactions").then(res => res.json()),
  });

  // Fetch global wallet configurations (UPI / Bank details / etc.)
  const { data: settingsData } = useQuery({
    queryKey: ["/api/admin/wallet/settings"],
    queryFn: () => apiRequest("GET", "/api/admin/wallet/settings").then(res => res.json()),
    enabled: user?.role === "superadmin", // fallback/check
  });

  // Mutations
  const initiateManualMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("POST", "/api/wallet/recharge/manual", data).then(res => res.json()),
    onSuccess: (data) => {
      setActiveTx(data);
      setIsInitiating(false);
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
      
      if (data.paymentMethod === "upi") {
        setShowUpiDialog(true);
      } else if (data.paymentMethod === "account_transfer") {
        setShowBankDialog(true);
      } else if (data.paymentMethod === "cash") {
        setShowCashDialog(true);
      }
    },
    onError: (err: any) => {
      setIsInitiating(false);
      toast({
        title: "Initiation Failed",
        description: err.message || "Failed to initiate manual payment",
        variant: "destructive",
      });
    }
  });

  const initiateGatewayMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("POST", "/api/wallet/recharge/gateway", data).then(res => res.json()),
    onSuccess: (data) => {
      setActiveTx(data);
      setIsInitiating(false);
      
      if (data.paymentMethod === "razorpay") {
        launchRazorpay(data);
      } else {
        // PayPal / Tap / Instamojo simulator redirection
        setShowGatewayDialog(true);
      }
    },
    onError: (err: any) => {
      setIsInitiating(false);
      toast({
        title: "Recharge Failed",
        description: err.message || "Failed to initiate gateway recharge",
        variant: "destructive",
      });
    }
  });

  const verifyGatewayMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("POST", "/api/wallet/recharge/verify", data).then(res => res.json()),
    onSuccess: (data) => {
      toast({
        title: "Payment Successful",
        description: data.message || "Wallet recharged successfully!",
      });
      setShowGatewayDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/my-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
    },
    onError: (err: any) => {
      toast({
        title: "Verification Failed",
        description: err.message || "Could not verify gateway payment",
        variant: "destructive",
      });
    }
  });

  // Razorpay Checkout launcher
  const launchRazorpay = (checkoutData: any) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      const options = {
        key: checkoutData.razorpayKeyId,
        amount: checkoutData.amount * 100, // paise
        currency: checkoutData.currency,
        name: "LINALA",
        description: "Wallet Recharge",
        order_id: checkoutData.razorpayOrderId,
        handler: async (response: any) => {
          verifyGatewayMutation.mutate({
            transactionId: checkoutData.transactionId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            success: true,
          });
        },
        prefill: {
          email: user?.email || "",
          name: user?.firstName || "",
        },
        theme: {
          color: "#16a34a",
        },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    };
    document.body.appendChild(script);
  };

  const handleInitiateRecharge = () => {
    const amt = parseFloat(rechargeAmount);
    if (isNaN(amt) || amt <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please specify a positive recharge amount",
        variant: "destructive",
      });
      return;
    }

    setIsInitiating(true);

    const payload = {
      amount: amt,
      paymentMethod,
      currency: customCurrency,
    };

    if (["upi", "account_transfer", "cash"].includes(paymentMethod)) {
      initiateManualMutation.mutate(payload);
    } else {
      initiateGatewayMutation.mutate(payload);
    }
  };

  const handleUploadReceipt = async (transactionId: string) => {
    if (!receiptFile) {
      toast({
        title: "No File Selected",
        description: "Please select a bank receipt image or PDF file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingReceipt(true);

    try {
      const formData = new FormData();
      formData.append("receipt", receiptFile);

      const response = await fetch(`/api/wallet/transactions/${transactionId}/submit-receipt`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Receipt Submitted",
          description: "Your transfer receipt was submitted and is pending verification.",
        });
        setShowBankDialog(false);
        setReceiptFile(null);
        queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
      } else {
        throw new Error(data.message || "Failed to upload receipt");
      }
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err.message || "Failed to upload receipt file",
        variant: "destructive",
      });
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleSimulateGatewayPayment = (success: boolean) => {
    if (!activeTx) return;
    verifyGatewayMutation.mutate({
      transactionId: activeTx.transactionId,
      success,
    });
  };

  if (isWalletLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  const wallet = walletData?.wallet || { balance: 0, currency: "USD", walletEnabled: false };
  const txs = txData?.transactions || [];

  return (
    <div className="flex-1 bg-gray-50 text-gray-900 min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Prepaid Wallet</h1>
            <p className="text-gray-500 mt-1">Manage your credit balances and outbound messaging payments.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1.5 text-xs bg-white shadow-sm border-gray-200">
              Wallet Limit Restrictions:
              {wallet.walletEnabled ? (
                <span className="text-green-600 font-bold ml-1.5 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Enforced
                </span>
              ) : (
                <span className="text-gray-500 font-medium ml-1.5">Unlimited (Disabled)</span>
              )}
            </Badge>
          </div>
        </div>

        {/* Info alerts */}
        {!wallet.walletEnabled && (
          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertTitle className="font-semibold">Unlimited Credits Mode</AlertTitle>
            <AlertDescription className="text-xs">
              Your account currently has no wallet restrictions enforced by admin. You can send campaigns and chat messages freely. 
              Any balance recharged below will be stored and ready when restrictions are toggled on.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Wallet Balance Display Card */}
          <Card className="md:col-span-1 border border-gray-200 shadow-sm bg-white overflow-hidden flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-gray-500 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" /> Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="py-6">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-gray-900">{wallet.balance.toFixed(4)}</span>
                <span className="text-lg font-bold text-gray-500">{wallet.currency}</span>
              </div>
              <p className="text-xs text-gray-400 mt-4 leading-normal">
                Charges are calculated per delivered message according to recipient country rate card and tax configs.
              </p>
            </CardContent>
          </Card>

          {/* Quick Recharge Selector Card */}
          <Card className="md:col-span-2 border border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-green-600" /> Recharge Wallet
              </CardTitle>
              <CardDescription>Select an amount and payment method to recharge your wallet balance.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              
              {/* Amounts Grid */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">Select Amount</label>
                <div className="grid grid-cols-5 gap-2">
                  {["20", "50", "100", "250", "500"].map((amt) => (
                    <Button
                      key={amt}
                      type="button"
                      variant={rechargeAmount === amt ? "default" : "outline"}
                      className={rechargeAmount === amt ? "bg-green-600 hover:bg-green-700 text-white font-bold" : "border-gray-200"}
                      onClick={() => setRechargeAmount(amt)}
                    >
                      {amt}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Custom Amount input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">Custom Amount</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter amount"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    className="border-gray-200"
                  />
                </div>

                {/* Currency select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">Currency</label>
                  <Select value={customCurrency} onValueChange={setCustomCurrency}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="USD" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gateway Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">Payment Gateway</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="UPI Click to Pay" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upi">UPI (GPay/PhonePe)</SelectItem>
                      <SelectItem value="account_transfer">Bank/Account Transfer</SelectItem>
                      <SelectItem value="cash">Cash Payment</SelectItem>
                      <SelectItem value="razorpay">Razorpay Checkout</SelectItem>
                      <SelectItem value="paypal">PayPal Gateway</SelectItem>
                      <SelectItem value="tap">Tap Payments</SelectItem>
                      <SelectItem value="instamojo">Instamojo Pay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Confirm submit button */}
              <div className="pt-2">
                <Button 
                  onClick={handleInitiateRecharge} 
                  disabled={isInitiating}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-11"
                >
                  {isInitiating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Initiating Recharge...
                    </>
                  ) : (
                    `Confirm & Pay ${rechargeAmount} ${customCurrency}`
                  )}
                </Button>
              </div>

            </CardContent>
          </Card>

        </div>

        {/* Transactions log list */}
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-green-600" /> Transaction History
              </CardTitle>
              <CardDescription>View records of wallet payments, manual topups, and message charge logs.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isTxLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-green-600" />
              </div>
            ) : txs.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No transaction logs located.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-500">Date</TableHead>
                      <TableHead className="font-semibold text-gray-500">Method</TableHead>
                      <TableHead className="font-semibold text-gray-500">Type</TableHead>
                      <TableHead className="font-semibold text-gray-500">Amount</TableHead>
                      <TableHead className="font-semibold text-gray-500">Status</TableHead>
                      <TableHead className="font-semibold text-gray-500">Description</TableHead>
                      <TableHead className="font-semibold text-gray-500">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txs.map((tx: any) => (
                      <TableRow key={tx.id} className="hover:bg-gray-50/50">
                        <TableCell className="text-xs text-gray-600">
                          {new Date(tx.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize text-xs font-medium">
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
                        <TableCell>
                          {tx.status === "pending" && tx.paymentMethod === "account_transfer" && (
                            <Button 
                              size="xs" 
                              variant="outline" 
                              onClick={() => {
                                setActiveTx(tx);
                                setShowBankDialog(true);
                              }}
                              className="text-xs py-1 h-7 border-green-600 text-green-600 hover:bg-green-50"
                            >
                              <Upload className="w-3.5 h-3.5 mr-1" /> Receipt
                            </Button>
                          )}
                          {tx.receiptUrl && (
                            <a 
                              href={tx.receiptUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-xs text-blue-600 underline hover:text-blue-800"
                            >
                              View Receipt
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ==================== WORKFLOW DIALOGS ==================== */}

      {/* 1. UPI click to pay / QR display dialog */}
      <Dialog open={showUpiDialog} onOpenChange={setShowUpiDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Check className="w-5 h-5 text-green-600" /> UPI Payment Initiated
            </DialogTitle>
            <DialogDescription>
              Scan the QR or click below to complete the transfer using any UPI application (GPay, PhonePe, Paytm, etc.).
            </DialogDescription>
          </DialogHeader>

          {activeTx && (
            <div className="space-y-6 py-4 flex flex-col items-center text-center">
              <div className="bg-gray-100 p-4 rounded-xl border border-dashed border-gray-300 w-full">
                <span className="text-xs text-gray-400 block uppercase font-bold">Transfer Exactly</span>
                <span className="text-3xl font-extrabold text-gray-900 mt-1 block">
                  {activeTx.amount} {activeTx.currency}
                </span>
                <span className="text-xs text-gray-500 block mt-2 font-mono">UPI ID: {activeTx.upiId || "diploy@upi"}</span>
              </div>

              {/* UPI Click Intent Button */}
              {activeTx.upiLink && (
                <Button 
                  asChild 
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12"
                >
                  <a href={activeTx.upiLink}>
                    📱 Pay via UPI Mobile App
                  </a>
                </Button>
              )}

              <div className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg border w-full text-left">
                <span className="font-semibold text-gray-600 block mb-1">How it works:</span>
                1. Make the payment directly using the UPI ID or pay button above.<br />
                2. Admin will review the transaction against logs and approve your wallet credits.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Bank / Account transfer receipt upload dialog */}
      <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              🏦 Account Transfer Instructions
            </DialogTitle>
            <DialogDescription>
              Please make a bank deposit/transfer to the details below, and upload your payment transaction receipt.
            </DialogDescription>
          </DialogHeader>

          {activeTx && (
            <div className="space-y-4 py-3">
              <div className="bg-gray-50 p-4 rounded-xl border space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">Amount to Transfer:</span>
                  <span className="font-bold text-gray-800 text-sm">{activeTx.amount} {activeTx.currency}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <span className="text-gray-400 font-semibold block mb-1">Bank Details:</span>
                  <pre className="font-mono text-gray-600 whitespace-pre-line leading-relaxed bg-white p-2 rounded border">
                    {activeTx.bankDetails || "Bank: HDFC Bank\nAccount: 50200084321234\nIFSC: HDFC0000240\nBranch: New Delhi"}
                  </pre>
                </div>
              </div>

              {/* Receipt File Upload */}
              <div className="space-y-2 border-t pt-4">
                <label className="text-xs font-bold text-gray-700 block">Upload Transfer Receipt (Image/PDF)</label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="border-gray-200 text-xs"
                  />
                </div>
                <p className="text-[10px] text-gray-400">Accepted formats: JPG, PNG, PDF. Maximum size 5MB.</p>
              </div>

              <DialogFooter className="pt-2">
                <Button 
                  onClick={() => handleUploadReceipt(activeTx.transactionId)}
                  disabled={isUploadingReceipt || !receiptFile}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-11"
                >
                  {isUploadingReceipt ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading Receipt...
                    </>
                  ) : (
                    "Submit Transfer Receipt"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. Cash instructions dialog */}
      <Dialog open={showCashDialog} onOpenChange={setShowCashDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              💵 Cash Payment Pending
            </DialogTitle>
            <DialogDescription>
              Your cash transaction has been initiated.
            </DialogDescription>
          </DialogHeader>

          {activeTx && (
            <div className="space-y-4 py-2 text-center">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl text-xs text-left leading-relaxed">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-1">Cash Collection Note:</span>
                    Please contact the administrator or visit the desk to pay exactly <span className="font-bold">{activeTx.amount} {activeTx.currency}</span> in cash. 
                    The admin will approve this transaction code: <span className="font-mono bg-white px-1 py-0.5 rounded border font-semibold">{activeTx.transactionId}</span> to verify your recharge.
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => setShowCashDialog(false)}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold h-11"
              >
                Close instructions
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 4. Payment Gateway simulation dialog (for non-razorpay gateways) */}
      <Dialog open={showGatewayDialog} onOpenChange={setShowGatewayDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              💳 Gateway Checkout Simulation
            </DialogTitle>
            <DialogDescription>
              This is a sandbox checkout simulator for PayPal, Tap, or Instamojo payment gateways.
            </DialogDescription>
          </DialogHeader>

          {activeTx && (
            <div className="space-y-6 py-4 text-center">
              <div className="bg-gray-50 border p-4 rounded-xl text-xs space-y-1">
                <p className="text-gray-400">Gateway Provider:</p>
                <p className="font-bold text-sm uppercase text-gray-800">{activeTx.paymentMethod}</p>
                <p className="text-gray-400 mt-2">Amount to Charge:</p>
                <p className="font-extrabold text-2xl text-gray-900">{activeTx.amount} {activeTx.currency}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => handleSimulateGatewayPayment(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold h-11"
                >
                  👍 Simulate Success
                </Button>
                <Button 
                  onClick={() => handleSimulateGatewayPayment(false)}
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 font-bold h-11"
                >
                  👎 Simulate Cancel/Fail
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
