/**
 * ============================================================
 * © 2026 LINALA — WhatsApp CRM & Marketing Platform
 * ============================================================
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Search, 
  Clock, 
  Pause, 
  Play, 
  Trash2, 
  FileText, 
  RefreshCw,
  Phone,
  User,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RecurringCampaignsTabProps {
  activeChannel: any;
  user: any;
}

export function RecurringCampaignsTab({ activeChannel, user }: RecurringCampaignsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  // Fetch campaigns for this channel
  const { data: campaigns = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/channels", activeChannel?.id, "contact-campaigns"],
    queryFn: async () => {
      if (!activeChannel?.id) return [];
      const res = await fetch(`/api/channels/${activeChannel.id}/contact-campaigns`);
      if (!res.ok) throw new Error("Failed to fetch recurring campaigns");
      return res.json();
    },
    enabled: !!activeChannel?.id,
  });

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/contacts/campaigns/${id}`, { status });
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "The campaign status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/contacts"] });
      refetch();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/contacts/campaigns/${id}`);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Campaign deleted",
        description: "The recurring campaign was deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/contacts"] });
      refetch();
    },
  });

  // Date and status filters
  const filteredCampaigns = campaigns.filter((cc: any) => {
    // 1. Search Query Filter
    const matchesSearch = 
      !search ||
      cc.name?.toLowerCase().includes(search.toLowerCase()) ||
      cc.contactName?.toLowerCase().includes(search.toLowerCase()) ||
      cc.contactPhone?.includes(search);

    if (!matchesSearch) return false;

    // 2. Date Ranges Filters
    if (dateFilter === "all") return true;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    // Week limits
    const nextSevenDays = new Date(todayEnd);
    nextSevenDays.setDate(nextSevenDays.getDate() + 7);

    const pastSevenDays = new Date(todayStart);
    pastSevenDays.setDate(pastSevenDays.getDate() - 7);

    // Month limits
    const nextThirtyDays = new Date(todayEnd);
    nextThirtyDays.setDate(nextThirtyDays.getDate() + 30);

    const nextSend = cc.nextSendAt ? new Date(cc.nextSendAt) : null;
    const lastSent = cc.lastSentAt ? new Date(cc.lastSentAt) : null;

    switch (dateFilter) {
      case "today":
        return nextSend && nextSend >= todayStart && nextSend <= todayEnd && cc.status === "active";
      case "tomorrow":
        return nextSend && nextSend >= tomorrowStart && nextSend <= tomorrowEnd && cc.status === "active";
      case "upcoming_week":
        return nextSend && nextSend >= todayStart && nextSend <= nextSevenDays && cc.status === "active";
      case "upcoming_month":
        return nextSend && nextSend >= todayStart && nextSend <= nextThirtyDays && cc.status === "active";
      case "completed_yesterday":
        return lastSent && lastSent >= yesterdayStart && lastSent <= yesterdayEnd;
      case "completed_week":
        return lastSent && lastSent >= pastSevenDays && lastSent <= todayEnd;
      default:
        return true;
    }
  });

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-gray-150 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search campaign, contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 border-gray-200 focus:border-blue-500 bg-gray-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Filter Run:</span>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-56 h-10 bg-white border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Schedules</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="upcoming_week">Upcoming This Week (7d)</SelectItem>
              <SelectItem value="upcoming_month">Upcoming This Month (30d)</SelectItem>
              <SelectItem value="completed_yesterday">Completed Yesterday</SelectItem>
              <SelectItem value="completed_week">Completed This Week (7d)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="h-10 w-10 shrink-0 border-gray-200"
            title="Refresh list"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </Button>
        </div>
      </div>

      {/* Campaigns Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-150 rounded-xl space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading recurring schedules...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-150 rounded-xl space-y-4">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
          <div className="space-y-1">
            <p className="text-base font-semibold text-gray-700">No matching schedules found</p>
            <p className="text-sm text-gray-400">
              {search || dateFilter !== "all" 
                ? "Try adjusting your search query or schedule filter." 
                : "Configure recurring campaigns inside your Contact actions dropdown."}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-150 rounded-xl overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-gray-50/70">
                <TableRow>
                  <TableHead className="w-[200px]">Contact</TableHead>
                  <TableHead className="w-[180px]">Campaign Name</TableHead>
                  <TableHead className="w-[220px]">Message Setup</TableHead>
                  <TableHead className="w-[120px]">Frequency</TableHead>
                  <TableHead className="w-[150px]">Last Run</TableHead>
                  <TableHead className="w-[150px]">Next Schedule</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((cc: any) => (
                  <TableRow key={cc.id} className="hover:bg-gray-50/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs uppercase">
                          {cc.contactName?.slice(0, 2) || "CO"}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-gray-900">{cc.contactName}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {cc.contactPhone}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-sm text-gray-800">{cc.name}</span>
                    </TableCell>
                    <TableCell>
                      {cc.templateName ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-blue-700 font-semibold bg-blue-50/50 border border-blue-100 px-2.5 py-1 rounded-md max-w-[200px] truncate">
                            <FileText className="w-3.5 h-3.5" />
                            {cc.templateName}
                          </div>
                          {cc.variableMapping && typeof cc.variableMapping === "object" && Object.keys(cc.variableMapping).length > 0 && (
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {Object.entries(cc.variableMapping).map(([key, val]: [string, any]) => {
                                if (key === "uploadedMediaId" || key === "headerType") return null;
                                let displayVal = "";
                                if (val.type === "fullName") displayVal = "Full Name";
                                else if (val.type === "firstName") displayVal = "First Name";
                                else if (val.type === "phone") displayVal = "Phone";
                                else if (val.type === "custom") displayVal = `"${val.value}"`;
                                else displayVal = val.type;
                                return (
                                  <Badge key={key} variant="outline" className="text-[9px] px-1 bg-white text-gray-500 border-gray-150 py-0 leading-none">
                                    {"{{" + key + "}}"}: {displayVal}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600 italic bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-md max-w-[200px] truncate" title={cc.customMessage}>
                          "{cc.customMessage}"
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs px-2 py-0.5 bg-gray-50 text-gray-700 border-gray-200">
                        {cc.frequency}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">
                      {cc.lastSentAt ? (
                        <span className="flex items-center gap-1 text-green-700 font-medium">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          {new Date(cc.lastSentAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      ) : (
                        <span className="text-gray-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-gray-300" />
                          Never
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-gray-800">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {new Date(cc.nextSendAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] uppercase font-bold py-0.5 px-2 ${
                          cc.status === "active" 
                            ? "bg-green-50 text-green-700 border border-green-200" 
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {cc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            toggleMutation.mutate({
                              id: cc.id,
                              status: cc.status === "active" ? "paused" : "active",
                            })
                          }
                          title={cc.status === "active" ? "Pause Schedule" : "Resume Schedule"}
                        >
                          {cc.status === "active" ? <Pause className="w-4 h-4 text-amber-600" /> : <Play className="w-4 h-4 text-green-600" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this scheduled campaign?")) {
                              deleteMutation.mutate(cc.id);
                            }
                          }}
                          title="Delete Schedule"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-gray-150">
            {filteredCampaigns.map((cc: any) => (
              <div key={cc.id} className="p-4 space-y-3 bg-white hover:bg-gray-50/50">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs uppercase">
                      {cc.contactName?.slice(0, 2) || "CO"}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{cc.contactName}</div>
                      <div className="text-xs text-gray-500">{cc.contactPhone}</div>
                    </div>
                  </div>

                  <Badge
                    variant="secondary"
                    className={`text-[9px] uppercase font-bold py-0.5 px-2 ${
                      cc.status === "active" 
                        ? "bg-green-50 text-green-700 border border-green-200" 
                        : "bg-gray-100 text-gray-600 border border-gray-200"
                    }`}
                  >
                    {cc.status}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600 pl-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Campaign Name:</span>
                    <span className="font-semibold text-gray-800">{cc.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Frequency:</span>
                    <span className="capitalize font-medium text-gray-700">{cc.frequency}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Message Type:</span>
                      {cc.templateName ? (
                        <span className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                          <FileText className="w-3 h-3" /> {cc.templateName}
                        </span>
                      ) : (
                        <span className="italic truncate max-w-[150px]">"{cc.customMessage}"</span>
                      )}
                    </div>
                    {cc.templateName && cc.variableMapping && typeof cc.variableMapping === "object" && Object.keys(cc.variableMapping).length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-end pt-1">
                        {Object.entries(cc.variableMapping).map(([key, val]: [string, any]) => {
                          if (key === "uploadedMediaId" || key === "headerType") return null;
                          let displayVal = "";
                          if (val.type === "fullName") displayVal = "Full Name";
                          else if (val.type === "firstName") displayVal = "First Name";
                          else if (val.type === "phone") displayVal = "Phone";
                          else if (val.type === "custom") displayVal = `"${val.value}"`;
                          else displayVal = val.type;
                          return (
                            <Badge key={key} variant="outline" className="text-[8px] px-1 bg-white text-gray-500 border-gray-150 py-0 leading-none">
                              {"{{" + key + "}}"}: {displayVal}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Sent Run:</span>
                    <span>
                      {cc.lastSentAt 
                        ? new Date(cc.lastSentAt).toLocaleDateString()
                        : "Never"}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-400">Next Scheduled:</span>
                    <span className="text-gray-800">
                      {new Date(cc.nextSendAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs flex-1"
                    onClick={() =>
                      toggleMutation.mutate({
                        id: cc.id,
                        status: cc.status === "active" ? "paused" : "active",
                      })
                    }
                  >
                    {cc.status === "active" ? (
                      <>
                        <Pause className="w-3.5 h-3.5 mr-1 text-amber-600" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 mr-1 text-green-600" /> Resume
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-red-600 border-red-100 hover:bg-red-50 flex-1"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this scheduled campaign?")) {
                        deleteMutation.mutate(cc.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
