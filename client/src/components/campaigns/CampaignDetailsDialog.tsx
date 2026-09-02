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

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, ChartTooltip, ChartLegend);
import { format } from "date-fns";
import { Link } from "wouter";
import { MessageSquare, Users, CheckCircle, AlertCircle, BarChart3, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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
  isCadence?: boolean;
  cadenceSteps?: any[];
}

interface CampaignDetailsDialogProps {
  campaign: Campaign | null;
  onClose: () => void;
}

export function CampaignDetailsDialog({ campaign: initialCampaign, onClose }: CampaignDetailsDialogProps) {
  const isOpen = !!initialCampaign;

  const { data: liveCampaign, isLoading } = useQuery({
    queryKey: ["campaign-details", initialCampaign?.id],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${initialCampaign!.id}`);
      if (!res.ok) throw new Error("Failed to fetch campaign");
      const data = await res.json();
      return data.campaign || data;
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 5000 : false,
  });

  const campaign = liveCampaign || initialCampaign;

  if (!campaign) return null;

  const deliveryRate = campaign.recipientCount && campaign.recipientCount > 0
    ? Math.min(Math.round((campaign.deliveredCount || 0) / campaign.recipientCount * 100), 100)
    : 0;

  const readRate = campaign.deliveredCount && campaign.deliveredCount > 0
    ? Math.min(Math.round((campaign.readCount || 0) / campaign.deliveredCount * 100), 100)
    : 0;

  const statusData = [
    { name: 'Delivered', value: campaign.deliveredCount || 0, color: '#10b981' },
    { name: 'Read', value: campaign.readCount || 0, color: '#3b82f6' },
    { name: 'Failed', value: campaign.failedCount || 0, color: '#ef4444' },
    { name: 'Non-Deliverable', value: campaign.nonDeliverableCount || 0, color: '#eab308' },
    { name: 'Pending', value: Math.max(0, (campaign.sentCount || 0) - (campaign.deliveredCount || 0) - (campaign.failedCount || 0) - (campaign.nonDeliverableCount || 0)), color: '#6b7280' },
  ].filter(item => item.value > 0);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{campaign.name}</span>
            <div className="flex items-center gap-2">
              {isLoading && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
              <Badge variant={campaign.status === 'active' ? 'destructive' : 'default'}>
                {campaign.status}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
            <TabsTrigger value="report">Full Report</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Recipients</p>
                      <p className="text-xl font-bold">{campaign.recipientCount || 0}</p>
                    </div>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Failed</p>
                      <p className="text-xl font-bold text-destructive">{campaign.failedCount || 0}</p>
                    </div>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Non-Deliverable</p>
                      <p className="text-xl font-bold text-amber-600">{campaign.nonDeliverableCount || 0}</p>
                    </div>
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Sent</p>
                      <p className="text-xl font-bold">{campaign.sentCount || 0}</p>
                    </div>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Delivered</p>
                      <p className="text-xl font-bold text-green-600">{campaign.deliveredCount || 0}</p>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Read</p>
                      <p className="text-xl font-bold text-blue-600">{campaign.readCount || 0}</p>
                    </div>
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Delivery Rate</span>
                    <span className="text-sm font-bold text-green-600">{deliveryRate}%</span>
                  </div>
                  <Progress value={deliveryRate} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Read Rate</span>
                    <span className="text-sm font-bold text-blue-600">{readRate}%</span>
                  </div>
                  <Progress value={readRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Template</span>
                  <span className="text-sm font-medium">{campaign.templateName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm font-medium">
                    {format(new Date(campaign.createdAt), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                {campaign.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <span className="text-sm font-medium">
                      {format(new Date(campaign.completedAt), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {campaign.isCadence && campaign.cadenceSteps && campaign.cadenceSteps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-purple-700">Cadence Steps ({campaign.cadenceSteps.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {campaign.cadenceSteps.map((step: any, idx: number) => (
                    <div key={idx} className="p-3 border rounded-lg bg-gray-50 text-xs space-y-1.5">
                      <div className="flex justify-between font-bold text-purple-700">
                        <span>Step {step.stepNumber || (idx + 1)}</span>
                        <span className="text-gray-500 font-normal">
                          Delay: {step.delayDays || 0}d {step.delayHours || 0}h {step.delayMinutes || 0}m
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Type:</span> <span className="capitalize">{step.messageType}</span>
                      </div>
                      {step.messageType === "template" ? (
                        <div>
                          <span className="font-semibold text-gray-700">Template:</span> <span>{step.templateName} ({step.templateLanguage})</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-gray-700">Message:</span> <p className="text-gray-600 mt-0.5 whitespace-pre-wrap">{step.customMessage}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Message Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <Doughnut
                    data={{
                      labels: statusData.map((d) => d.name),
                      datasets: [
                        {
                          data: statusData.map((d) => d.value),
                          backgroundColor: statusData.map((d) => d.color),
                          borderWidth: 2,
                          borderColor: "#fff",
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "bottom",
                          labels: { font: { size: 12 }, padding: 12 },
                        },
                        tooltip: {
                          backgroundColor: "rgba(0,0,0,0.8)",
                          padding: 10,
                          cornerRadius: 6,
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Full Campaign Report</CardTitle>
                <CardDescription>
                  View comprehensive analytics and download detailed reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href={`/analytics/campaign/${campaign.id}`}>
                  <Button className="w-full">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Full Analytics Report
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground text-center">
                  Access detailed analytics, timeline, recipient details, and more
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}