import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import { Brain, Volume2, Globe, FileText, Settings, Play, ShieldAlert, Sparkles, HelpCircle, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useChannelContext } from "@/contexts/channel-context";
import { cn } from "@/lib/utils";

export default function AIAssistantProfileSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedChannel } = useChannelContext();
  const channelId = selectedChannel?.id;

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // State variables matching database schema
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState("My AI Assistant");
  const [llmProvider, setLlmProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceProfileId, setVoiceProfileId] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState("en-US");

  const [kbEnabled, setKbEnabled] = useState(false);
  const [kbSiteId, setKbSiteId] = useState("");

  const [triggerFlowEnabled, setTriggerFlowEnabled] = useState(false);
  const [targetFlowId, setTargetFlowId] = useState("");
  const [triggerFlowPrompt, setTriggerFlowPrompt] = useState(
    "Triggers a helper chatbot/automation flow if the user wants to perform an action or process (like catalog, demo, support, pricing, or custom flows)."
  );

  const [analyzeInboxHistory, setAnalyzeInboxHistory] = useState(false);
  const [ignorePersonalConversations, setIgnorePersonalConversations] = useState(true);
  const [personalKeywords, setPersonalKeywords] = useState("family, personal, private, mom, wife");

  // API Key Inputs per Profile
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [groqApiKey, setGroqApiKey] = useState("");
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState("");
  const [sarvamApiKey, setSarvamApiKey] = useState("");

  // Fetch all AI Assistant Profiles for this channel
  const { data: profiles = [], isLoading: isLoadingProfiles, refetch: refetchProfiles } = useQuery<any[]>({
    queryKey: ["/api/ai-profile/list", channelId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/ai-profile/list?channelId=${channelId}`);
      return res.json();
    },
    enabled: !!channelId,
  });

  // Fetch Voice Profiles
  const { data: voiceProfiles = [] } = useQuery<any[]>({
    queryKey: ["/api/voice-profiles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/voice-profiles");
      return res.json();
    },
  });

  // Fetch Knowledge Base Sites filtered by channelId
  const { data: sites = [] } = useQuery<any[]>({
    queryKey: ["/api/sites", channelId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/sites?channelId=${channelId}`);
      return res.json();
    },
    enabled: !!channelId,
  });

  // Fetch Automation Flows
  const { data: automations = [] } = useQuery<any[]>({
    queryKey: ["/api/automations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/automations");
      return res.json();
    },
  });

  // Default selection to the active profile on load
  useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      const active = profiles.find((p) => p.enabled);
      if (active) {
        setSelectedProfileId(active.id);
      } else {
        setSelectedProfileId(profiles[0].id);
      }
    }
  }, [profiles, selectedProfileId]);

  const currentProfile = profiles.find((p) => p.id === selectedProfileId);

  // Load selected profile data
  useEffect(() => {
    if (currentProfile) {
      setEnabled(!!currentProfile.enabled);
      setName(currentProfile.name || "My AI Assistant");
      setLlmProvider(currentProfile.llmProvider || "openai");
      setModel(currentProfile.model || "gpt-4o");
      setSystemPrompt(currentProfile.systemPrompt || "");
      setTemperature(currentProfile.temperature !== undefined ? currentProfile.temperature : 0.7);
      
      setVoiceEnabled(!!currentProfile.voiceEnabled);
      setVoiceProfileId(currentProfile.voiceProfileId || "");
      setVoiceLanguage(currentProfile.voiceLanguage || "en-US");

      setKbEnabled(!!currentProfile.kbEnabled);
      setKbSiteId(currentProfile.kbSiteId || "");

      setTriggerFlowEnabled(!!currentProfile.triggerFlowEnabled);
      setTargetFlowId(currentProfile.targetFlowId || "");
      setTriggerFlowPrompt(
        currentProfile.triggerFlowPrompt ||
        "Triggers a helper chatbot/automation flow if the user wants to perform an action or process (like catalog, demo, support, pricing, or custom flows)."
      );

      setAnalyzeInboxHistory(!!currentProfile.analyzeInboxHistory);
      setIgnorePersonalConversations(currentProfile.ignorePersonalConversations !== false);
      
      if (Array.isArray(currentProfile.personalKeywords)) {
        setPersonalKeywords(currentProfile.personalKeywords.join(", "));
      } else {
        setPersonalKeywords("family, personal, private, mom, wife");
      }

      setOpenaiApiKey(currentProfile.openaiApiKey || "");
      setGroqApiKey(currentProfile.groqApiKey || "");
      setElevenlabsApiKey(currentProfile.elevenlabsApiKey || "");
      setSarvamApiKey(currentProfile.sarvamApiKey || "");
    }
  }, [currentProfile]);

  // Sync model selection with LLM provider choices
  useEffect(() => {
    if (llmProvider === "groq" && model === "gpt-4o") {
      setModel("llama-3.3-70b-versatile");
    } else if (llmProvider === "openai" && model === "llama-3.3-70b-versatile") {
      setModel("gpt-4o");
    } else if (llmProvider === "elevenlabs") {
      setModel("conversational-ai");
    }
  }, [llmProvider]);

  // Create profile mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai-profile", {
        channelId,
        name: `AI Profile ${profiles.length + 1}`,
        enabled: false,
        llmProvider: "openai",
        model: "gpt-4o",
        temperature: 0.7,
      });
      return res.json();
    },
    onSuccess: (newP) => {
      toast({
        title: "AI Profile Created",
        description: "Configure your new profile name, model selection, prompt, and keys below.",
      });
      refetchProfiles().then(() => {
        setSelectedProfileId(newP.id);
      });
    },
  });

  // Activate profile mutation
  const activateMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const res = await apiRequest("POST", `/api/ai-profile/${profileId}/activate`);
      return res.json();
    },
    onSuccess: (activeP) => {
      toast({
        title: "Profile Activated",
        description: `"${activeP.name}" is now the active AI Profile for this channel.`,
      });
      refetchProfiles();
      queryClient.invalidateQueries({ queryKey: ["/api/ai-profile", channelId] });
    },
  });

  // Delete profile mutation
  const deleteMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const res = await apiRequest("DELETE", `/api/ai-profile/${profileId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "AI Profile Deleted",
        description: "The profile was deleted successfully.",
      });
      refetchProfiles().then((resList) => {
        const newList = resList.data || [];
        if (newList.length > 0) {
          setSelectedProfileId(newList[0].id);
        }
      });
    },
  });

  // Save profile mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("PUT", `/api/ai-profile/${selectedProfileId}`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "AI Profile Saved",
        description: "The selected profile configuration has been successfully updated.",
      });
      refetchProfiles();
      queryClient.invalidateQueries({ queryKey: ["/api/ai-profile", channelId] });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err.message || "Failed to save AI Profile settings.",
      });
    },
  });

  const handleSave = () => {
    if (!selectedProfileId) return;

    const keywordsArray = personalKeywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const payload: any = {
      channelId,
      enabled,
      name,
      llmProvider,
      model,
      systemPrompt,
      temperature,
      voiceEnabled,
      voiceProfileId: voiceProfileId === "" || voiceProfileId === "_empty" ? null : voiceProfileId,
      voiceLanguage,
      kbEnabled,
      kbSiteId: kbSiteId === "" || kbSiteId === "_empty" ? null : kbSiteId,
      triggerFlowEnabled,
      targetFlowId: targetFlowId === "" || targetFlowId === "_empty" ? null : targetFlowId,
      triggerFlowPrompt,
      analyzeInboxHistory,
      ignorePersonalConversations,
      personalKeywords: keywordsArray,
      openaiApiKey: openaiApiKey || null,
      groqApiKey: groqApiKey || null,
      elevenlabsApiKey: elevenlabsApiKey || null,
      sarvamApiKey: sarvamApiKey || null,
    };

    updateMutation.mutate(payload);
  };

  if (!channelId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-150 shadow-sm">
        <ShieldAlert className="w-8 h-8 text-amber-500 mb-2 animate-bounce" />
        <p className="text-gray-600 font-medium">Please select a WhatsApp Channel to configure its AI Assistant Profile.</p>
      </div>
    );
  }

  if (isLoadingProfiles) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loading />
        <p className="text-gray-500 text-sm mt-4">Loading AI Assistant Profiles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Multi-Profile Control Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 p-6 sm:p-8 text-white shadow-xl border border-indigo-900/30 animate-fade-in">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-10 pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-24 w-72 h-72 bg-purple-500 rounded-full blur-3xl opacity-15 pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold tracking-wider text-indigo-300 border border-white/10 uppercase">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Advanced Multi-Profile CRM
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display">AI Assistant Profile</h2>
            <p className="text-indigo-200/80 text-xs sm:text-sm max-w-xl">
              Create multiple assistant behaviors with customized voice profiles, LLM keys, and handoff triggers, and select one as active.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Select Profile</Label>
              <Select value={selectedProfileId || ""} onValueChange={setSelectedProfileId}>
                <SelectTrigger className="w-[220px] bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="No profile selected" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 text-white border-slate-800">
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.enabled ? "⭐" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <Button
                size="sm"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-3"
                title="Create a new AI Profile"
              >
                <Plus className="w-4 h-4 mr-1" /> New
              </Button>
              {selectedProfileId && profiles.length > 1 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(selectedProfileId)}
                  disabled={deleteMutation.isPending}
                  className="bg-red-900 hover:bg-red-800 border border-red-800 text-red-100 h-10 px-3"
                  title="Delete current AI Profile"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedProfileId && currentProfile ? (
        <>
          {/* Active Profile Status Row */}
          <div className="bg-white border border-gray-150 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between shadow-sm gap-4">
            <div className="flex items-center gap-3">
              {currentProfile.enabled ? (
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5" />
                </div>
              )}
              <div className="space-y-0.5 text-center sm:text-left">
                <h4 className="font-semibold text-gray-900 text-sm">
                  {currentProfile.enabled ? "This is the active AI Profile" : "This profile is inactive"}
                </h4>
                <p className="text-xs text-gray-500">
                  {currentProfile.enabled 
                    ? "Currently serving all active AI Takeovers on this channel." 
                    : "Activate this profile to replace the active CRM responder model settings."}
                </p>
              </div>
            </div>
            {!currentProfile.enabled && (
              <Button
                size="sm"
                onClick={() => activateMutation.mutate(selectedProfileId)}
                disabled={activateMutation.isPending}
                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              >
                Set as Active Profile
              </Button>
            )}
          </div>

          {/* Main Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-300">
            
            {/* Left Side: General Profile configuration */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-gray-200/80 shadow-md">
                <CardHeader className="border-b border-gray-50 pb-4">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-600 animate-spin-slow" />
                    Assistant Persona & Provider Selection
                  </CardTitle>
                  <CardDescription>
                    Configure LLM, system instructions, temperature, and API Keys for this profile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assistantName" className="font-semibold text-gray-700">Profile Name</Label>
                      <Input 
                        id="assistantName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="E.g. Sales Assistant, Support Bot"
                        className="border-gray-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-semibold text-gray-700">LLM Provider</Label>
                      <Select value={llmProvider} onValueChange={setLlmProvider}>
                        <SelectTrigger className="border-gray-200">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI (GPT Models)</SelectItem>
                          <SelectItem value="groq">Groq (Ultra-Fast Llama)</SelectItem>
                          <SelectItem value="elevenlabs">ElevenLabs Conversational AI</SelectItem>
                          <SelectItem value="sarvam">Sarvam.ai (Indian Languages)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-semibold text-gray-700">Model Selection</Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger className="border-gray-200">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {llmProvider === "openai" && (
                            <>
                              <SelectItem value="gpt-4o">gpt-4o (Premium Quality)</SelectItem>
                              <SelectItem value="gpt-4o-mini">gpt-4o-mini (Cost-Efficient)</SelectItem>
                            </>
                          )}
                          {llmProvider === "groq" && (
                            <>
                              <SelectItem value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</SelectItem>
                              <SelectItem value="mixtral-8x7b-32768">mixtral-8x7b-32768</SelectItem>
                            </>
                          )}
                          {llmProvider === "elevenlabs" && (
                            <SelectItem value="conversational-ai">Conversational AI Model</SelectItem>
                          )}
                          {llmProvider === "sarvam" && (
                            <SelectItem value="sarvam-2b-v0.5">Sarvam 2B (v0.5)</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="font-semibold text-gray-700">Temperature: {temperature}</Label>
                        <span className="text-[10px] text-gray-400">Low = Precise | High = Creative</span>
                      </div>
                      <Slider 
                        value={[temperature]} 
                        min={0} 
                        max={1.2} 
                        step={0.1}
                        onValueChange={([v]) => setTemperature(v)}
                        className="py-3"
                      />
                    </div>
                  </div>

                  {/* Profile-specific API Keys */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Profile API Key Override</h4>
                    {llmProvider === "openai" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700">OpenAI API Key</Label>
                        <Input
                          type="password"
                          value={openaiApiKey}
                          onChange={(e) => setOpenaiApiKey(e.target.value)}
                          placeholder="sk-proj-..."
                          className="border-gray-200 bg-white"
                        />
                        <p className="text-[10px] text-slate-400">If left blank, falls back to unified system OpenAI keys.</p>
                      </div>
                    )}
                    {llmProvider === "groq" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700">Groq API Key</Label>
                        <Input
                          type="password"
                          value={groqApiKey}
                          onChange={(e) => setGroqApiKey(e.target.value)}
                          placeholder="gsk_..."
                          className="border-gray-200 bg-white"
                        />
                        <p className="text-[10px] text-slate-400">If left blank, falls back to unified system Groq keys.</p>
                      </div>
                    )}
                    {llmProvider === "elevenlabs" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700">ElevenLabs API Key</Label>
                        <Input
                          type="password"
                          value={elevenlabsApiKey}
                          onChange={(e) => setElevenlabsApiKey(e.target.value)}
                          placeholder="Enter ElevenLabs API Key"
                          className="border-gray-200 bg-white"
                        />
                        <p className="text-[10px] text-slate-400">If left blank, falls back to unified system ElevenLabs keys.</p>
                      </div>
                    )}
                    {llmProvider === "sarvam" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700">Sarvam API Key</Label>
                        <Input
                          type="password"
                          value={sarvamApiKey}
                          onChange={(e) => setSarvamApiKey(e.target.value)}
                          placeholder="Enter Sarvam.ai API Key"
                          className="border-gray-200 bg-white"
                        />
                        <p className="text-[10px] text-slate-400">If left blank, falls back to unified system Sarvam keys.</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-gray-700">System Prompt / Instructions</Label>
                    <Textarea 
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="Explain how the AI assistant should speak and behave under this profile..."
                      rows={6}
                      className="border-gray-200 resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Voice Notes setup */}
              <Card className="border-gray-200/80 shadow-md">
                <CardHeader className="border-b border-gray-50 pb-4">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-indigo-600" />
                    Spoken Voice Output (Voice Mode)
                  </CardTitle>
                  <CardDescription>
                    Convert the assistant replies into synthesised audio voice notes sent back to clients.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-semibold text-gray-700">Enable Spoken Replies</Label>
                      <p className="text-xs text-gray-400">Generate voice notes instead of text replies</p>
                    </div>
                    <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
                  </div>

                  {voiceEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 rounded-xl p-4 border border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
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
                                  {p.name} ({p.provider.toUpperCase()})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5" /> Target Speech Language
                        </Label>
                        <Select value={voiceLanguage} onValueChange={setVoiceLanguage}>
                          <SelectTrigger className="bg-white border-gray-200">
                            <SelectValue placeholder="Select target language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">🌐 Auto-detect Language</SelectItem>
                            <SelectItem value="ml-IN">Malayalam (India)</SelectItem>
                            <SelectItem value="en-IN">Indian English</SelectItem>
                            <SelectItem value="hi-IN">Hindi (India)</SelectItem>
                            <SelectItem value="ar-SA">Arabic (Saudi Arabia)</SelectItem>
                            <SelectItem value="ta-IN">Tamil (India)</SelectItem>
                            <SelectItem value="te-IN">Telugu (India)</SelectItem>
                            <SelectItem value="kn-IN">Kannada (India)</SelectItem>
                            <SelectItem value="en-US">English (US)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Side: KB, Flow execution, Context & Personal Filters */}
            <div className="space-y-6">
              
              {/* Knowledge Base Integration */}
              <Card className="border-gray-200/80 shadow-md">
                <CardHeader className="border-b border-gray-50 pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Brain className="w-4.5 h-4.5 text-indigo-600" />
                    Knowledge Base Source
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold text-gray-700">Link Knowledge Base</Label>
                      <p className="text-[10px] text-gray-400">Inject KB chunks & Q&As into prompt</p>
                    </div>
                    <Switch checked={kbEnabled} onCheckedChange={setKbEnabled} />
                  </div>

                  {kbEnabled && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Select Training Site</Label>
                      <Select value={kbSiteId} onValueChange={setKbSiteId}>
                        <SelectTrigger className="bg-white border-gray-200">
                          <SelectValue placeholder="Select site" />
                        </SelectTrigger>
                        <SelectContent>
                          {sites.length === 0 ? (
                            <SelectItem value="_empty" disabled>No active sites found for this channel</SelectItem>
                          ) : (
                            sites.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} ({s.domain})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Trigger Automation Flow */}
              <Card className="border-gray-200/80 shadow-md">
                <CardHeader className="border-b border-gray-50 pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Play className="w-4.5 h-4.5 text-indigo-600" />
                    Custom Functioning (Trigger Flow)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold text-gray-700">Enable Bot Flow Takeover</Label>
                      <p className="text-[10px] text-gray-400">Allows AI to hand over chat to a workflow</p>
                    </div>
                    <Switch checked={triggerFlowEnabled} onCheckedChange={setTriggerFlowEnabled} />
                  </div>

                  {triggerFlowEnabled && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Select Target Flow</Label>
                        <Select value={targetFlowId} onValueChange={setTargetFlowId}>
                          <SelectTrigger className="bg-white border-gray-200">
                            <SelectValue placeholder="Select flow" />
                          </SelectTrigger>
                          <SelectContent>
                            {automations.length === 0 ? (
                              <SelectItem value="_empty" disabled>No automation flows found</SelectItem>
                            ) : (
                              automations.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Trigger Function Description / Instructions</Label>
                        <Textarea 
                          value={triggerFlowPrompt}
                          onChange={(e) => setTriggerFlowPrompt(e.target.value)}
                          placeholder="E.g. Trigger this function if the user wants to check pricing options, get catalog, or make an order."
                          rows={4}
                          className="border-gray-200 text-xs resize-none bg-white"
                        />
                        <p className="text-[9px] text-gray-400 leading-normal">
                          Explain to the LLM exactly when to trigger the bot flow takeover (conditional execution).
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Inbox Context & Privacy Filters */}
              <Card className="border-gray-200/80 shadow-md">
                <CardHeader className="border-b border-gray-50 pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-4.5 h-4.5 text-indigo-600" />
                    Context & Privacy Checks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold text-gray-700">Analyze Chat History</Label>
                      <p className="text-[10px] text-gray-400">Load recent logs to understand context</p>
                    </div>
                    <Switch checked={analyzeInboxHistory} onCheckedChange={setAnalyzeInboxHistory} />
                  </div>

                  <div className="border-t border-gray-50 pt-4 mt-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-semibold text-gray-700">Ignore Personal Conversations</Label>
                        <p className="text-[10px] text-gray-400">Do not store or reply to personal texts</p>
                      </div>
                      <Switch checked={ignorePersonalConversations} onCheckedChange={setIgnorePersonalConversations} />
                    </div>

                    {ignorePersonalConversations && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                          Personal Keywords
                        </Label>
                        <Input 
                          value={personalKeywords}
                          onChange={(e) => setPersonalKeywords(e.target.value)}
                          placeholder="mom, dad, private, personal, family, brother"
                          className="border-gray-200 text-xs"
                        />
                        <p className="text-[9px] text-gray-400 leading-normal">
                          Messages matching these comma-separated keywords will be entirely bypassed and not saved to inbox.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sticky Bottom Actions Panel */}
          <div className="flex items-center justify-between bg-white border border-gray-150 rounded-xl p-4 shadow-md mt-6">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />
              This profile will be saved under the name "{name}".
            </div>
            <Button 
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {updateMutation.isPending ? "Saving changes..." : "Save AI Profile"}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-150 shadow-sm">
          <p className="text-gray-500 text-sm">Please select or create an AI Profile to proceed.</p>
        </div>
      )}
    </div>
  );
}
