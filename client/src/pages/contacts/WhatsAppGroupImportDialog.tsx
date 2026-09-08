import React, { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Users, UserPlus, RefreshCw, Search, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface WhatsAppGroupImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeChannel: any;
  onSuccess?: () => void;
}

export function WhatsAppGroupImportDialog({
  open,
  onOpenChange,
  activeChannel,
  onSuccess,
}: WhatsAppGroupImportDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedJids, setSelectedJids] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [importingJid, setImportingJid] = useState<string | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);

  // Fetch Synced WhatsApp Groups for this channel
  const {
    data: whatsappGroups = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["/api/contacts-all?isGroup=true", activeChannel?.id],
    queryFn: async () => {
      if (!activeChannel?.id) return [];
      const res = await apiRequest(
        "GET",
        `/api/contacts-all?isGroup=true&channelId=${activeChannel.id}`
      );
      if (!res.ok) return [];
      const result = await res.json();
      return Array.isArray(result) ? result : result.data || [];
    },
    enabled: open && !!activeChannel?.id,
  });

  // Sync groups directly from WhatsApp QR socket
  const handleSyncGroups = async () => {
    if (!activeChannel?.id) return;
    setSyncing(true);
    try {
      const res = await apiRequest(
        "POST",
        `/api/whatsapp/channels/${activeChannel.id}/sync-groups`
      );
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Groups Synced",
          description: data.message || "WhatsApp groups synced successfully.",
        });
        refetch();
      } else {
        toast({
          title: "Sync Failed",
          description: data.message || "Failed to sync groups from WhatsApp.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to connect to the server.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Import single group participants into CRM
  const handleImportSingle = async (jid: string) => {
    if (!activeChannel?.id) return;
    setImportingJid(jid);
    try {
      const res = await apiRequest(
        "POST",
        `/api/whatsapp/channels/${activeChannel.id}/import-group`,
        { jid }
      );
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Contacts Imported!",
          description: data.message || "WhatsApp group contacts imported into CRM.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/contacts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
        onSuccess?.();
      } else {
        toast({
          title: "Import Failed",
          description: data.message || "Could not import group contacts.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Server request failed.",
        variant: "destructive",
      });
    } finally {
      setImportingJid(null);
    }
  };

  // Import multiple selected groups into CRM
  const handleImportBulk = async () => {
    if (!activeChannel?.id || selectedJids.length === 0) return;
    setBulkImporting(true);
    try {
      const res = await apiRequest(
        "POST",
        `/api/whatsapp/channels/${activeChannel.id}/import-group`,
        { jids: selectedJids }
      );
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Contacts Imported!",
          description: data.message || "WhatsApp groups contacts imported into CRM.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/contacts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
        setSelectedJids([]);
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast({
          title: "Import Failed",
          description: data.message || "Could not import groups.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Server request failed.",
        variant: "destructive",
      });
    } finally {
      setBulkImporting(false);
    }
  };

  const filteredGroups = whatsappGroups.filter((g: any) => {
    const q = search.toLowerCase();
    return (
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.phone && g.phone.toLowerCase().includes(q))
    );
  });

  const allFilteredSelected =
    filteredGroups.length > 0 &&
    filteredGroups.every((g: any) => selectedJids.includes(g.phone));

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const current = filteredGroups.map((g: any) => g.phone);
      setSelectedJids((prev) => Array.from(new Set([...prev, ...current])));
    } else {
      const current = filteredGroups.map((g: any) => g.phone);
      setSelectedJids((prev) => prev.filter((id) => !current.includes(id)));
    }
  };

  const isQrChannel = activeChannel?.connectionMethod === "qr_code";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Import Contacts from WhatsApp Groups
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Extract participants from your WhatsApp groups into individual CRM contacts with matching list tags.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!isQrChannel ? (
          <div className="p-6 text-center space-y-3 my-auto">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-gray-900 text-sm">QR Code Channel Required</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Importing WhatsApp Group participants is available for WhatsApp Web / QR sessions. Please switch to a connected QR Code channel.
            </p>
          </div>
        ) : (
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col pt-2">
            {/* Search and Sync bar */}
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search WhatsApp groups..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncGroups}
                disabled={syncing}
                className="text-xs h-9 font-medium border-gray-200 hover:bg-gray-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? "animate-spin text-emerald-600" : ""}`} />
                {syncing ? "Syncing..." : "Sync from WhatsApp"}
              </Button>
            </div>

            {/* Selection info bar */}
            {selectedJids.length > 0 && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-xs">
                <span className="font-medium text-emerald-800">
                  {selectedJids.length} WhatsApp Group{selectedJids.length > 1 ? "s" : ""} selected
                </span>
                <Button
                  size="sm"
                  onClick={handleImportBulk}
                  disabled={bulkImporting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 text-xs font-semibold"
                >
                  {bulkImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <UserPlus className="w-3.5 h-3.5 mr-1" />}
                  {bulkImporting ? "Importing Contacts..." : "Import All Selected"}
                </Button>
              </div>
            )}

            {/* Groups Table */}
            <div className="border rounded-lg overflow-y-auto flex-1 min-h-[260px] max-h-[360px] bg-white">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-2 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="text-xs">Loading WhatsApp groups...</span>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-3 text-center p-4">
                  <Users className="w-10 h-10 text-gray-300" />
                  <div>
                    <h5 className="font-medium text-xs text-gray-700">No WhatsApp Groups Found</h5>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Click &quot;Sync from WhatsApp&quot; to fetch participating groups from your linked phone.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncGroups}
                    disabled={syncing}
                    className="text-xs h-8 border-gray-200"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
                    Sync Groups Now
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-gray-50/80 sticky top-0 z-10 text-[11px]">
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allFilteredSelected}
                          onCheckedChange={handleToggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">Group Name</TableHead>
                      <TableHead className="font-semibold text-gray-700">JID</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {filteredGroups.map((group: any) => {
                      const isSelected = selectedJids.includes(group.phone);
                      const isThisImporting = importingJid === group.phone;
                      return (
                        <TableRow key={group.id} className="hover:bg-gray-50/60">
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedJids((prev) => [...prev, group.phone]);
                                } else {
                                  setSelectedJids((prev) =>
                                    prev.filter((id) => id !== group.phone)
                                  );
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">
                            {group.name}
                          </TableCell>
                          <TableCell className="text-gray-400 font-mono text-[11px] truncate max-w-[180px]">
                            {group.phone}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isThisImporting || bulkImporting}
                              onClick={() => handleImportSingle(group.phone)}
                              className="text-emerald-700 hover:text-white hover:bg-emerald-600 border-emerald-200 h-7 px-2.5 text-xs font-medium inline-flex items-center gap-1 shadow-sm"
                            >
                              {isThisImporting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <UserPlus className="w-3 h-3" />
                              )}
                              {isThisImporting ? "Importing..." : "Import"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="mt-3 flex items-center justify-between sm:justify-between w-full">
          <span className="text-[11px] text-gray-400">
            Channel: <strong>{activeChannel?.name || "Active Channel"}</strong>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
