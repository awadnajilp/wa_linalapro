/**
 * ============================================================
 * © 2026 LINALA — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://linala.ai
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

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import {
  Flame,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Lock,
  MessageSquare,
  Sparkles,
  Play,
  Settings,
  HelpCircle,
} from "lucide-react";

interface WarmerConfig {
  id: string;
  channelId: string;
  isActive: boolean;
  minDelay: number;
  maxDelay: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface WarmerMessage {
  id: string;
  warmerConfigId: string;
  messageText: string;
  createdAt: string;
  updatedAt: string;
}

interface WarmerResponse {
  success: boolean;
  config: WarmerConfig;
  messages: WarmerMessage[];
}

export default function WarmerSettings() {
  const { user, userPlans } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if QR Code Channels and Warmer features are enabled by package subscription
  const qrCodeChannelEnabled = useMemo(() => {
    return (
      user?.role === "superadmin" ||
      userPlans?.data?.some(
        (d: any) =>
          d.subscription?.status === "active" &&
          d.subscription?.planData?.permissions?.qrCodeChannelEnabled === "true"
      )
    );
  }, [user, userPlans]);

  // Fetch channels
  const { data: channelsData, isLoading: isChannelsLoading } = useQuery({
    queryKey: ["/api/channels"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels");
      if (!response.ok) throw new Error("Failed to fetch channels");
      return await response.json();
    },
  });

  const channels = useMemo(() => {
    if (!channelsData) return [];
    return Array.isArray(channelsData) ? channelsData : (channelsData.data ?? []);
  }, [channelsData]);

  // Filter channels to only QR code channels
  const qrChannels = useMemo(() => {
    return channels.filter((c: any) => c.connectionMethod === "qr_code" && c.isActive);
  }, [channels]);

  // Selected channel state
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // Auto-select the first QR channel if none selected
  const activeChannelId = useMemo(() => {
    if (selectedChannelId) return selectedChannelId;
    if (qrChannels.length > 0) return qrChannels[0].id;
    return null;
  }, [selectedChannelId, qrChannels]);

  // Fetch warmer configuration & messages for the selected QR channel
  const { data: warmerData, isLoading: isWarmerLoading } = useQuery<WarmerResponse>({
    queryKey: [`/api/whatsapp/warmer/${activeChannelId}`],
    queryFn: async () => {
      const response = await fetch(`/api/whatsapp/warmer/${activeChannelId}`);
      if (!response.ok) throw new Error("Failed to fetch warmer configuration");
      return await response.json();
    },
    enabled: !!activeChannelId,
  });

  // State for config values
  const [minDelay, setMinDelay] = useState<number>(10);
  const [maxDelay, setMaxDelay] = useState<number>(60);
  const [isActive, setIsActive] = useState<boolean>(false);

  // Sync config state when data is loaded
  useMemo(() => {
    if (warmerData?.config) {
      setMinDelay(warmerData.config.minDelay);
      setMaxDelay(warmerData.config.maxDelay);
      setIsActive(warmerData.config.isActive);
    }
  }, [warmerData]);

  // Add message state
  const [newMessageText, setNewMessageText] = useState("");
  // Edit message state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");

  // Mutations
  const updateConfigMutation = useMutation({
    mutationFn: async (updates: { isActive: boolean; minDelay: number; maxDelay: number }) => {
      const res = await apiRequest("POST", `/api/whatsapp/warmer/${activeChannelId}`, updates);
      if (!res.ok) throw new Error("Failed to update config");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/warmer/${activeChannelId}`] });
      toast({
        title: "Settings Saved",
        description: "WhatsApp Warmer settings have been successfully updated.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error Saving Settings",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const addMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", `/api/whatsapp/warmer/${activeChannelId}/messages`, {
        messageText: text,
      });
      if (!res.ok) throw new Error("Failed to add message");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/warmer/${activeChannelId}`] });
      setNewMessageText("");
      toast({
        title: "Message Added",
        description: "Warm-up message added successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error Adding Message",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const res = await apiRequest(
        "PUT",
        `/api/whatsapp/warmer/${activeChannelId}/messages/${id}`,
        { messageText: text }
      );
      if (!res.ok) throw new Error("Failed to update message");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/warmer/${activeChannelId}`] });
      setEditingMessageId(null);
      toast({
        title: "Message Updated",
        description: "Warm-up message updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error Updating Message",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(
        "DELETE",
        `/api/whatsapp/warmer/${activeChannelId}/messages/${id}`
      );
      if (!res.ok) throw new Error("Failed to delete message");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/warmer/${activeChannelId}`] });
      toast({
        title: "Message Deleted",
        description: "Warm-up message deleted successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error Deleting Message",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const handleSaveConfig = () => {
    if (minDelay < 5) {
      toast({
        title: "Invalid Min Delay",
        description: "Minimum delay must be at least 5 seconds.",
        variant: "destructive",
      });
      return;
    }
    if (maxDelay < minDelay) {
      toast({
        title: "Invalid Max Delay",
        description: "Maximum delay cannot be less than minimum delay.",
        variant: "destructive",
      });
      return;
    }
    updateConfigMutation.mutate({ isActive, minDelay, maxDelay });
  };

  const handleAddMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;
    addMessageMutation.mutate(newMessageText.trim());
  };

  const handleStartEdit = (msg: WarmerMessage) => {
    setEditingMessageId(msg.id);
    setEditingMessageText(msg.messageText);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingMessageText.trim()) return;
    updateMessageMutation.mutate({ id, text: editingMessageText.trim() });
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingMessageText("");
  };

  const handleDeleteMessage = (id: string) => {
    if (confirm("Are you sure you want to delete this warm-up message?")) {
      deleteMessageMutation.mutate(id);
    }
  };

  // Render Premium Feature Lock screen if plan doesn't support it
  if (!qrCodeChannelEnabled) {
    return (
      <Card className="border border-red-200 shadow-lg max-w-2xl mx-auto overflow-hidden">
        <div className="bg-red-50 p-6 flex items-start gap-4 border-b border-red-100">
          <div className="p-3 bg-red-100 rounded-full text-red-600">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-900">WhatsApp Warmer is Locked</h3>
            <p className="text-red-700 text-sm mt-1">
              The WhatsApp Warmer is a premium feature exclusive to subscription plans that support
              QR Code Login Channels.
            </p>
          </div>
        </div>
        <CardContent className="p-8 text-center">
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Upgrade your package to unlock QR-based channels and keep your WhatsApp connections warm and
            active automatically.
          </p>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
            onClick={() => {
              window.location.search = "?tab=billing";
            }}
          >
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isChannelsLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loading />
        <p className="text-gray-500 text-sm">Loading settings and active channels...</p>
      </div>
    );
  }

  // If no QR Code channels are active/found
  if (qrChannels.length === 0) {
    return (
      <Card className="border-dashed border-2 border-gray-200 p-8 text-center max-w-xl mx-auto shadow-md">
        <CardContent className="space-y-6">
          <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-full">
            <Flame className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-gray-900">No QR Code Channels Found</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              You need an active QR Code WhatsApp Connection to configure and run the WhatsApp Warmer.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.search = "?tab=whatsapp";
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Go to Channel Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Overview and Info Bar */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 p-6 rounded-2xl border border-orange-200/50 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500 fill-orange-500 animate-bounce" />
            <h2 className="text-xl font-bold text-gray-900">WhatsApp Warmer</h2>
            <Badge className="bg-orange-100 text-orange-700 border-orange-200">Beta</Badge>
          </div>
          <p className="text-gray-600 text-sm max-w-2xl leading-relaxed">
            The warmer periodically simulates activity on your QR-code-based logins by sending random, pre-made messages. This activity keeps the underlying connection warm and prevents WhatsApp from force-disconnecting or logging out inactive sessions.
          </p>
        </div>

        {/* Channel Selector */}
        <div className="w-full md:w-auto min-w-[240px] space-y-2">
          <Label className="text-gray-700 font-semibold flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-gray-400" />
            Select QR Channel
          </Label>
          <select
            value={activeChannelId || ""}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {qrChannels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phoneNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isWarmerLoading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <Loading />
          <p className="text-gray-500 text-sm">Loading config details...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Config Settings Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border border-gray-200 shadow-md">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Play className="w-5 h-5 text-indigo-600" />
                  Warmer Status
                </CardTitle>
                <CardDescription>Toggle and delay range configurations</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Active Toggle */}
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-gray-900">Run Warmer</Label>
                    <p className="text-xs text-gray-500">Enable/disable simulations</p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>

                {/* Delay Configs */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-800 flex items-center justify-between">
                      <span>Min Delay</span>
                      <span className="text-xs font-normal text-gray-500">{minDelay} seconds</span>
                    </Label>
                    <Input
                      type="number"
                      min={5}
                      value={minDelay}
                      onChange={(e) => setMinDelay(Number(e.target.value))}
                      className="border-gray-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-800 flex items-center justify-between">
                      <span>Max Delay</span>
                      <span className="text-xs font-normal text-gray-500">{maxDelay} seconds</span>
                    </Label>
                    <Input
                      type="number"
                      min={minDelay}
                      value={maxDelay}
                      onChange={(e) => setMaxDelay(Number(e.target.value))}
                      className="border-gray-200"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveConfig}
                  disabled={updateConfigMutation.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  {updateConfigMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
              <CardContent className="p-5 space-y-3">
                <h4 className="font-semibold text-indigo-900 flex items-center gap-1.5 text-sm">
                  <HelpCircle className="w-4.5 h-4.5" />
                  How it works
                </h4>
                <ul className="text-xs text-indigo-800/80 space-y-2.5 list-disc pl-4 leading-relaxed">
                  <li>
                    Messages are simulated only using **QR-code based login channels**.
                  </li>
                  <li>
                    A message is sent periodically to random numbers or mock contacts in your list using the configured random delay interval.
                  </li>
                  <li>
                    No Graph API fees are charged. Messages bypass the Meta server entirely.
                  </li>
                  <li>
                    Add custom greetings, inquiries, and casual prompts to make the account look active.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Warmer Messages Manager */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-gray-200 shadow-md">
              <CardHeader className="border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    Warm-up Messages
                  </CardTitle>
                  <CardDescription>
                    Customizable message bank to simulate conversation patterns
                  </CardDescription>
                </div>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 w-fit">
                  {warmerData?.messages.length || 0} Messages
                </Badge>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Form to Add Message */}
                <form onSubmit={handleAddMessage} className="flex gap-2">
                  <Input
                    placeholder="Enter a new casual warm-up message..."
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    disabled={addMessageMutation.isPending}
                    className="flex-1 border-gray-200 focus-visible:ring-indigo-500"
                  />
                  <Button
                    type="submit"
                    disabled={addMessageMutation.isPending || !newMessageText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                </form>

                {/* List of Messages */}
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {warmerData?.messages && warmerData.messages.length > 0 ? (
                    warmerData.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition ${
                          editingMessageId === msg.id
                            ? "border-indigo-300 bg-indigo-50/20"
                            : "border-gray-100 hover:bg-gray-50 bg-white"
                        }`}
                      >
                        {editingMessageId === msg.id ? (
                          <div className="flex-1 flex gap-2 mr-2">
                            <Input
                              value={editingMessageText}
                              onChange={(e) => setEditingMessageText(e.target.value)}
                              className="bg-white border-indigo-200 focus-visible:ring-indigo-500"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit(msg.id);
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                            />
                            <Button
                              onClick={() => handleSaveEdit(msg.id)}
                              size="icon"
                              variant="ghost"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0"
                            >
                              <Check className="w-4.5 h-4.5" />
                            </Button>
                            <Button
                              onClick={handleCancelEdit}
                              size="icon"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                            >
                              <X className="w-4.5 h-4.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-gray-800 font-medium break-all mr-4">
                              {msg.messageText}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                onClick={() => handleStartEdit(msg)}
                                size="icon"
                                variant="ghost"
                                className="text-gray-500 hover:text-indigo-600 hover:bg-gray-100"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteMessage(msg.id)}
                                size="icon"
                                variant="ghost"
                                className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 space-y-2">
                      <Sparkles className="w-8 h-8 mx-auto stroke-1" />
                      <p className="text-sm">No warm-up messages configured.</p>
                      <p className="text-xs">Add a message above to get started.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
