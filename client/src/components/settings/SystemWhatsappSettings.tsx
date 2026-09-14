/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * System WhatsApp Notification & Renewal Reminder Settings
 * ============================================================
 */

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  QrCode,
  Globe,
  Send,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Key,
  Smartphone,
  Eye,
  EyeOff,
  Link,
  Sparkles,
  Loader2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SystemWhatsappChannel {
  id: string;
  name: string;
  phoneNumber?: string | null;
  phoneNumberId: string;
  connectionMethod?: string | null;
  isActive: boolean;
  healthStatus?: string | null;
}

interface SystemWhatsappConfigResponse {
  config: {
    systemWhatsappType: "cloud_api" | "qr_code";
    systemWhatsappChannelId?: string | null;
    systemWhatsappPhoneNumberId?: string | null;
    systemWhatsappAccessToken?: string | null;
    systemWhatsappWabaId?: string | null;
    systemWhatsappEnabled: boolean;
    systemWhatsappRenewalReminderEnabled: boolean;
    systemWhatsappRenewalTemplate: string;
    systemWhatsappOtpTemplate: string;
    systemWhatsappRenewalUrl?: string | null;
  };
  channels: SystemWhatsappChannel[];
  activeStatus: {
    hasResolvedChannel: boolean;
    channelName: string;
    channelType: string;
  };
}

export default function SystemWhatsappSettings() {
  const { toast } = useToast();

  const [form, setForm] = useState({
    systemWhatsappType: "cloud_api" as "cloud_api" | "qr_code",
    systemWhatsappChannelId: "",
    systemWhatsappPhoneNumberId: "",
    systemWhatsappAccessToken: "",
    systemWhatsappWabaId: "",
    systemWhatsappEnabled: true,
    systemWhatsappRenewalReminderEnabled: true,
    systemWhatsappRenewalTemplate: "",
    systemWhatsappOtpTemplate: "",
    systemWhatsappRenewalUrl: "",
  });

  const [showSecret, setShowSecret] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");

  const { data, isLoading } = useQuery<SystemWhatsappConfigResponse>({
    queryKey: ["/api/system-whatsapp/config"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/system-whatsapp/config");
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.config) {
      setForm({
        systemWhatsappType: data.config.systemWhatsappType || "cloud_api",
        systemWhatsappChannelId: data.config.systemWhatsappChannelId || "",
        systemWhatsappPhoneNumberId: data.config.systemWhatsappPhoneNumberId || "",
        systemWhatsappAccessToken: data.config.systemWhatsappAccessToken || "",
        systemWhatsappWabaId: data.config.systemWhatsappWabaId || "",
        systemWhatsappEnabled: data.config.systemWhatsappEnabled !== false,
        systemWhatsappRenewalReminderEnabled: data.config.systemWhatsappRenewalReminderEnabled !== false,
        systemWhatsappRenewalTemplate: data.config.systemWhatsappRenewalTemplate || "",
        systemWhatsappOtpTemplate: data.config.systemWhatsappOtpTemplate || "",
        systemWhatsappRenewalUrl: data.config.systemWhatsappRenewalUrl || "",
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/system-whatsapp/config", form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-whatsapp/config"] });
      toast({
        title: "Settings Saved",
        description: "System WhatsApp notification settings have been updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message || "Failed to update system WhatsApp settings",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/system-whatsapp/test", {
        phoneNumber: testPhone,
        message: testMessage || undefined,
      });
      return res.json();
    },
    onSuccess: (res: any) => {
      toast({
        title: "Test Sent Successfully",
        description: res.message || "WhatsApp notification delivered successfully!",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Test Failed",
        description: err.message || "Failed to deliver test message. Check channel status.",
        variant: "destructive",
      });
    },
  });

  const insertTag = (field: "renewal" | "otp", tag: string) => {
    if (field === "renewal") {
      setForm((prev) => ({
        ...prev,
        systemWhatsappRenewalTemplate: prev.systemWhatsappRenewalTemplate + " " + tag,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        systemWhatsappOtpTemplate: prev.systemWhatsappOtpTemplate + " " + tag,
      }));
    }
  };

  const previewRenewal = () => {
    const template = form.systemWhatsappRenewalTemplate || "Hello {{name}}, your subscription is expiring!";
    const renewalUrl = form.systemWhatsappRenewalUrl || `${window.location.origin}/billing`;
    return template
      .replace(/\{\{\s*name\s*\}\}/gi, "Alex Johnson")
      .replace(/\{\{\s*plan_name\s*\}\}/gi, "Enterprise Pro")
      .replace(/\{\{\s*days_left\s*\}\}/gi, "3")
      .replace(/\{\{\s*expiry_date\s*\}\}/gi, new Date(Date.now() + 3 * 86400000).toLocaleDateString())
      .replace(/\{\{\s*renewal_link\s*\}\}/gi, renewalUrl);
  };

  const previewOtp = () => {
    const template = form.systemWhatsappOtpTemplate || "Your verification code is: {{otp}}";
    return template.replace(/\{\{\s*otp\s*\}\}/gi, "849201");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm text-slate-500">Loading WhatsApp System Notification settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Status Card */}
      <Card className="border border-slate-200/90 shadow-sm bg-gradient-to-r from-purple-50/50 via-white to-indigo-50/30">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900">
                    System WhatsApp Notifications & Reminders
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Configure the administrative channel used to dispatch tenant renewal reminders and signup OTPs.
                  </CardDescription>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {data?.activeStatus?.hasResolvedChannel ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1.5 py-1 px-3">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Active: {data.activeStatus.channelName} ({data.activeStatus.channelType === "qr_code" ? "QR Channel" : "Cloud API"})
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 gap-1.5 py-1 px-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  No System Channel Connected
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Channel Configuration */}
      <Card className="border border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-600" />
                System WhatsApp Channel Settings
              </CardTitle>
              <CardDescription className="text-xs">
                Choose between using an existing registered channel (QR or Cloud API) or dedicated Meta Cloud API credentials.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="sys-wa-enabled" className="text-xs font-semibold cursor-pointer">
                {form.systemWhatsappEnabled ? "Enabled" : "Disabled"}
              </Label>
              <Switch
                id="sys-wa-enabled"
                checked={form.systemWhatsappEnabled}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, systemWhatsappEnabled: checked }))}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Channel Type Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700">Connection Mode</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setForm((prev) => ({ ...prev, systemWhatsappType: "cloud_api" }))}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  form.systemWhatsappType === "cloud_api"
                    ? "border-purple-600 bg-purple-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${form.systemWhatsappType === "cloud_api" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Meta Cloud API Channel</div>
                    <div className="text-xs text-slate-500">Official Meta Graph API or registered Cloud Channel</div>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setForm((prev) => ({ ...prev, systemWhatsappType: "qr_code" }))}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  form.systemWhatsappType === "qr_code"
                    ? "border-purple-600 bg-purple-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${form.systemWhatsappType === "qr_code" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Baileys QR Code Channel</div>
                    <div className="text-xs text-slate-500">Device linked session (No 24-hr messaging window limit)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Channel Picker Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Select System Channel</Label>
            <select
              value={form.systemWhatsappChannelId || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, systemWhatsappChannelId: e.target.value }))}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            >
              <option value="">-- Auto-Detect Active Channel (Default) --</option>
              {data?.channels?.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name} ({ch.phoneNumber || "No Phone"} • {ch.connectionMethod === "qr_code" ? "QR Code" : "Cloud API"})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              Select an active channel registered in the platform, or enter direct Meta Cloud API keys below.
            </p>
          </div>

          {/* Direct Cloud API Key fields if Cloud API is chosen and no channel selected */}
          {form.systemWhatsappType === "cloud_api" && (
            <div className="pt-3 border-t border-slate-100 space-y-4">
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Direct Meta Cloud API Credentials (Optional Fallback)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Phone Number ID</Label>
                  <Input
                    placeholder="e.g. 1048291048291"
                    value={form.systemWhatsappPhoneNumberId || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, systemWhatsappPhoneNumberId: e.target.value }))}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">WABA ID (WhatsApp Business Account ID)</Label>
                  <Input
                    placeholder="e.g. 984719284719"
                    value={form.systemWhatsappWabaId || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, systemWhatsappWabaId: e.target.value }))}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">System Access Token</Label>
                <div className="relative">
                  <Input
                    type={showSecret ? "text" : "password"}
                    placeholder="EAAB..."
                    value={form.systemWhatsappAccessToken || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, systemWhatsappAccessToken: e.target.value }))}
                    className="h-10 pr-10 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tenant Renewal Reminders Configuration */}
      <Card className="border border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Tenant Renewal Reminders on WhatsApp
              </CardTitle>
              <CardDescription className="text-xs">
                Automatically notify tenants on WhatsApp when their subscription is approaching expiry or recently expired.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="renewal-wa-enabled" className="text-xs font-semibold cursor-pointer">
                {form.systemWhatsappRenewalReminderEnabled ? "Enabled" : "Disabled"}
              </Label>
              <Switch
                id="renewal-wa-enabled"
                checked={form.systemWhatsappRenewalReminderEnabled}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, systemWhatsappRenewalReminderEnabled: checked }))
                }
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Self-Renewal Base URL (Optional)</Label>
            <div className="relative">
              <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={`Default: ${window.location.origin}/billing`}
                value={form.systemWhatsappRenewalUrl || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, systemWhatsappRenewalUrl: e.target.value }))}
                className="pl-10 h-10 text-sm"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              The link appended to the message so tenants can directly renew their subscription online.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700">Renewal Reminder Message Template</Label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500">Insert tag:</span>
                {["{{name}}", "{{plan_name}}", "{{days_left}}", "{{expiry_date}}", "{{renewal_link}}"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertTag("renewal", tag)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-mono transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              rows={4}
              value={form.systemWhatsappRenewalTemplate}
              onChange={(e) => setForm((prev) => ({ ...prev, systemWhatsappRenewalTemplate: e.target.value }))}
              placeholder="Hello {{name}}, your {{plan_name}} subscription is expiring in {{days_left}} days..."
              className="text-sm font-sans"
            />
          </div>

          {/* Live Preview Box */}
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
              <Sparkles className="w-3.5 h-3.5" />
              Live WhatsApp Renewal Reminder Preview:
            </div>
            <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {previewRenewal()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Signup OTP Template */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-600" />
            Signup WhatsApp OTP Message Template
          </CardTitle>
          <CardDescription className="text-xs">
            Message dispatched when new users request a verification code via WhatsApp during registration.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700">OTP Message Template</Label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Insert tag:</span>
                <button
                  type="button"
                  onClick={() => insertTag("otp", "{{otp}}")}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-mono transition-colors"
                >
                  {"{{otp}}"}
                </button>
              </div>
            </div>

            <Textarea
              rows={2}
              value={form.systemWhatsappOtpTemplate}
              onChange={(e) => setForm((prev) => ({ ...prev, systemWhatsappOtpTemplate: e.target.value }))}
              placeholder="Your verification code is: {{otp}}. Do not share this code with anyone."
              className="text-sm font-sans"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 text-xs">
            <span className="font-semibold text-emerald-400">Preview: </span>
            <span className="text-slate-200">{previewOtp()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Test Notification Tool */}
      <Card className="border border-slate-200 bg-slate-50/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-purple-600" />
            Send Test WhatsApp Notification
          </CardTitle>
          <CardDescription className="text-xs">
            Validate that your selected channel or credentials are active by sending a test message.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Recipient Phone Number</Label>
              <Input
                placeholder="e.g. +919876543210"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="h-10 text-sm bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Custom Test Message (Optional)</Label>
              <Input
                placeholder="Leave blank for standard test alert"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="h-10 text-sm bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={() => testMutation.mutate()}
              disabled={!testPhone.trim() || testMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-2 rounded-xl h-9"
            >
              {testMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {testMutation.isPending ? "Sending..." : "Send Test Notification"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Action Footer */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm h-11 px-8 rounded-2xl shadow-lg shadow-purple-500/25 gap-2"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saveMutation.isPending ? "Saving..." : "Save System WhatsApp Configuration"}
        </Button>
      </div>
    </div>
  );
}
