import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Puzzle, ShieldAlert, CheckCircle, CreditCard, Sparkles, Key, Coins, Wallet, BookOpen, Volume2 } from "lucide-react";
import { useChannelContext } from "@/contexts/channel-context";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Addon {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: string;
  billingCycle: string;
  aiKeyType: "tenant" | "admin";
  defaultCredits: number;
  isActive: boolean;
  subscription: {
    id: string;
    status: string;
    purchaseType: "flow" | "ai";
    credits: number;
    maxCredits: number;
    expiresAt: string | null;
  } | null;
}

export default function Marketplace() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeChannel } = useChannelContext();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  
  // Dialog selection states
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [targetAddon, setTargetAddon] = useState<Addon | null>(null);
  const [purchaseType, setPurchaseType] = useState<"flow" | "ai">("flow");

  // Fetch all active marketplace addons
  const { data: addons, isLoading } = useQuery<Addon[]>({
    queryKey: ["/api/tenant/addons"],
  });

  // Fetch wallet balance
  const { data: wallet } = useQuery<{ balance: string; currency: string }>({
    queryKey: ["/api/wallet"],
    queryFn: () => fetch("/api/wallet").then((res) => res.json()),
  });

  const walletBalance = wallet ? parseFloat(wallet.balance) : 0;
  const currency = wallet?.currency || "USD";

  // Purchase Addon Mutation
  const purchaseMutation = useMutation({
    mutationFn: async ({ addonId, purchaseType, channelId }: { addonId: string; purchaseType: "flow" | "ai"; channelId?: string }) => {
      const res = await apiRequest("POST", `/api/tenant/addons/${addonId}/purchase`, { purchaseType, channelId });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to purchase addon.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Plugin Activated",
        description: data.message || "The addon has been successfully activated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/addons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      setShowPurchaseDialog(false);
    },
    onError: (err: any) => {
      toast({
        title: "Purchase Failed",
        description: err.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setPurchasingId(null);
    }
  });

  const triggerPurchasePrompt = (addon: Addon) => {
    setTargetAddon(addon);
    setPurchaseType("flow"); // Default to standard flow based
    setShowPurchaseDialog(true);
  };

  const handleConfirmPurchase = () => {
    if (!targetAddon) return;
    setPurchasingId(targetAddon.id);
    purchaseMutation.mutate({
      addonId: targetAddon.id,
      purchaseType,
      channelId: activeChannel?.id
    });
  };

  const handleCancel = async (addonId: string) => {
    try {
      const res = await apiRequest("POST", `/api/tenant/addons/${addonId}/cancel`);
      if (res.ok) {
        toast({
          title: "Cancelled",
          description: "Addon subscription cancelled successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/tenant/addons"] });
        queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      } else {
        throw new Error();
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to cancel subscription.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            <Puzzle className="text-indigo-600 w-8 h-8" /> Addons Marketplace
          </h1>
          <p className="text-gray-500 max-w-2xl">
            Enhance your CRM & WhatsApp channel capabilities with modular plugins. Subscribe to advanced automation tools and AI extensions.
          </p>
        </div>

        {/* Unified Wallet Balance Widget */}
        <Card className="border border-gray-150 shadow-xs max-w-xs shrink-0 bg-gray-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Wallet className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Wallet Balance</p>
              <h3 className="text-xl font-extrabold text-gray-800">{walletBalance.toFixed(2)} {currency}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {addons && addons.length > 0 ? (
          addons.map((addon) => {
            const isSubscribed = addon.subscription?.status === "active";
            const price = parseFloat(addon.price);

            return (
              <Card key={addon.id} className="relative flex flex-col justify-between overflow-hidden border border-gray-150 shadow-xs hover:shadow-md transition-shadow">
                {isSubscribed && (
                  <div className="absolute top-0 right-0 bg-green-600 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Active ({addon.subscription?.purchaseType === "ai" ? "AI Agent" : "Flow"})
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={addon.aiKeyType === "admin" ? "default" : "outline"} className="text-xs">
                      {addon.aiKeyType === "admin" ? "Admin Key + Credits" : "Uses Your AI Key"}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-800">{addon.name}</CardTitle>
                  <CardDescription className="line-clamp-3 text-gray-500 mt-1">{addon.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-1 text-gray-900">
                    <span className="text-3xl font-extrabold">${price.toFixed(2)}</span>
                    <span className="text-sm font-medium text-gray-500">/{addon.billingCycle}</span>
                  </div>

                  {isSubscribed && addon.subscription && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2 text-xs text-gray-600">
                      <div className="flex justify-between items-center font-semibold text-indigo-700">
                        <span>Subscription Type:</span>
                        <span className="uppercase">{addon.subscription.purchaseType} MODE</span>
                      </div>
                      {addon.subscription.purchaseType === "ai" && addon.aiKeyType === "admin" && (
                        <div className="flex justify-between items-center">
                          <span>Remaining Credits:</span>
                          <span className="font-bold text-indigo-600">{addon.subscription.credits} / {addon.subscription.maxCredits}</span>
                        </div>
                      )}
                      {addon.subscription.expiresAt && (
                        <div className="flex justify-between items-center">
                          <span>Next Renewal:</span>
                          <span className="font-medium">{new Date(addon.subscription.expiresAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="border-t border-gray-50 bg-gray-50/50 p-4 flex gap-2">
                  {isSubscribed ? (
                    <>
                      <Button 
                        variant="outline" 
                        className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                        onClick={() => handleCancel(addon.id)}
                      >
                        Cancel
                      </Button>
                      {addon.slug === "expense-tracker" && (
                        <Button 
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={() => window.location.href = "/expenses"}
                        >
                          Open Module
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium flex items-center justify-center gap-1.5"
                      onClick={() => triggerPurchasePrompt(addon)}
                      disabled={purchasingId !== null}
                    >
                      <CreditCard className="w-4 h-4" /> 
                      Subscribe Now
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center p-12 border-2 border-dashed border-gray-200 rounded-lg">
            <Puzzle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-700">No Addons Available</h3>
            <p className="text-gray-400 text-sm">Addons configured by Super Admin will appear here.</p>
          </div>
        )}
      </div>

      {/* Subscription Mode Selector & Payment Dialog */}
      {targetAddon && (
        <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Configure Subscription: {targetAddon.name}</DialogTitle>
              <DialogDescription>Choose your execution mode and billing method below.</DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-5">
              {/* Option Mode Selector */}
              {targetAddon.slug === "expense-tracker" && (
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-gray-700">Select Addon Mode</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <div 
                      onClick={() => setPurchaseType("flow")}
                      className={`p-3.5 border rounded-lg cursor-pointer transition-colors flex items-start gap-3 ${
                        purchaseType === "flow" ? "border-green-600 bg-green-50/40" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <BookOpen className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">Standard Flow-based Mode</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Collects logs sequentially using the predefined Q&A canvas flow. No credit constraints.</p>
                      </div>
                    </div>

                    <div 
                      onClick={() => setPurchaseType("ai")}
                      className={`p-3.5 border rounded-lg cursor-pointer transition-colors flex items-start gap-3 ${
                        purchaseType === "ai" ? "border-indigo-600 bg-indigo-50/40" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <Volume2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">AI-based Agent Mode</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Unlocks voice message transcription and instant AI expense extraction. Requires credit recharges (Includes 100 default credits).</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Price & Wallet Balance Validation */}
              <div className="p-4 bg-gray-50 border border-gray-150 rounded-lg space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Subscription Price:</span>
                  <span className="font-extrabold text-gray-900">${parseFloat(targetAddon.price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Your Wallet Balance:</span>
                  <span className={`font-bold ${walletBalance >= parseFloat(targetAddon.price) ? "text-green-600" : "text-red-600"}`}>
                    {walletBalance.toFixed(2)} {currency}
                  </span>
                </div>
                {walletBalance < parseFloat(targetAddon.price) && (
                  <div className="text-xs text-red-600 font-medium flex items-center gap-1.5 pt-1.5 border-t border-red-100">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    Wallet balance is insufficient to complete the transaction.
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>Cancel</Button>
              {walletBalance >= parseFloat(targetAddon.price) ? (
                <Button 
                  onClick={handleConfirmPurchase} 
                  className="bg-green-600 hover:bg-green-700 text-white font-medium"
                  disabled={purchasingId !== null}
                >
                  {purchasingId ? "Activating..." : "Confirm & Pay via Wallet"}
                </Button>
              ) : (
                <Button 
                  onClick={() => window.location.href = `/wallet?recharge_required=${parseFloat(targetAddon.price) - walletBalance}`} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  Recharge Wallet
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
