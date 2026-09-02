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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Inbox,
  User,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface FlowResponsesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  flow: any | null;
}

export function FlowResponsesDialog({
  isOpen,
  onClose,
  flow,
}: FlowResponsesDialogProps) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;

  const { data: responseData, isLoading, refetch } = useQuery({
    queryKey: ["flow-responses", flow?.id, page, search],
    queryFn: async () => {
      if (!flow?.id) return null;
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/whatsapp-flows/${flow.id}/responses?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load submissions");
      return res.json();
    },
    enabled: isOpen && !!flow?.id,
  });

  const responses = responseData?.data || [];
  const pagination = responseData?.pagination || { total: 0, totalPages: 1 };

  const handleExport = () => {
    if (!flow?.id) return;
    window.open(`/api/whatsapp-flows/${flow.id}/export`, "_blank");
    toast({
      title: "Exporting to Excel",
      description: "Your download will start shortly.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Submissions: {flow?.name}
              </DialogTitle>
              <DialogDescription>
                Live form submissions captured from Meta WhatsApp Flows.
              </DialogDescription>
            </div>

            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              <Download className="w-4 h-4" /> Export to Excel
            </Button>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="flex items-center gap-2 my-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by contact name or phone number..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </Button>
        </div>

        {/* Table of Submissions */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-[180px]">Contact</TableHead>
                <TableHead className="w-[150px]">Date & Time</TableHead>
                <TableHead>Submitted Form Answers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mt-2">Loading submissions...</p>
                  </TableCell>
                </TableRow>
              ) : responses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                    <Inbox className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-medium text-sm">No submissions received yet</p>
                    <p className="text-xs text-gray-400">
                      When users complete this flow on WhatsApp, their responses will appear here.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                responses.map((resp: any) => {
                  const payload = (resp.responsePayload || {}) as Record<string, any>;
                  const entries = Object.entries(payload);

                  return (
                    <TableRow key={resp.id} className="hover:bg-gray-50/70">
                      <TableCell className="align-top font-medium">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-sm text-gray-900">
                            <User className="w-3.5 h-3.5 text-purple-600" />
                            {resp.contactName || "Anonymous Contact"}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {resp.contactPhone}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="align-top text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {resp.submittedAt
                            ? new Date(resp.submittedAt).toLocaleString()
                            : "N/A"}
                        </div>
                      </TableCell>

                      <TableCell className="align-top">
                        <div className="space-y-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs">
                          {entries.length === 0 ? (
                            <span className="text-gray-400 italic">No structured data</span>
                          ) : (
                            entries.map(([key, val]) => (
                              <div key={key} className="flex items-start gap-2">
                                <span className="font-semibold text-gray-700 min-w-[120px]">
                                  {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}:
                                </span>
                                <span className="text-gray-900 font-medium">
                                  {Array.isArray(val)
                                    ? val.join(", ")
                                    : typeof val === "object"
                                    ? JSON.stringify(val)
                                    : String(val)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
            <div>
              Showing {responses.length} of {pagination.total} submissions
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <span>
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
