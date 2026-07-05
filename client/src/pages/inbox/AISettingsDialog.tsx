import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Brain, Volume2, Globe, ListFilter, Thermometer } from "lucide-react";

interface AISettings {
  llmProvider?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  voiceEnabled?: boolean;
  voiceProfileId?: string;
  voiceLanguage?: string;
  localStyle?: string;
  responseLength?: string;
  useDefaults?: boolean;
  takeoverTimeoutMinutes?: number;
}

interface AISettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialSettings: AISettings;
  isContactOverride?: boolean;
  aiEnabled?: boolean;
  onSave: (settings: AISettings, aiEnabled?: boolean) => void;
}

export function AISettingsDialog({
  open,
  onOpenChange,
  title,
  initialSettings,
  isContactOverride = false,
  aiEnabled = false,
  onSave,
}: AISettingsDialogProps) {
  const [useDefaults, setUseDefaults] = React.useState(true);
  const [localAiEnabled, setLocalAiEnabled] = React.useState(false);
  const [llmProvider, setLlmProvider] = React.useState("openai");
  const [model, setModel] = React.useState("gpt-4o");
  const [systemPrompt, setSystemPrompt] = React.useState("");
  const [temperature, setTemperature] = React.useState(0.7);
  const [takeoverTimeoutMinutes, setTakeoverTimeoutMinutes] = React.useState(5);
  const [voiceEnabled, setVoiceEnabled] = React.useState(false);
  const [voiceProfileId, setVoiceProfileId] = React.useState("");
  const [voiceLanguage, setVoiceLanguage] = React.useState("en-US");
  const [localStyle, setLocalStyle] = React.useState("code_mixed");
  const [responseLength, setResponseLength] = React.useState("detailed");

  // Fetch voice profiles
  const { data: voiceProfiles = [] } = useQuery<any[]>({
    queryKey: ["/api/voice-profiles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/voice-profiles");
      return res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setUseDefaults(initialSettings.useDefaults !== false);
      setLocalAiEnabled(aiEnabled);
      setLlmProvider(initialSettings.llmProvider || "openai");
      setModel(initialSettings.model || "gpt-4o");
      setSystemPrompt(
        initialSettings.systemPrompt ||
          "You are a conversational AI Agent taking over this chat. Answer user questions and call custom functions/tools when needed."
      );
      setTemperature(
        initialSettings.temperature !== undefined ? initialSettings.temperature : 0.7
      );
      setTakeoverTimeoutMinutes(
        initialSettings.takeoverTimeoutMinutes !== undefined ? initialSettings.takeoverTimeoutMinutes : 5
      );
      setVoiceEnabled(initialSettings.voiceEnabled || false);
      setVoiceProfileId(initialSettings.voiceProfileId || "");
      setVoiceLanguage(initialSettings.voiceLanguage || "en-US");
      setLocalStyle(initialSettings.localStyle || "code_mixed");
      setResponseLength(initialSettings.responseLength || "detailed");
    }
  }, [open, initialSettings, aiEnabled]);

  // Sync model choices based on provider
  useEffect(() => {
    if (llmProvider === "groq" && model === "gpt-4o") {
      setModel("llama-3.3-70b-versatile");
    } else if (llmProvider === "openai" && model === "llama-3.3-70b-versatile") {
      setModel("gpt-4o");
    }
  }, [llmProvider]);

  const handleSave = () => {
    const settings: AISettings = isContactOverride && useDefaults
      ? { useDefaults: true }
      : {
          useDefaults: false,
          llmProvider,
          model,
          systemPrompt,
          temperature,
          takeoverTimeoutMinutes,
          voiceEnabled,
          voiceProfileId,
          voiceLanguage,
          localStyle,
          responseLength,
        };

    onSave(settings, isContactOverride ? localAiEnabled : undefined);
    onOpenChange(false);
  };

  const isDisabled = isContactOverride && useDefaults;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-gray-100 shadow-xl rounded-2xl p-6">
        <DialogHeader className="border-b border-gray-50 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Brain className="w-6 h-6 text-indigo-600 animate-pulse" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Main AI Trigger State (only for Contact Override) */}
          {isContactOverride && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Enable AI Agent Auto-Replies
                </Label>
                <span className="text-xs text-indigo-700">
                  Allow the AI agent to automatically take over and reply to this contact.
                </span>
              </div>
              <Switch checked={localAiEnabled} onCheckedChange={setLocalAiEnabled} />
            </div>
          )}

          {/* Use defaults toggle */}
          {isContactOverride && (
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-gray-700">Use default Inbox AI settings</Label>
                <p className="text-xs text-gray-400">
                  Inherit prompt, model, and voice settings from the global inbox configuration.
                </p>
              </div>
              <Switch checked={useDefaults} onCheckedChange={setUseDefaults} />
            </div>
          )}

          {/* Settings form container */}
          <div className={`space-y-5 transition-opacity ${isDisabled ? "opacity-45 pointer-events-none" : "opacity-100"}`}>
            
            {/* LLM & Model selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  <Brain className="w-3.5 h-3.5" /> LLM Provider
                </Label>
                <Select value={llmProvider} onValueChange={setLlmProvider}>
                  <SelectTrigger className="bg-gray-50/50 border-gray-200">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">AI Model</Label>
                {llmProvider === "groq" ? (
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="bg-gray-50/50 border-gray-200">
                      <SelectValue placeholder="Select Groq Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</SelectItem>
                      <SelectItem value="llama-3.1-8b-instant">llama-3.1-8b-instant</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="bg-gray-50/50 border-gray-200">
                      <SelectValue placeholder="Select OpenAI Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Prompt & Temperature */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">AI Agent System Prompt</Label>
              <Textarea
                placeholder="Give instructions to the AI agent on how to behave..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="min-h-[110px] bg-gray-50/50 border-gray-200 focus:bg-white text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5" /> Temperature ({temperature})
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="1.2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.7)}
                    className="bg-gray-50/50 border-gray-200 h-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> Timeout (Min)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    value={takeoverTimeoutMinutes}
                    onChange={(e) => setTakeoverTimeoutMinutes(parseInt(e.target.value) || 5)}
                    className="bg-gray-50/50 border-gray-200 h-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  <ListFilter className="w-3.5 h-3.5" /> Response Length
                </Label>
                <Select value={responseLength} onValueChange={setResponseLength}>
                  <SelectTrigger className="bg-gray-50/50 border-gray-200">
                    <SelectValue placeholder="Select length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ultra_short">Ultra Short (1 sentence)</SelectItem>
                    <SelectItem value="short">Short (1-2 sentences)</SelectItem>
                    <SelectItem value="detailed">Detailed (3-4 sentences)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Tone & Dialect Style
                </Label>
                <Select value={localStyle} onValueChange={setLocalStyle}>
                  <SelectTrigger className="bg-gray-50/50 border-gray-200">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code_mixed">Code Mixed (English mixed in)</SelectItem>
                    <SelectItem value="colloquial">Colloquial Dialect (Natural Slang)</SelectItem>
                    <SelectItem value="standard">Standard Literary (Fusha/Formal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Voice Notes setup */}
            <div className="border-t border-gray-50 pt-4 mt-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                    Voice Note Auto-Replies
                  </Label>
                  <p className="text-xs text-gray-400">
                    Automatically reply with spoken audio files when a user sends a voice note.
                  </p>
                </div>
                <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
              </div>

              {voiceEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/30 border border-gray-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">AI Voice Profile</Label>
                    <Select value={voiceProfileId} onValueChange={setVoiceProfileId}>
                      <SelectTrigger className="bg-white border-gray-200">
                        <SelectValue placeholder="Select a voice profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {voiceProfiles.length === 0 ? (
                          <SelectItem value="_empty" disabled>No AI voices configured</SelectItem>
                        ) : (
                          voiceProfiles.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.provider.toUpperCase()} - {p.languageCode})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" /> Target Language
                    </Label>
                    <Select value={voiceLanguage} onValueChange={setVoiceLanguage}>
                      <SelectTrigger className="bg-white border-gray-200">
                        <SelectValue placeholder="Select target language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="ar-SA">Arabic (Saudi Arabia)</SelectItem>
                        <SelectItem value="hi-IN">Hindi (India)</SelectItem>
                        <SelectItem value="ta-IN">Tamil (India)</SelectItem>
                        <SelectItem value="te-IN">Telugu (India)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        <DialogFooter className="border-t border-gray-50 pt-4 gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5">
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
