import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, RefreshCw, Sparkles, Phone, MessageSquare } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface SendFlowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  flow?: any | null;
  flows?: any[];
  defaultPhone?: string;
  channelId?: string;
}

export function SendFlowDialog({
  isOpen,
  onClose,
  flow: initialFlow,
  flows: flowsProp = [],
  defaultPhone = "",
  channelId,
}: SendFlowDialogProps) {
  const { toast } = useToast();
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");
  const [recipientPhone, setRecipientPhone] = useState("");

  const { data: flowsResponse, isLoading: isFlowsLoading } = useQuery({
    queryKey: ["/api/whatsapp-flows/send-dialog", channelId],
    queryFn: async () => {
      const url = channelId
        ? `/api/whatsapp-flows?channelId=${channelId}`
        : "/api/whatsapp-flows";
      const res = await fetch(url);
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: isOpen && (!flowsProp || flowsProp.length === 0),
  });

  const flows =
    flowsProp && flowsProp.length > 0
      ? flowsProp
      : Array.isArray(flowsResponse?.data) && flowsResponse.data.length > 0
      ? flowsResponse.data
      : initialFlow
      ? [initialFlow]
      : [];

  useEffect(() => {
    if (initialFlow?.id) {
      setSelectedFlowId(initialFlow.id);
    } else if (flows.length > 0 && !selectedFlowId) {
      setSelectedFlowId(flows[0].id);
    }
    if (defaultPhone) {
      setRecipientPhone(defaultPhone);
    }
  }, [initialFlow, flows, defaultPhone, isOpen]);

  const activeFlow = flows.find((f) => f.id === selectedFlowId) || initialFlow;

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFlowId || !recipientPhone.trim()) {
        throw new Error("Please select a Flow and provide a recipient phone number.");
      }

      const res = await fetch("/api/whatsapp-flows/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowId: selectedFlowId,
          recipientPhone: recipientPhone.trim(),
          channelId: channelId || activeFlow?.channelId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to send WhatsApp Flow message");
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: "WhatsApp Flow Sent! 🚀",
        description: `Interactive form successfully dispatched to ${recipientPhone}.`,
      });
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Send Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-purple-600" />
            Send WhatsApp Flow
          </DialogTitle>
          <DialogDescription>
            Dispatch an interactive WhatsApp form directly to a contact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Flow Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="flow-select" className="text-xs font-semibold">
              Select Flow
            </Label>
            {flows.length === 0 ? (
              <div className="text-xs text-gray-500 py-2 border rounded-md px-3 bg-gray-50">
                {isFlowsLoading
                  ? "Loading WhatsApp Flows..."
                  : "No WhatsApp Flows available. Please create one in Flows Hub first."}
              </div>
            ) : (
              <Select
                value={selectedFlowId || flows[0]?.id || undefined}
                onValueChange={setSelectedFlowId}
              >
                <SelectTrigger id="flow-select">
                  <SelectValue placeholder="Choose a Flow" />
                </SelectTrigger>
                <SelectContent>
                  {flows
                    .filter((f) => f && f.id)
                    .map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.name} ({f.status || "DRAFT"})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Recipient Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="recipient-phone" className="text-xs font-semibold">
              Recipient Phone Number (with Country Code)
            </Label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                id="recipient-phone"
                placeholder="e.g. +919876543210 or 919876543210"
                className="pl-9"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Preview */}
          {activeFlow && (
            <div className="p-3 bg-gray-50 border rounded-lg space-y-1.5 text-xs text-gray-600">
              <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                {activeFlow.headerText || activeFlow.name}
              </div>
              <p className="line-clamp-2">{activeFlow.bodyText || "Please complete the form below"}</p>
              <div className="inline-block bg-[#00a884] text-white px-2.5 py-1 rounded text-[11px] font-medium mt-1">
                {activeFlow.ctaButtonText || "Start Form"}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || !selectedFlowId || !recipientPhone.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {sendMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send Flow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
