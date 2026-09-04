import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Mic, 
  Trash2, 
  Plus, 
  Square, 
  Play, 
  Pause, 
  Key, 
  Check, 
  Settings2,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface VoiceProfile {
  id: string;
  name: string;
  provider: string;
  voiceId: string;
  languageCode: string;
  status: string;
}

const INDIC_LANGUAGES = [
  { code: "en-IN", name: "Indian English" },
  { code: "en-US", name: "English (US)" },
  { code: "ar-SA", name: "Saudi Arabic" },
  { code: "hi-IN", name: "Hindi" },
  { code: "ta-IN", name: "Tamil" },
  { code: "te-IN", name: "Telugu" },
  { code: "ml-IN", name: "Malayalam" },
  { code: "kn-IN", name: "Kannada" },
  { code: "mr-IN", name: "Marathi" },
  { code: "gu-IN", name: "Gujarati" },
  { code: "bn-IN", name: "Bengali" },
  { code: "pa-IN", name: "Punjabi" },
  { code: "or-IN", name: "Odia" }
];

const PREDEFINED_VOICES = [
  { id: "kavya", name: "Kavya (Female - Hindi/English)" },
  { id: "rahul", name: "Rahul (Male - Hindi/English)" },
  { id: "amit", name: "Amit (Male - Hindi/English)" },
  { id: "anushka", name: "Anushka (Female - Hindi/English)" },
  { id: "custom_speaker", name: "Custom Speaker ID (Manually Input)" }
];

const GROQ_PREDEFINED_VOICES = [
  { id: "autumn", name: "Autumn (Female)" },
  { id: "diana", name: "Diana (Female)" },
  { id: "hannah", name: "Hannah (Female)" },
  { id: "austin", name: "Austin (Male)" },
  { id: "daniel", name: "Daniel (Male)" },
  { id: "troy", name: "Troy (Male)" }
];

const ELEVENLABS_PREDEFINED_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Female)" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Dom (Male)" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Female)" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni (Male)" },
  { id: "VR6A4UBqFnCFJeDrlHPf", name: "Arnold (Male)" },
  { id: "custom_speaker", name: "Custom Speaker ID (Manually Input)" }
];

const OPENAI_PREDEFINED_VOICES = [
  { id: "alloy", name: "Alloy (Neutral & Balanced)" },
  { id: "echo", name: "Echo (Male - Warm & Conversational)" },
  { id: "fable", name: "Fable (British Accent - Expressive)" },
  { id: "onyx", name: "Onyx (Male - Deep & Authoritative)" },
  { id: "nova", name: "Nova (Female - Energetic & Friendly)" },
  { id: "shimmer", name: "Shimmer (Female - Clear & Bright)" }
];

export default function AIVoicesSettings(): JSX.Element {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sarvamKey, setSarvamKey] = useState("");
  const [isSavingKey, setIsSavingKey] = useState(false);

  const [groqKey, setGroqKey] = useState("");
  const [isSavingGroqKey, setIsSavingGroqKey] = useState(false);

  const [elevenlabsKey, setElevenlabsKey] = useState("");
  const [isSavingElevenlabsKey, setIsSavingElevenlabsKey] = useState(false);

  // Predefined voice creation states
  const [stdProvider, setStdProvider] = useState("sarvam");
  const [stdName, setStdName] = useState("");
  const [stdVoiceId, setStdVoiceId] = useState("anushka");
  const [customSpeakerId, setCustomSpeakerId] = useState("");
  const [stdLanguage, setStdLanguage] = useState("en-IN");
  const [isCreatingStd, setIsCreatingStd] = useState(false);

  // Voice cloning states
  const [cloneName, setCloneName] = useState("");
  const [cloneProvider, setCloneProvider] = useState("sarvam");
  const [isCloning, setIsCloning] = useState(false);
  const [isRecordOpen, setIsRecordOpen] = useState(false);

  // Voice recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Fetch active voice profiles
  const { data: voiceProfilesList = [], isLoading: isLoadingProfiles } = useQuery<VoiceProfile[]>({
    queryKey: ["/api/voice-profiles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/voice-profiles");
      if (!res.ok) throw new Error("Failed to fetch voice profiles");
      return res.json();
    }
  });

  // Fetch logged in user's masking status
  useEffect(() => {
    if (user && (user as any).sarvamApiKey) {
      setSarvamKey("••••••••••••••••••••••••••••••••");
    }
    if (user && (user as any).groqApiKey) {
      setGroqKey("••••••••••••••••••••••••••••••••");
    }
    if (user && (user as any).elevenlabsApiKey) {
      setElevenlabsKey("••••••••••••••••••••••••••••••••");
    }
  }, [user]);

  // Update API key
  const handleSaveApiKey = async () => {
    if (!sarvamKey) return;
    setIsSavingKey(true);
    try {
      const res = await apiRequest("PUT", "/api/users-voice-settings", {
        sarvamApiKey: sarvamKey === "••••••••••••••••••••••••••••••••" ? undefined : sarvamKey,
      });

      if (!res.ok) {
        throw new Error("Failed to save voice settings");
      }

      toast({
        title: "Success",
        description: "Sarvam.ai API key saved successfully.",
      });

      // Refetch user profile
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to save API key",
      });
    } finally {
      setIsSavingKey(false);
    }
  };

  // Update Groq API key
  const handleSaveGroqKey = async () => {
    if (!groqKey) return;
    setIsSavingGroqKey(true);
    try {
      const res = await apiRequest("PUT", "/api/users-voice-settings", {
        groqApiKey: groqKey === "••••••••••••••••••••••••••••••••" ? undefined : groqKey,
      });

      if (!res.ok) {
        throw new Error("Failed to save Groq API key");
      }

      toast({
        title: "Success",
        description: "Groq API key saved successfully.",
      });

      // Refetch user profile
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to save Groq API key",
      });
    } finally {
      setIsSavingGroqKey(false);
    }
  };

  // Update ElevenLabs API key
  const handleSaveElevenlabsKey = async () => {
    if (!elevenlabsKey) return;
    setIsSavingElevenlabsKey(true);
    try {
      const res = await apiRequest("PUT", "/api/users-voice-settings", {
        elevenlabsApiKey: elevenlabsKey === "••••••••••••••••••••••••••••••••" ? undefined : elevenlabsKey,
      });

      if (!res.ok) {
        throw new Error("Failed to save ElevenLabs API key");
      }

      toast({
        title: "Success",
        description: "ElevenLabs API key saved successfully.",
      });

      // Refetch user profile
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to save ElevenLabs API key",
      });
    } finally {
      setIsSavingElevenlabsKey(false);
    }
  };

  // Add standard voice profile
  const handleCreateStandardVoice = async () => {
    if (!stdName.trim()) {
      toast({
        variant: "destructive",
        title: "Required",
        description: "Please enter a voice profile name.",
      });
      return;
    }

    if (stdVoiceId === "custom_speaker" && !customSpeakerId.trim()) {
      toast({
        variant: "destructive",
        title: "Required",
        description: "Please enter your custom Speaker ID.",
      });
      return;
    }

    setIsCreatingStd(true);
    try {
      const res = await apiRequest("POST", "/api/voice-profiles", {
        name: stdName,
        provider: stdProvider,
        voiceId: stdVoiceId === "custom_speaker" ? customSpeakerId.trim() : stdVoiceId,
        languageCode: stdLanguage,
      });

      if (!res.ok) {
        throw new Error("Failed to add voice profile");
      }

      toast({
        title: "Success",
        description: `Standard voice profile "${stdName}" added successfully.`,
      });

      setStdName("");
      queryClient.invalidateQueries({ queryKey: ["/api/voice-profiles"] });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to add standard voice profile",
      });
    } finally {
      setIsCreatingStd(false);
    }
  };

  // Delete voice profile
  const handleDeleteVoiceProfile = async (id: string) => {
    if (!confirm("Are you sure you want to delete this voice profile? This will not delete the cloned voice from Sarvam.ai, but will remove it from the dashboard.")) {
      return;
    }

    try {
      const res = await apiRequest("DELETE", `/api/voice-profiles/${id}`);
      if (!res.ok) {
        throw new Error("Failed to delete voice profile");
      }

      toast({
        title: "Success",
        description: "Voice profile deleted successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/voice-profiles"] });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to delete voice profile",
      });
    }
  };

  // Recorder Logic
  const startRecording = async () => {
    audioChunksRef.current = [];
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Microphone access denied:", err);
      toast({
        variant: "destructive",
        title: "Mic Access Required",
        description: "Please grant microphone permissions to record samples for voice cloning.",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // Stop all tracks to release microphone
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // Submit voice clone to backend
  const handleCloneVoice = async () => {
    if (!cloneName.trim()) {
      toast({
        variant: "destructive",
        title: "Required",
        description: "Please enter a voice profile name.",
      });
      return;
    }
    if (!audioBlob) {
      toast({
        variant: "destructive",
        title: "Required",
        description: "Please record or upload a voice sample first.",
      });
      return;
    }

    setIsCloning(true);
    try {
      const formData = new FormData();
      formData.append("name", cloneName);
      formData.append("provider", cloneProvider);
      formData.append("file", audioBlob, "recording.wav");

      const response = await fetch("/api/voice-profiles/clone", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Failed to clone voice");
      }

      const newProfile = await response.json();
      toast({
        title: "Success",
        description: `Voice cloned successfully as "${newProfile.name}".`,
      });

      setCloneName("");
      setAudioBlob(null);
      setAudioUrl(null);
      setIsRecordOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/voice-profiles"] });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Voice Cloning Failed",
        description: err.message || `Failed to clone voice on ${cloneProvider === "elevenlabs" ? "ElevenLabs" : "Sarvam.ai"}`,
      });
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 🚀 API Key Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Key className="w-5 h-5 mr-2 text-indigo-600" />
            Sarvam.ai Credentials
          </CardTitle>
          <CardDescription>
            Configure your Sarvam.ai subscription key to support Indic STT, TTS speech synthesis, and voice cloning in automated AI takeover nodes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 max-w-xl">
            <Input
              type="password"
              placeholder="Enter Sarvam Subscription Key (e.g. sk_...)"
              value={sarvamKey}
              onChange={(e) => setSarvamKey(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSaveApiKey} disabled={isSavingKey}>
              {isSavingKey ? "Saving..." : "Save Key"}
            </Button>
          </div>
          {(!user || !(user as any).sarvamApiKey) && (
            <div className="flex items-center text-amber-600 text-sm mt-3">
              <AlertCircle className="w-4 h-4 mr-1 shrink-0" />
              <span>Voice features are currently disabled. Please add a valid Sarvam subscription key.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🚀 Groq Credentials Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Key className="w-5 h-5 mr-2 text-indigo-600" />
            Groq API Credentials
          </CardTitle>
          <CardDescription>
            Configure your Groq API key to support high-speed Whisper STT transcription and fast LLM completions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 max-w-xl">
            <Input
              type="password"
              placeholder="Enter Groq API Key (e.g. gsk_...)"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSaveGroqKey} disabled={isSavingGroqKey}>
              {isSavingGroqKey ? "Saving..." : "Save Key"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 🚀 ElevenLabs Credentials Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Key className="w-5 h-5 mr-2 text-indigo-600" />
            ElevenLabs API Credentials
          </CardTitle>
          <CardDescription>
            Configure your ElevenLabs API key to support high-quality voice synthesis, Scribe STT, and custom voice cloning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 max-w-xl">
            <Input
              type="password"
              placeholder="Enter ElevenLabs API Key"
              value={elevenlabsKey}
              onChange={(e) => setElevenlabsKey(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSaveElevenlabsKey} disabled={isSavingElevenlabsKey}>
              {isSavingElevenlabsKey ? "Saving..." : "Save Key"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 📋 Voice Profiles List & Creation Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center">
              <Settings2 className="w-5 h-5 mr-2 text-indigo-600" />
              Manage Voice Profiles
            </CardTitle>
            <CardDescription>
              Assign cloned or standard voice profiles. You can select these profiles directly in the AI Agent takeover node inside the Flow Builder.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {/* 🎙️ Voice Clone Dialog Button */}
            <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <Mic className="w-4 h-4 mr-2 text-fuchsia-600" />
                  Clone Custom Voice
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Clone Custom Voice</DialogTitle>
                  <DialogDescription>
                    Record a clean, noise-free 15-60 second sample of your voice. The AI will learn and speak exactly like this sample.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 font-medium">Cloning Provider</label>
                    <Select value={cloneProvider} onValueChange={setCloneProvider}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sarvam">Sarvam.ai</SelectItem>
                        <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Voice Profile Name</label>
                    <Input
                      placeholder="e.g. CEO Cloned Voice, Support Helper"
                      value={cloneName}
                      onChange={(e) => setCloneName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500">Sample Script to Read</label>
                    <div className="p-3 bg-gray-50 rounded-md border text-sm text-gray-600 italic">
                      "Hello! This is a voice training script. I am recording my voice sample so that the automated CRM agent can speak to my customers in my voice. Please speak clearly, at a normal pace, and ensure there is no background noise."
                    </div>
                  </div>

                  {/* Recorder Panel */}
                  <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-gray-50">
                    {isRecording ? (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-3 h-3 bg-red-600 rounded-full animate-ping" />
                        <span className="text-sm font-semibold text-red-600">Recording... {recordDuration}s</span>
                        <Button variant="destructive" size="icon" onClick={stopRecording}>
                          <Square className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-3">
                        {!audioUrl ? (
                          <>
                            <span className="text-xs text-gray-500">Click to start recording microphone</span>
                            <Button variant="outline" className="rounded-full w-12 h-12 flex items-center justify-center bg-white shadow-sm border-indigo-200" onClick={startRecording}>
                              <Mic className="w-5 h-5 text-indigo-600" />
                            </Button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center space-y-2 w-full">
                            <span className="text-xs font-semibold text-green-600 flex items-center">
                              <Check className="w-4 h-4 mr-1" /> Voice sample recorded!
                            </span>
                            <div className="flex items-center gap-3 mt-1">
                              <Button size="icon" variant="outline" onClick={togglePlayback}>
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </Button>
                              <audio ref={audioPlayerRef} src={audioUrl} onEnded={handleAudioEnded} className="hidden" />
                              <Button size="sm" variant="ghost" className="text-xs text-red-500 hover:text-red-700" onClick={() => { setAudioUrl(null); setAudioBlob(null); }}>
                                Record Again
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsRecordOpen(false)}>Cancel</Button>
                  <Button onClick={handleCloneVoice} disabled={isCloning || !audioBlob || !cloneName.trim()}>
                    {isCloning ? "Cloning..." : "Submit & Clone"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* 🆕 Standard Voice Creation Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="flex items-center">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Standard Voice
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Predefined Speaker Voice</DialogTitle>
                  <DialogDescription>
                    Add a standard, pre-built speaker voice. No recording required.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 font-medium">Voice Name / Label</label>
                    <Input
                      placeholder="e.g. Hindi Female Support, English Pawan"
                      value={stdName}
                      onChange={(e) => setStdName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 font-medium">Voice Provider</label>
                    <Select value={stdProvider} onValueChange={(val) => {
                      setStdProvider(val);
                      if (val === "groq") {
                        setStdVoiceId("diana");
                      } else if (val === "elevenlabs") {
                        setStdVoiceId("21m00Tcm4TlvDq8ikWAM");
                      } else if (val === "openai") {
                        setStdVoiceId("alloy");
                      } else {
                        setStdVoiceId("anushka");
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sarvam">Sarvam.ai (Indian Languages)</SelectItem>
                        <SelectItem value="openai">OpenAI Audio (TTS-1)</SelectItem>
                        <SelectItem value="groq">Groq API (Whisper/Orpheus)</SelectItem>
                        <SelectItem value="elevenlabs">ElevenLabs (High Quality)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(stdProvider === "sarvam" || stdProvider === "elevenlabs") && stdVoiceId === "custom_speaker" && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 font-medium">Custom Speaker ID</label>
                      <Input
                        placeholder={`Paste your custom cloned Speaker ID from ${stdProvider === "elevenlabs" ? "ElevenLabs" : "Sarvam.ai"}`}
                        value={customSpeakerId}
                        onChange={(e) => setCustomSpeakerId(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 font-medium">Speaker Voice</label>
                      <Select value={stdVoiceId} onValueChange={setStdVoiceId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select speaker" />
                        </SelectTrigger>
                        <SelectContent>
                          {stdProvider === "groq"
                            ? GROQ_PREDEFINED_VOICES.map((v) => (
                                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                              ))
                            : stdProvider === "elevenlabs"
                            ? ELEVENLABS_PREDEFINED_VOICES.map((v) => (
                                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                              ))
                            : stdProvider === "openai"
                            ? OPENAI_PREDEFINED_VOICES.map((v) => (
                                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                              ))
                            : PREDEFINED_VOICES.map((v) => (
                                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                              ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 font-medium">Default Language</label>
                      <Select value={stdLanguage} onValueChange={setStdLanguage}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDIC_LANGUAGES.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost">Cancel</Button>
                  <Button onClick={handleCreateStandardVoice} disabled={isCreatingStd || !stdName.trim()}>
                    {isCreatingStd ? "Saving..." : "Add Voice Profile"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingProfiles ? (
            <div className="py-6 text-center text-sm text-gray-500">Loading voice profiles...</div>
          ) : voiceProfilesList.length === 0 ? (
            <div className="py-8 text-center text-sm border rounded-lg border-dashed bg-gray-50 text-gray-500">
              No voice profiles configured yet. Create a standard voice or clone a custom microphone sample to get started.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile Name</TableHead>
                    <TableHead>Voice Provider</TableHead>
                    <TableHead>Voice ID / Speaker</TableHead>
                    <TableHead>Default Language</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {voiceProfilesList.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-semibold text-gray-800">{profile.name}</TableCell>
                      <TableCell className="capitalize text-gray-600">{profile.provider}</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600">{profile.voiceId}</TableCell>
                      <TableCell className="text-gray-600">
                        {INDIC_LANGUAGES.find((l) => l.code === profile.languageCode)?.name || profile.languageCode}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteVoiceProfile(profile.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
