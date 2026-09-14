/**
 * ============================================================
 * © 2026 Linala — Autonomous WhatsApp AI & Omnichannel CRM
 * ============================================================
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

export function GoogleAuthSettings() {
  const { toast } = useToast();
  const [showSecret, setShowSecret] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  const [form, setForm] = useState({
    googleClientId: "",
    googleClientSecret: "",
    googleAuthEnabled: true,
  });

  const { data, isLoading } = useQuery<{
    embeddedSignupEnabled: boolean;
    googleClientId: string;
    googleClientSecret: string;
    googleAuthEnabled: boolean;
  }>({
    queryKey: ["/api/platform-settings"],
    queryFn: async () => {
      const res = await fetch("/api/platform-settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch platform settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        googleClientId: data.googleClientId || "",
        googleClientSecret: data.googleClientSecret || "",
        googleAuthEnabled: data.googleAuthEnabled !== false,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/platform-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleClientId: form.googleClientId.trim(),
          googleClientSecret: form.googleClientSecret.trim(),
          googleAuthEnabled: form.googleAuthEnabled,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update Google OAuth settings");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/google/config"] });
      toast({
        title: "Settings Saved",
        description: "Google Authentication configuration updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const originUrl = typeof window !== "undefined" ? window.location.origin : "https://wa.linalapro.com";

  const copyToClipboard = (text: string, type: "origin" | "redirect") => {
    navigator.clipboard.writeText(text);
    if (type === "origin") {
      setCopiedOrigin(true);
      setTimeout(() => setCopiedOrigin(false), 2000);
    } else {
      setCopiedRedirect(true);
      setTimeout(() => setCopiedRedirect(false), 2000);
    }
    toast({
      title: "Copied to Clipboard",
      description: text,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border border-slate-200/90 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">
                  Google Sign-In (OAuth 2.0 SSO)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Enable users to sign up and sign in using their Google accounts across Web and Mobile apps.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="google-toggle" className="text-xs font-semibold text-slate-600">
                {form.googleAuthEnabled ? "Enabled" : "Disabled"}
              </Label>
              <Switch
                id="google-toggle"
                checked={form.googleAuthEnabled}
                onCheckedChange={(val) => setForm({ ...form, googleAuthEnabled: val })}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Setup Instructions Callout */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-purple-600" />
                Google Cloud Console Required URIs
              </div>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
              >
                Open Google Cloud Console
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-500 font-medium">Authorized JavaScript Origin:</span>
                <div className="flex items-center justify-between font-mono bg-slate-50 p-1.5 rounded border border-slate-200/60">
                  <span className="truncate">{originUrl}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(originUrl, "origin")}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    {copiedOrigin ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-500 font-medium">Authorized Redirect URI:</span>
                <div className="flex items-center justify-between font-mono bg-slate-50 p-1.5 rounded border border-slate-200/60">
                  <span className="truncate">{`${originUrl}/login`}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${originUrl}/login`, "redirect")}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    {copiedRedirect ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Google OAuth Client ID</Label>
              <Input
                placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                value={form.googleClientId}
                onChange={(e) => setForm({ ...form, googleClientId: e.target.value })}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-slate-400">
                Created in Google Cloud Console &gt; APIs & Services &gt; Credentials &gt; OAuth 2.0 Client IDs.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Google OAuth Client Secret</Label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  placeholder="e.g. GOCSPX-xxxxxxxxxxxxxxxxxxxx"
                  value={form.googleClientSecret}
                  onChange={(e) => setForm({ ...form, googleClientSecret: e.target.value })}
                  className="font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20"
            >
              {saveMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving Settings...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Google Configuration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
