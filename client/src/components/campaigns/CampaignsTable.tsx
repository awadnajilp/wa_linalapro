/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
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

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Play,
  Pause,
  Trash2,
  Calendar,
  Users,
  Send,
  CheckCircle,
  MessageSquare,
  XCircle,
  Repeat,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";
import { isDemoUser, maskName } from "@/utils/maskUtils";

interface Campaign {
  id: string;
  name: string;
  status: string;
  templateName?: string;
  recipientCount?: number;
  sentCount?: number;
  deliveredCount?: number;
  readCount?: number;
  repliedCount?: number;
  failedCount?: number;
  nonDeliverableCount?: number;
  createdAt: string;
  completedAt?: string;
  scheduledAt?: string;
  createdBy: string;
  isRecurring?: boolean;
  recurringInterval?: number;
  currentIteration?: number;
  recurringIterations?: number;
  createdByName?: string;
  isCadence?: boolean;
  cadenceSteps?: any[];
}

interface CampaignsTableProps {
  campaigns: Campaign[];
  onViewCampaign: (campaign: Campaign) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onDeleteCampaign: (id: string) => void;
}

export function CampaignsTable({
  campaigns,
  onViewCampaign,
  onUpdateStatus,
  onDeleteCampaign,
}: CampaignsTableProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const safeFormat = (dateString?: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    return format(d, "MMM d, h:mm a");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      completed: { variant: "default", label: "Completed" },
      scheduled: { variant: "secondary", label: "Scheduled" },
      active: { variant: "secondary", label: "Active" },
      paused: { variant: "outline", label: "Paused" },
      failed: { variant: "destructive", label: "Failed" },
    };

    const config = statusConfig[status] || {
      variant: "outline",
      label: status,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateDeliveryRate = (sent?: number, delivered?: number) => {
    if (!sent || sent === 0) return 0;
    return Math.round(((delivered || 0) / sent) * 100);
  };

  const calculateReadRate = (delivered?: number, read?: number) => {
    if (!delivered || delivered === 0) return 0;
    return Math.round(((read || 0) / delivered) * 100);
  };

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No campaigns found. Create your first campaign to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("campaigns.title")}</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>{t("campaigns.status")}</TableHead>
              <TableHead>{t("campaigns.template")}</TableHead>
              <TableHead>{t("campaigns.recipients")}</TableHead>
              <TableHead>Failed</TableHead>
              <TableHead>Non-Deliverable</TableHead>
              <TableHead>{t("campaigns.sent")}</TableHead>
              <TableHead>{t("campaigns.delivered")}</TableHead>
              <TableHead>{t("campaigns.read")}</TableHead>
              <TableHead>{t("campaigns.deliveryRate")}</TableHead>
              <TableHead>{t("campaigns.created")}</TableHead>
              <TableHead className="text-right">
                {t("campaigns.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => {
              const sent = Number(campaign.sentCount) || 0;
              const delivered = Number(campaign.deliveredCount) || 0;

              let deliveryRate =
                sent > 0
                  ? Math.round((delivered / sent) * 100)
                  : 0;

              deliveryRate = Math.max(0, Math.min(deliveryRate, 100));

              const readRate = calculateReadRate(
                campaign.deliveredCount,
                campaign.readCount
              );

              return (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold">{campaign.name}</span>
                      {campaign.isRecurring && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded w-max">
                          <Repeat className="h-2.5 w-2.5" />
                          <span>
                            Recurring: Every {campaign.recurringInterval}h (Run {campaign.currentIteration}/{campaign.recurringIterations})
                          </span>
                        </div>
                      )}
                      {campaign.isCadence && (
                        <div className="flex items-center gap-1 text-[10px] text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded w-max">
                          <Clock className="h-2.5 w-2.5" />
                          <span>
                            Cadence: {campaign.cadenceSteps?.length || 0} Steps
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{isDemoUser(user?.username) ? maskName(campaign.createdByName) : campaign.createdByName}</TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell>{campaign.templateName || "-"}</TableCell>
                  <TableCell>{campaign.recipientCount || 0}</TableCell>
                  <TableCell>
                    <span className={campaign.failedCount ? "text-red-600 font-semibold" : "text-gray-500"}>
                      {campaign.failedCount || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={campaign.nonDeliverableCount ? "text-amber-600 font-semibold" : "text-gray-500"}>
                      {campaign.nonDeliverableCount || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span>{campaign.sentCount || 0}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{campaign.deliveredCount || 0}</span>
                      {deliveryRate > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({deliveryRate}%)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{campaign.readCount || 0}</span>
                      {readRate > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({readRate}%)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 justify-center">
                      {/* <Progress value={deliveryRate} className="w-20" /> */}
                      <span className="text-sm font-medium">
                        {deliveryRate}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{safeFormat(campaign.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onViewCampaign(campaign)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {t("campaigns.viewDetails")}
                        </DropdownMenuItem>
                        {campaign.status === "sending" && (
                          <DropdownMenuItem
                            onClick={() =>
                              onUpdateStatus(campaign.id, "paused")
                            }
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            {t("campaigns.pause")}
                          </DropdownMenuItem>
                        )}
                        {campaign.status === "paused" && (
                          <DropdownMenuItem
                            onClick={() =>
                              onUpdateStatus(campaign.id, "sending")
                            }
                          >
                            <Play className="mr-2 h-4 w-4" />
                            {t("campaigns.resume")}
                          </DropdownMenuItem>
                        )}
                        {(campaign.status === "failed" || campaign.status === "completed") && (
                          <DropdownMenuItem
                            onClick={() =>
                              onUpdateStatus(campaign.id, "sending")
                            }
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Restart
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onDeleteCampaign(campaign.id)}
                          className="text-destructive"
                          disabled={isDemoUser(user?.username)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("campaigns.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden space-y-4">
        {campaigns.map((campaign) => {
          const sent = Number(campaign.sentCount) || 0;
          const delivered = Number(campaign.deliveredCount) || 0;

          let deliveryRate =
            sent > 0
              ? Math.round((delivered / sent) * 100)
              : 0;

          deliveryRate = Math.max(0, Math.min(deliveryRate, 100));

          const readRate = calculateReadRate(
            campaign.deliveredCount,
            campaign.readCount
          );

          return (
            <Card key={campaign.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold mb-2">
                      <div className="flex flex-col gap-1.5">
                        <span>{campaign.name}</span>
                        {campaign.isRecurring && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded w-max font-normal">
                            <Repeat className="h-2.5 w-2.5" />
                            <span>
                              Recurring: Every {campaign.recurringInterval}h (Run {campaign.currentIteration}/{campaign.recurringIterations})
                            </span>
                          </div>
                        )}
                      </div>
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {safeFormat(campaign.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(campaign.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onViewCampaign(campaign)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {campaign.status === "sending" && (
                          <DropdownMenuItem
                            onClick={() =>
                              onUpdateStatus(campaign.id, "paused")
                            }
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </DropdownMenuItem>
                        )}
                        {campaign.status === "paused" && (
                          <DropdownMenuItem
                            onClick={() =>
                              onUpdateStatus(campaign.id, "sending")
                            }
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Resume
                          </DropdownMenuItem>
                        )}
                        {(campaign.status === "failed" || campaign.status === "completed") && (
                          <DropdownMenuItem
                            onClick={() =>
                              onUpdateStatus(campaign.id, "sending")
                            }
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Restart
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onDeleteCampaign(campaign.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campaign Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Created By
                      </div>
                      <div className="font-medium">
                        {isDemoUser(user?.username) ? maskName(campaign.createdByName) : campaign.createdByName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Template
                      </div>
                      <div className="font-medium">
                        {campaign.templateName || "-"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      Recipients
                    </div>
                    <div className="text-base font-semibold">
                      {campaign.recipientCount || 0}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <XCircle className="h-3 w-3" />
                      Failed
                    </div>
                    <div className="text-base font-semibold text-red-600">
                      {campaign.failedCount || 0}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle className="h-3 w-3" />
                      Non-Deliv.
                    </div>
                    <div className="text-base font-semibold text-amber-600">
                      {campaign.nonDeliverableCount || 0}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Send className="h-3 w-3" />
                      Sent
                    </div>
                    <div className="text-base font-semibold">
                      {campaign.sentCount || 0}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3" />
                      Delivered
                    </div>
                    <div className="text-base font-semibold">
                      {campaign.deliveredCount || 0}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      Read
                    </div>
                    <div className="text-base font-semibold">
                      {campaign.readCount || 0}
                    </div>
                  </div>
                </div>

                {/* Delivery Rate Progress */}
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Rate</span>
                    <span className="font-semibold">{deliveryRate}%</span>
                  </div>
                  <Progress value={deliveryRate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
