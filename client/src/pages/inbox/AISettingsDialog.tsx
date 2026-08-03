import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AITrainingPanel from "@/pages/widget-builder/AITrainingPanel";
import { useChannelContext } from "@/contexts/channel-context";
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
import { Sparkles, Brain, Volume2, Globe, ListFilter, Thermometer, Mic } from "lucide-react";

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
  sendWelcome?: boolean;
  welcomeMessage?: string;
  contactSpecificTraining?: boolean;
  sttEnabled?: boolean;
  sttLanguage?: string;
}

interface AISettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialSettings: AISettings;
  isContactOverride?: boolean;
  aiEnabled?: boolean;
  contactId?: string;
  channelId?: string;
  onSave: (settings: AISettings, aiEnabled?: boolean) => void;
}

export function AISettingsDialog({
  open,
  onOpenChange,
  title,
  initialSettings,
  isContactOverride = false,
  aiEnabled = false,
  contactId,
  channelId,
  onSave,
}: AISettingsDialogProps) {
  const { selectedChannel } = useChannelContext();
  const isQrChannel = selectedChannel?.connectionMethod === "qr_code";

  const [useDefaults, setUseDefaults] = React.useState(true);
  const [localAiEnabled, setLocalAiEnabled] = React.useState(false);
  const [llmProvider, setLlmProvider] = React.useState("openai");
  const [model, setModel] = React.useState("gpt-4o");
  const [systemPrompt, setSystemPrompt] = React.useState("");
  const [temperature, setTemperature] = React.useState(0.7);
  const [takeoverTimeoutMinutes, setTakeoverTimeoutMinutes] = React.useState(5);
  const [autoExpire, setAutoExpire] = React.useState(true);

  const [unrepliedNotificationsEnabled, setUnrepliedNotificationsEnabled] = React.useState(false);
  const [unrepliedTimeoutMinutes, setUnrepliedTimeoutMinutes] = React.useState(15);
  const [unrepliedEmailEnabled, setUnrepliedEmailEnabled] = React.useState(true);
  const [unrepliedWhatsappEnabled, setUnrepliedWhatsappEnabled] = React.useState(true);
  const [sendWelcome, setSendWelcome] = React.useState(false);
  const [welcomeMessage, setWelcomeMessage] = React.useState(
    "Hello! We saw your query regarding our product. Do you need more information about this or pricing details?"
  );
  const [voiceEnabled, setVoiceEnabled] = React.useState(false);
  const [voiceProfileId, setVoiceProfileId] = React.useState("");
  const [voiceLanguage, setVoiceLanguage] = React.useState("en-US");
  const [sttEnabled, setSttEnabled] = React.useState(false);
  const [sttLanguage, setSttLanguage] = React.useState("en-IN");
  const [localStyle, setLocalStyle] = React.useState("code_mixed");
  const [responseLength, setResponseLength] = React.useState("detailed");
  const [contactSpecificTraining, setContactSpecificTraining] = React.useState(false);
  const [customSiteId, setCustomSiteId] = React.useState<string | null>(null);
  const [loadingSite, setLoadingSite] = React.useState(false);
  const [kbConfig, setKbConfig] = React.useState({
    aiTone: "professional",
    aiMaxResponseLength: 500,
    aiFallbackMessage: "I am connecting you to an agent.",
    systemPrompt: "",
    trainFromKB: true,
    escalationRules: {
      enabled: false,
      maxAttempts: 3,
      triggerPhrases: [],
      escalationMessage: "Connecting to agent."
    }
  });

  const handleUpdateKbConfig = (key: string, value: any) => {
    setKbConfig(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (open && contactSpecificTraining && contactId && channelId) {
      setLoadingSite(true);
      apiRequest("GET", `/api/sites/contact/${contactId}?channelId=${channelId}`)
        .then(res => res.json())
        .then(data => {
          setCustomSiteId(data.id);
          setLoadingSite(false);
        })
        .catch(err => {
          console.error("Failed to load custom contact site:", err);
          setLoadingSite(false);
        });
    }
  }, [open, contactSpecificTraining, contactId, channelId]);

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
      setLocalAiEnabled(isContactOverride ? aiEnabled : (initialSettings.aiEnabled || false));
      setLlmProvider(initialSettings.llmProvider || "openai");
      setModel(initialSettings.model || "gpt-4o");
      setSystemPrompt(
        initialSettings.systemPrompt ||
          "You are a conversational AI Agent taking over this chat. Answer user questions and call custom functions/tools when needed."
      );
      setTemperature(
        initialSettings.temperature !== undefined ? initialSettings.temperature : 0.7
      );
      
      const timeoutVal = initialSettings.takeoverTimeoutMinutes !== undefined ? initialSettings.takeoverTimeoutMinutes : 5;
      setTakeoverTimeoutMinutes(timeoutVal === 0 ? 5 : timeoutVal);
      setAutoExpire(timeoutVal !== 0);

      setSendWelcome(initialSettings.sendWelcome || false);
      setWelcomeMessage(
        initialSettings.welcomeMessage ||
          "Hello! We saw your query regarding our product. Do you need more information about this or pricing details?"
      );
      setVoiceEnabled(initialSettings.voiceEnabled || false);
      setVoiceProfileId(initialSettings.voiceProfileId || "");
      setVoiceLanguage(initialSettings.voiceLanguage || "en-US");
      setSttEnabled(initialSettings.sttEnabled || false);
      setSttLanguage(initialSettings.sttLanguage || "en-IN");
      setLocalStyle(initialSettings.localStyle || "code_mixed");
      setResponseLength(initialSettings.responseLength || "detailed");
      setContactSpecificTraining(initialSettings.contactSpecificTraining || false);

      setUnrepliedNotificationsEnabled(!!(initialSettings as any).unrepliedNotificationsEnabled);
      setUnrepliedTimeoutMinutes((initialSettings as any).unrepliedTimeoutMinutes ?? 15);
      setUnrepliedEmailEnabled((initialSettings as any).unrepliedEmailEnabled ?? true);
      setUnrepliedWhatsappEnabled((initialSettings as any).unrepliedWhatsappEnabled ?? true);
    }
  }, [open, initialSettings, aiEnabled]);

  // Sync model choices based on provider
  useEffect(() => {
    if (llmProvider === "groq" && model === "gpt-4o") {
      setModel("llama-3.3-70b-versatile");
    } else if (llmProvider === "openai" && model === "llama-3.3-70b-versatile") {
      setModel("gpt-4o");
    } else if (llmProvider === "elevenlabs") {
      setModel("conversational-ai");
    }
  }, [llmProvider]);

  const handleSave = () => {
    const settings: AISettings & { aiEnabled?: boolean } = isContactOverride && useDefaults
      ? { useDefaults: true }
      : {
          useDefaults: false,
          llmProvider,
          model,
          systemPrompt,
          temperature,
          takeoverTimeoutMinutes: autoExpire ? takeoverTimeoutMinutes : 0,
          sendWelcome,
          welcomeMessage,
          voiceEnabled,
          voiceProfileId,
          voiceLanguage,
          sttEnabled,
          sttLanguage,
          localStyle,
          responseLength,
          contactSpecificTraining,
          unrepliedNotificationsEnabled,
          unrepliedTimeoutMinutes,
          unrepliedEmailEnabled,
          unrepliedWhatsappEnabled,
          ...(!isContactOverride ? { aiEnabled: localAiEnabled } : {}),
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
          {/* Main AI Trigger State */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                {isContactOverride ? "Enable AI Agent Auto-Replies" : "Enable AI Agent for all incoming messages"}
              </Label>
              <span className="text-xs text-indigo-700">
                {isContactOverride
                  ? "Allow the AI agent to automatically take over and reply to this contact."
                  : "Automatically trigger the AI agent for all incoming messages on this channel."}
              </span>
            </div>
            <Switch checked={localAiEnabled} onCheckedChange={setLocalAiEnabled} />
          </div>

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
                    <SelectItem value="elevenlabs">ElevenLabs Agent</SelectItem>
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
                ) : llmProvider === "elevenlabs" ? (
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="bg-gray-50/50 border-gray-200">
                      <SelectValue placeholder="Select ElevenLabs Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conversational-ai">Conversational AI Agent</SelectItem>
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

            {/* Welcome / Intro Message */}
            <div className="bg-indigo-50/20 border border-indigo-100/50 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    Send Intro Message on Activation
                  </Label>
                  <p className="text-xs text-gray-400">
                    Automatically send a welcome or introductory message when the AI agent takeover is enabled.
                  </p>
                </div>
                <Switch checked={sendWelcome} onCheckedChange={setSendWelcome} />
              </div>

              {sendWelcome && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Intro Message Content</Label>
                  <Textarea
                    placeholder="Enter welcome message content..."
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="min-h-[70px] bg-white border-gray-200 focus:bg-white text-sm"
                  />
                </div>
              )}
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

              <div className="space-y-2 flex flex-col justify-between">
                <div className="flex items-center justify-between mt-1">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Auto-Expire
                  </Label>
                  <Switch checked={autoExpire} onCheckedChange={setAutoExpire} />
                </div>
                {autoExpire ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      min="1"
                      max="1440"
                      step="1"
                      value={takeoverTimeoutMinutes}
                      onChange={(e) => setTakeoverTimeoutMinutes(parseInt(e.target.value) || 5)}
                      className="bg-gray-50/50 border-gray-200 h-9"
                    />
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">Min</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-indigo-600 font-semibold mt-1">Never Expire</span>
                )}
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
                        <SelectItem value="en-IN">Indian English</SelectItem>
                        <SelectItem value="ar-SA">Arabic (Saudi Arabia)</SelectItem>
                        <SelectItem value="hi-IN">Hindi (India)</SelectItem>
                        <SelectItem value="ml-IN">Malayalam (India)</SelectItem>
                        <SelectItem value="bn-IN">Bengali (India)</SelectItem>
                        <SelectItem value="ta-IN">Tamil (India)</SelectItem>
                        <SelectItem value="te-IN">Telugu (India)</SelectItem>
                        <SelectItem value="mr-IN">Marathi (India)</SelectItem>
                        <SelectItem value="kn-IN">Kannada (India)</SelectItem>
                        <SelectItem value="gu-IN">Gujarati (India)</SelectItem>
                        <SelectItem value="pa-IN">Punjabi (India)</SelectItem>
                        <SelectItem value="or-IN">Odia (India)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Voice Note Transcription (STT) setup */}
            <div className="border-t border-gray-50 pt-4 mt-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Mic className="w-4 h-4 text-indigo-600" />
                    Voice Note Transcription (STT)
                  </Label>
                  <p className="text-xs text-gray-400">
                    Transcribe incoming WhatsApp voice notes into text (disabled by default).
                  </p>
                </div>
                <Switch checked={sttEnabled} onCheckedChange={setSttEnabled} />
              </div>

              {sttEnabled && (
                <div className="grid grid-cols-1 gap-4 bg-gray-50/30 border border-gray-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" /> Transcription Language
                    </Label>
                    <Select value={sttLanguage} onValueChange={setSttLanguage}>
                      <SelectTrigger className="bg-white border-gray-200">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-IN">English (India / US)</SelectItem>
                        <SelectItem value="ml-IN">Malayalam (India)</SelectItem>
                        <SelectItem value="hi-IN">Hindi (India)</SelectItem>
                        <SelectItem value="ar-SA">Arabic (Saudi Arabia)</SelectItem>
                        <SelectItem value="ta-IN">Tamil (India)</SelectItem>
                        <SelectItem value="te-IN">Telugu (India)</SelectItem>
                        <SelectItem value="kn-IN">Kannada (India)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Unreplied Notifications setup (Only for QR channels and Inbox view) */}
            {!isContactOverride && isQrChannel && (
              <div className="border-t border-gray-50 pt-4 mt-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <ListFilter className="w-4 h-4 text-indigo-600" />
                      Unreplied Message Alerts
                    </Label>
                    <p className="text-xs text-gray-400">
                      Notify team members when customer messages remain unreplied after a specific timeout (with no bot/flow activity).
                    </p>
                  </div>
                  <Switch
                    checked={unrepliedNotificationsEnabled}
                    onCheckedChange={setUnrepliedNotificationsEnabled}
                  />
                </div>

                {unrepliedNotificationsEnabled && (
                  <div className="bg-gray-50/30 border border-gray-100 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <Label htmlFor="unrepliedTimeoutMinutes" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Alert Delay (Minutes)
                      </Label>
                      <Input
                        id="unrepliedTimeoutMinutes"
                        type="number"
                        min={1}
                        value={unrepliedTimeoutMinutes}
                        onChange={(e) => setUnrepliedTimeoutMinutes(Math.max(1, parseInt(e.target.value) || 15))}
                        className="bg-white border-gray-200 max-w-[150px]"
                      />
                      <p className="text-[10px] text-gray-400">Default is 15 minutes.</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-2">
                        Notification Methods
                      </Label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="unrepliedEmailEnabled" className="text-xs text-gray-500 font-normal">
                            Send summary to Team Member's Email
                          </Label>
                          <Switch
                            id="unrepliedEmailEnabled"
                            checked={unrepliedEmailEnabled}
                            onCheckedChange={setUnrepliedEmailEnabled}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="unrepliedWhatsappEnabled" className="text-xs text-gray-500 font-normal">
                            Send summary to Team Member's WhatsApp (via QR Channel)
                          </Label>
                          <Switch
                            id="unrepliedWhatsappEnabled"
                            checked={unrepliedWhatsappEnabled}
                            onCheckedChange={setUnrepliedWhatsappEnabled}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contact-Specific Training Data */}
            {isContactOverride && !useDefaults && (
              <div className="border-t border-gray-50 pt-4 mt-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <Brain className="w-4 h-4 text-indigo-600" />
                      Contact-Specific Training Data
                    </Label>
                    <p className="text-xs text-gray-400">
                      Enable and upload custom training data/FAQ specific to this contact (ignores channel-wide global training).
                    </p>
                  </div>
                  <Switch checked={contactSpecificTraining} onCheckedChange={setContactSpecificTraining} />
                </div>

                {contactSpecificTraining && contactId && channelId && (
                  <div className="bg-gray-50/30 border border-gray-100 rounded-xl p-4 mt-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[400px] overflow-y-auto">
                    {loadingSite ? (
                      <div className="text-xs text-gray-400 flex items-center justify-center py-6">
                        Loading Custom AI Training context...
                      </div>
                    ) : customSiteId ? (
                      <AITrainingPanel
                        config={kbConfig}
                        updateConfig={handleUpdateKbConfig}
                        siteId={customSiteId}
                        channelId={channelId}
                      />
                    ) : (
                      <div className="text-xs text-red-500 py-2 text-center">
                        Failed to load custom training site.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
