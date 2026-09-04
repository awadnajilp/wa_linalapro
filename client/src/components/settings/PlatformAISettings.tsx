import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Sparkles,
  Key,
  Percent,
  RefreshCw,
  Save,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Coins,
  Cpu,
  Mic,
  Volume2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import { apiRequest } from "@/lib/queryClient";

interface PlatformAISettingsData {
  adminOpenaiApiKey?: string;
  adminSarvamApiKey?: string;
  adminGroqApiKey?: string;
  adminElevenlabsApiKey?: string;
  adminAiMarginPercent?: string;
}

export default function PlatformAISettings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<PlatformAISettingsData>({
    adminOpenaiApiKey: "",
    adminSarvamApiKey: "",
    adminGroqApiKey: "",
    adminElevenlabsApiKey: "",
    adminAiMarginPercent: "70",
  });
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: configData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<PlatformAISettingsData>({
    queryKey: ["/api/admin/platform-ai-settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/platform-ai-settings");
      if (!res.ok) throw new Error("Failed to fetch platform AI settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (configData) {
      setFormData({
        adminOpenaiApiKey: configData.adminOpenaiApiKey || "",
        adminSarvamApiKey: configData.adminSarvamApiKey || "",
        adminGroqApiKey: configData.adminGroqApiKey || "",
        adminElevenlabsApiKey: configData.adminElevenlabsApiKey || "",
        adminAiMarginPercent: configData.adminAiMarginPercent || "70",
      });
    }
  }, [configData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await apiRequest("PUT", "/api/admin/platform-ai-settings", formData);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save platform AI settings");
      }
      toast({
        title: "Settings Saved",
        description: "Platform AI keys & margin percentage updated successfully.",
      });
      refetch();
    } catch (err: any) {
      toast({
        title: "Error Saving Settings",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loading />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Bot className="w-6 h-6 text-indigo-600" />
            Platform AI & Voice Keys
          </h2>
          <p className="text-sm text-gray-500">
            Configure centralized AI provider keys and the global margin for tenant wallet pay-as-you-go usage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Margin Configuration Card */}
        <Card className="md:col-span-1 border-indigo-100 shadow-sm">
          <CardHeader className="bg-gradient-to-br from-indigo-50/50 to-white pb-4">
            <CardTitle className="text-base flex items-center gap-2 text-indigo-950">
              <Percent className="w-5 h-5 text-indigo-600" />
              Platform Profit Margin
            </CardTitle>
            <CardDescription className="text-xs">
              Markup applied on top of actual AI token & audio costs when tenants use Platform Keys.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                <span>AI Margin Percentage (%)</span>
                <Badge variant="secondary" className="font-mono text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                  Default: 70%
                </Badge>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  value={formData.adminAiMarginPercent}
                  onChange={(e) =>
                    setFormData({ ...formData, adminAiMarginPercent: e.target.value })
                  }
                  placeholder="70"
                  className="font-mono text-sm pl-8 pr-12 font-semibold"
                />
                <Percent className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">
                  %
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-3 border border-gray-100 space-y-2 text-xs text-gray-600">
              <div className="font-medium text-gray-800 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-500" />
                How billing works:
              </div>
              <p>
                When a store switches to <strong>Platform Key</strong> mode, each LLM prompt/reply, voice transcription, and voice generation will calculate:
              </p>
              <div className="font-mono bg-white p-2 rounded border text-[11px] text-indigo-800">
                Wallet Charge = Actual Cost × (1 + {formData.adminAiMarginPercent || "70"}%)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform API Keys Card */}
        <Card className="md:col-span-2 border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="w-5 h-5 text-gray-700" />
              Platform AI Provider API Keys
            </CardTitle>
            <CardDescription className="text-xs">
              These keys will be utilized for all tenants choosing "Platform Keys" in their Ecommerce & Assistant settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {/* OpenAI Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  OpenAI API Key
                </Label>
                <span className="text-[11px] text-gray-400">Used for GPT-4o-mini & Whisper STT / TTS</span>
              </div>
              <Input
                type="password"
                value={formData.adminOpenaiApiKey}
                onChange={(e) =>
                  setFormData({ ...formData, adminOpenaiApiKey: e.target.value })
                }
                placeholder="sk-proj-..."
                className="font-mono text-xs"
              />
            </div>

            {/* Sarvam AI Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                  Sarvam AI API Key
                </Label>
                <span className="text-[11px] text-gray-400">Used for Sarvam 105B, Saaras STT & Bulbul TTS (Indic)</span>
              </div>
              <Input
                type="password"
                value={formData.adminSarvamApiKey}
                onChange={(e) =>
                  setFormData({ ...formData, adminSarvamApiKey: e.target.value })
                }
                placeholder="sarvam_api_key_..."
                className="font-mono text-xs"
              />
            </div>

            {/* Groq API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-orange-600" />
                  Groq API Key
                </Label>
                <span className="text-[11px] text-gray-400">Ultra-fast Llama 3.3 70B & Whisper Large v3</span>
              </div>
              <Input
                type="password"
                value={formData.adminGroqApiKey}
                onChange={(e) =>
                  setFormData({ ...formData, adminGroqApiKey: e.target.value })
                }
                placeholder="gsk_..."
                className="font-mono text-xs"
              />
            </div>

            {/* ElevenLabs API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-purple-600" />
                  ElevenLabs API Key
                </Label>
                <span className="text-[11px] text-gray-400">Premium Multilingual Neural Voices</span>
              </div>
              <Input
                type="password"
                value={formData.adminElevenlabsApiKey}
                onChange={(e) =>
                  setFormData({ ...formData, adminElevenlabsApiKey: e.target.value })
                }
                placeholder="xi-api-key-..."
                className="font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
