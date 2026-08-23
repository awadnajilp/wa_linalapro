import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Puzzle, ShieldAlert, CheckCircle, CreditCard, Sparkles, Key, Coins } from "lucide-react";
import { useChannelContext } from "@/contexts/channel-context";

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

  // Fetch all active marketplace addons
  const { data: addons, isLoading } = useQuery<Addon[]>({
    queryKey: ["/api/tenant/addons"],
  });

  // Purchase Addon Mutation
  const purchaseMutation = useMutation({
    mutationFn: async ({ addonId, channelId }: { addonId: string; channelId?: string }) => {
      const res = await apiRequest("POST", `/api/tenant/addons/${addonId}/purchase`, { channelId });
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

  const handlePurchase = (addon: Addon) => {
    setPurchasingId(addon.id);
    purchaseMutation.mutate({
      addonId: addon.id,
      channelId: activeChannel?.id // Passes current active channel to preload template
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
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
          <Puzzle className="text-indigo-600 w-8 h-8" /> Addons Marketplace
        </h1>
        <p className="text-gray-500 max-w-2xl">
          Enhance your CRM & WhatsApp channel capabilities with modular plugins. Subscribe to advanced automation tools and AI extensions.
        </p>
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
                    <CheckCircle className="w-3.5 h-3.5" /> Active
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={addon.aiKeyType === "admin" ? "default" : "outline"} className="text-xs">
                      {addon.aiKeyType === "admin" ? "Admin Key + Credits" : "Uses Your AI Key"}
                    </Badge>
                    {addon.defaultCredits > 0 && (
                      <Badge variant="secondary" className="text-xs bg-indigo-55 text-indigo-700">
                        <Coins className="w-3 h-3 mr-1" /> {addon.defaultCredits} Credits
                      </Badge>
                    )}
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
                      {addon.aiKeyType === "admin" && (
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
                      onClick={() => handlePurchase(addon)}
                      disabled={purchasingId !== null}
                    >
                      <CreditCard className="w-4 h-4" /> 
                      {purchasingId === addon.id ? "Activating..." : "Subscribe Now"}
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
    </div>
  );
}
