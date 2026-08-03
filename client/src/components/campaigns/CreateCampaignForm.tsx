import { ReactNode, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { Info, FileText, Clock, Eye, Check, Upload, Loader2, Smile, Wrench } from "lucide-react";
import { TemplatePickerDialog, getTemplateButtons } from "@/components/shared/TemplatePickerDialog";
import { MediaGalleryDialog } from "@/components/media/MediaGalleryDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const POPULAR_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", 
  "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", 
  "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", 
  "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", 
  "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", 
  "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", 
  "💀", "☠️", "👽", "👾", "🤖", "🎃", "👋", "👌", "✌️", "👍", "👎", "👏", "🙌", "🙏", "✍️", "💪", 
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", 
  "🚀", "🚨", "🔥", "✨", "🎉", "📢", "💬", "📩", "📅", "✅", "❌", "⚠️", "💡", "💰", "📞", "⭐", 
  "🌟", "📌", "📍", "🎯", "📈", "📉", "🏆", "🎁", "🛍️", "🛒", "💻", "📱", "💼", "✉️", "🔑"
];

interface CreateCampaignFormProps {
  onSubmit: (formData: any) => void;
  templates: any[];
  selectedTemplate: any;
  setSelectedTemplate: (template: any) => void;
  variableMapping: Record<string, string>;
  setVariableMapping: (mapping: Record<string, string>) => void;
  extractTemplateVariables: (template: any) => string[];
  scheduledTime: string;
  setScheduledTime: (time: string) => void;
  autoRetry: boolean;
  setAutoRetry: (retry: boolean) => void;
  isCreating: boolean;
  onCancel?: () => void;
  children: ReactNode;
  requiresHeaderImage: boolean;
  setRequiresHeaderImage: (v: boolean) => void;
  uploadedMediaId: string | null;
  setUploadedMediaId: (id: string | null) => void;
  channelId?: string;
  messagingLimit?: number | null;
  messagingTier?: string;
  connectionMethod?: string;
}

export function CreateCampaignForm({
  onSubmit,
  templates,
  selectedTemplate,
  setSelectedTemplate,
  variableMapping,
  setVariableMapping,
  extractTemplateVariables,
  scheduledTime,
  setScheduledTime,
  autoRetry,
  setAutoRetry,
  isCreating,
  onCancel,
  children,
  requiresHeaderImage,
  setRequiresHeaderImage,
  uploadedMediaId,
  setUploadedMediaId,
  channelId,
  messagingLimit,
  messagingTier,
  connectionMethod,
}: CreateCampaignFormProps) {
  const [templateConfig, setTemplateConfig] = useState<{
    variables: { type?: string; value?: string }[];
    mediaId?: string;
    headerType?: string | null;
    buttonParameters?: string[];
    expirationTimeMs?: number;
    carouselCardMediaIds?: Record<number, string>;
  } | null>(null);

  const [optimizeCampaignToUtility, setOptimizeCampaignToUtility] = useState(false);
  const [enableChunking, setEnableChunking] = useState(connectionMethod === "qr_code");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringIntervalType, setRecurringIntervalType] = useState<"8" | "24" | "48" | "custom">("24");
  const [customIntervalHours, setCustomIntervalHours] = useState(24);
  const [recurringIterations, setRecurringIterations] = useState(3);
  const { user, userPlans } = useAuth();

  const utilityCategoryHelperEnabled = useMemo(() => {
    return user?.role === "superadmin" || userPlans?.data?.some(
      (d: any) => d.subscription?.status === "active" && d.subscription?.planData?.permissions?.utilityCategoryHelperEnabled === "true"
    );
  }, [user, userPlans]);

  const isQr = connectionMethod === "qr_code";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // QR Custom fields states
  const [customMessage, setCustomMessage] = useState("");

  const insertEmoji = (emoji: string) => {
    const textarea = document.getElementById("customMessageTextarea") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newValue = text.substring(0, start) + emoji + text.substring(end);
    setCustomMessage(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaMimeType, setMediaMimeType] = useState("");
  const [mediaName, setMediaName] = useState("");
  const [delayBetweenMessages, setDelayBetweenMessages] = useState(connectionMethod === "qr_code" ? 3 : 0);
  const [chunkSize, setChunkSize] = useState(connectionMethod === "qr_code" ? 100 : 500);
  const [delayBetweenChunks, setDelayBetweenChunks] = useState(5);
  const [warmerEnabled, setWarmerEnabled] = useState(false);
  const [selectedWarmerMsgs, setSelectedWarmerMsgs] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  // Fetch local QR templates
  const { data: localTemplates } = useQuery({
    queryKey: ["/api/templates", { channelId }],
    queryFn: async () => {
      if (!channelId) return [];
      const res = await fetch(`/api/templates?channelId=${channelId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!channelId && isQr,
  });

  // Fetch warmer messages for channel
  const { data: warmerData } = useQuery({
    queryKey: ["/api/whatsapp/warmer", channelId],
    queryFn: async () => {
      if (!channelId) return null;
      const response = await fetch(`/api/whatsapp/warmer/${channelId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!channelId && isQr,
  });

  const { data: customVariables = [] } = useQuery<string[]>({
    queryKey: ["/api/contacts/custom-variables"],
    queryFn: async () => {
      const response = await fetch("/api/contacts/custom-variables");
      if (!response.ok) return [];
      return response.json();
    },
  });

  const handleFileChange = async (file: File) => {
    // Determine maximum file size based on mime type
    let maxSize = 100 * 1024 * 1024; // Default to 100MB for docs
    let typeName = "document";
    let sizeLabel = "100MB";

    if (file.type.startsWith("image/")) {
      maxSize = 5 * 1024 * 1024; // 5MB
      typeName = "image";
      sizeLabel = "5MB";
    } else if (file.type.startsWith("video/")) {
      maxSize = 16 * 1024 * 1024; // 16MB
      typeName = "video";
      sizeLabel = "16MB";
    } else if (file.type.startsWith("audio/")) {
      maxSize = 16 * 1024 * 1024; // 16MB
      typeName = "audio";
      sizeLabel = "16MB";
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `The maximum file size allowed for ${typeName} is ${sizeLabel}. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setMediaUrl(data.url);
      setMediaName(data.name);
      setMediaMimeType(data.mimeType);
    } catch (err) {
      console.error(err);
      toast({
        title: "Upload failed",
        description: "Failed to upload media file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const insertFormatting = (tagOpen: string, tagClose: string) => {
    const textarea = document.getElementById("customMessageTextarea") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = tagOpen + selected + tagClose;
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setCustomMessage(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selected.length);
    }, 0);
  };

  const renderPreviewText = (htmlText: string) => {
    let text = htmlText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // HTML tags translation
    text = text
      .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/gi, "<strong>$1</strong>")
      .replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/gi, "<strong>$1</strong>")
      .replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/gi, "<em>$1</em>")
      .replace(/&lt;em&gt;(.*?)&lt;\/em&gt;/gi, "<em>$1</em>")
      .replace(/&lt;del&gt;(.*?)&lt;\/del&gt;/gi, "<del>$1</del>")
      .replace(/&lt;code[^&gt;]*&gt;(.*?)&lt;\/code&gt;/gi, "<code class='bg-gray-100 px-1 py-0.5 rounded text-xs font-mono'>$1</code>")
      .replace(/&lt;br\s*\/?&gt;/gi, "<br/>");

    // Markdown tags translation
    text = text
      .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
      .replace(/_(.*?)_/g, "<em>$1</em>")
      .replace(/~(.*?)~/g, "<del>$1</del>")
      .replace(/```(.*?)```/g, "<code class='bg-gray-100 px-1 py-0.5 rounded text-xs font-mono'>$1</code>");

    text = text.replace(/\n/g, "<br/>");

    text = text.replace(/\{\{\s*name\s*\}\}/gi, "<span class='bg-green-100 text-green-800 px-1 rounded text-[11px] font-semibold'>Contact Name</span>");
    text = text.replace(/\{\{\s*phone\s*\}\}/gi, "<span class='bg-green-100 text-green-800 px-1 rounded text-[11px] font-semibold'>Phone Number</span>");

    if (Array.isArray(customVariables)) {
      customVariables.forEach((cVar) => {
        const regex = new RegExp(`\\{\\{\\s*${cVar.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*\\}\\}`, "gi");
        text = text.replace(regex, `<span class='bg-blue-100 text-blue-800 px-1 rounded text-[11px] font-semibold'>${cVar}</span>`);
      });
    }

    return <div dangerouslySetInnerHTML={{ __html: text }} className="break-words text-[13.5px] leading-relaxed text-gray-800" />;
  };

  const buildVariableMapping = () => {
    if (!templateConfig) return variableMapping;

    const mapping: Record<string, any> = {};

    if (templateConfig.variables) {
      templateConfig.variables.forEach((v, i) => {
        if (optimizeCampaignToUtility && v.type === "custom" && v.value) {
          const randRef = Math.floor(100000 + Math.random() * 900000);
          mapping[String(i + 1)] = {
            ...v,
            value: `${v.value} (Ref: ${randRef})`
          };
        } else {
          mapping[String(i + 1)] = v;
        }
      });
    }

    if (templateConfig.buttonParameters && templateConfig.buttonParameters.length > 0) {
      const buttonsMap: Record<number, { type: string; value: string }> = {};
      const allButtons = selectedTemplate ? getTemplateButtons(selectedTemplate) : [];
      let paramIdx = 0;
      allButtons.forEach((btn, idx) => {
        if (btn.type === "COPY_CODE" || (btn.type === "URL" && btn.url?.includes("{{"))) {
          buttonsMap[idx] = { type: "custom", value: templateConfig.buttonParameters![paramIdx] || "" };
          paramIdx++;
        }
      });
      mapping.buttons = buttonsMap;
    }

    if (templateConfig.mediaId) {
      mapping.uploadedMediaId = templateConfig.mediaId;
    }
    if (templateConfig.headerType) {
      mapping.headerType = templateConfig.headerType;
    }
    if (templateConfig.expirationTimeMs) {
      mapping.expirationTimeMs = templateConfig.expirationTimeMs;
    }
    if (templateConfig.carouselCardMediaIds && Object.keys(templateConfig.carouselCardMediaIds).length > 0) {
      mapping.carouselCardMediaIds = Object.fromEntries(
        Object.entries(templateConfig.carouselCardMediaIds).map(([k, v]) => [String(k), v])
      );
    }

    return mapping;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const finalChunkSize = enableChunking ? chunkSize : 999999;
    const finalDelayBetweenMessages = enableChunking ? delayBetweenMessages : 0;
    const finalDelayBetweenChunks = enableChunking ? delayBetweenChunks : 0;

    const campaignData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      variableMapping: isQr ? {} : buildVariableMapping(),
      delayBetweenMessages: finalDelayBetweenMessages,
      chunkSize: finalChunkSize,
      delayBetweenChunks: finalDelayBetweenChunks,
      isRecurring: isRecurring,
      recurringInterval: isRecurring ? (recurringIntervalType === "custom" ? customIntervalHours : parseInt(recurringIntervalType)) : null,
      recurringIterations: isRecurring ? recurringIterations : null,
      ...(isQr ? {
        customMessage,
        mediaUrl: mediaUrl || null,
        mediaMimeType: mediaMimeType || null,
        mediaName: mediaName || null,
        warmerEnabled,
        selectedWarmerMessages: selectedWarmerMsgs,
      } : {})
    };

    if (isQr && saveAsTemplate && newTemplateName.trim()) {
      try {
        const response = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newTemplateName.trim(),
            category: "MARKETING",
            body: customMessage,
            channelId: channelId,
            mediaType: mediaUrl ? "IMAGE" : "TEXT",
            mediaUrl: mediaUrl || undefined,
          })
        });
        if (response.ok) {
          toast({
            title: "Template Saved",
            description: `Template "${newTemplateName.trim()}" successfully saved.`,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/templates", { channelId }] });
        } else {
          const errData = await response.json();
          toast({
            title: "Error saving template",
            description: errData.message || "Failed to save template.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Failed to save template:", err);
      }
    }

    onSubmit(campaignData);
  };

  const handleSelectTemplate = (
    template: any,
    variables: { type?: string; value?: string }[],
    mediaId?: string,
    headerType?: string | null,
    buttonParameters?: string[],
    expirationTimeMs?: number,
    carouselCardMediaIds?: Record<number, string>,
  ) => {
    setSelectedTemplate(template);
    setTemplateConfig({
      variables,
      mediaId,
      headerType,
      buttonParameters,
      expirationTimeMs,
      carouselCardMediaIds,
    });
    if (mediaId) {
      setUploadedMediaId(mediaId);
    }
    setRequiresHeaderImage(
      !!headerType && ["image", "video", "document"].includes(headerType)
    );
  };



  return (
    <form onSubmit={handleSubmit} className="space-y-5 mt-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Campaign Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="name">Campaign Name</Label>
            <Input id="name" name="name" required placeholder="e.g. Summer Sale Announcement" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="Campaign objectives and notes..." rows={2} />
          </div>
        </CardContent>
      </Card>

      {!isQr ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <TemplatePickerDialog
                channelId={channelId}
                onSelectTemplate={handleSelectTemplate}
                submitLabel="Use Template"
                categoryFilter={utilityCategoryHelperEnabled ? undefined : "MARKETING"}
                trigger={
                  <Button type="button" variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    {selectedTemplate ? "Change Template" : "Select Template"}
                  </Button>
                }
              />
              {selectedTemplate && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <Check className="h-4 w-4" />
                  <span className="font-medium">{selectedTemplate.name}</span>
                </div>
              )}
            </div>

            {selectedTemplate && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
                {selectedTemplate.headerType === "text" && selectedTemplate.headerText && (
                  <div className="font-semibold text-sm">{selectedTemplate.headerText}</div>
                )}
                <div className="whitespace-pre-wrap text-sm">{selectedTemplate.body}</div>
                {selectedTemplate.footerText && (
                  <div className="text-xs text-muted-foreground">{selectedTemplate.footerText}</div>
                )}
                {templateConfig && (
                  <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                    {templateConfig.variables.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {templateConfig.variables.length} variable(s) configured
                      </p>
                    )}
                    {templateConfig.mediaId && (
                      <p className="text-xs text-green-600">Header media uploaded</p>
                    )}
                    {templateConfig.buttonParameters && templateConfig.buttonParameters.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {templateConfig.buttonParameters.length} button parameter(s) set
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Utility Campaign Optimizer & Tips */}
            {utilityCategoryHelperEnabled && !isQr && selectedTemplate && (
              <div className="space-y-3 p-4 rounded-xl border border-blue-200 bg-blue-50/50 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-blue-600 animate-pulse" />
                    <h4 className="text-sm font-semibold text-blue-900">
                      Utility Campaign Optimizer
                    </h4>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                    Premium Active
                  </Badge>
                </div>

                <div className="flex items-start space-x-2.5 bg-white/60 p-3 rounded-lg border border-blue-100">
                  <Checkbox
                    id="optimizeCampaignToUtility"
                    checked={optimizeCampaignToUtility}
                    onCheckedChange={(checked) => setOptimizeCampaignToUtility(!!checked)}
                    className="mt-0.5"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="optimizeCampaignToUtility" className="text-xs font-semibold text-blue-900 cursor-pointer">
                      Auto-Optimize Variables for Utility Category
                    </Label>
                    <p className="text-[11px] text-blue-700">
                      System will automatically append reference numbers (e.g. <code>Ref: 837194</code>) to custom variable values to align with Meta's automated utility classification.
                    </p>
                  </div>
                </div>

                {/* Utility category tips */}
                <div className="space-y-1.5 bg-white/40 p-3 rounded-lg border border-blue-50 text-[11px] text-blue-800">
                  <h5 className="font-semibold text-blue-900 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-blue-600" />
                    Tips to keep campaigns in Utility Category:
                  </h5>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Avoid Marketing Words:</strong> Do not use discount, sale, promo, buy, or shop in your custom inputs.</li>
                    <li><strong>Make it Transactional:</strong> Make the message look like an update, receipt, or status notification.</li>
                    <li><strong>Unique Identifiers:</strong> Make sure you map transaction/reference IDs to variables where possible.</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Composer Card */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                Message Composer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
              {/* Media Upload Section */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-gray-700 block">Header Media File (Optional)</Label>
                <div className="flex flex-col md:flex-row gap-3 items-stretch">
                  <div 
                    onClick={() => setShowMediaGallery(true)}
                    className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg p-4 bg-gray-50/50 hover:bg-purple-50/30 hover:border-purple-300 cursor-pointer transition min-h-[100px]"
                  >
                    <div className="flex flex-col items-center text-center gap-1.5">
                      {isUploading ? (
                        <>
                          <Loader2 className="h-6 w-6 text-purple-600 animate-spin" />
                          <span className="text-xs font-medium text-gray-600">Uploading file...</span>
                        </>
                      ) : mediaUrl ? (
                        <>
                          <Check className="h-6 w-6 text-purple-600" />
                          <span className="text-xs font-semibold text-gray-800 max-w-[150px] truncate">{mediaName || "File uploaded"}</span>
                          <span className="text-[10px] text-gray-500">Click to change</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-gray-400" />
                          <span className="text-xs font-semibold text-purple-700">Open Media Gallery</span>
                          <span className="text-[10px] text-gray-500">Select or upload (Max 100MB)</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="mediaUrlInput" className="text-[11px] font-medium text-gray-500">Or Media URL directly</Label>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-[10px] text-purple-600 hover:text-purple-700 font-semibold"
                          onClick={() => setShowMediaGallery(true)}
                        >
                          Choose from Gallery
                        </Button>
                      </div>
                      <Input
                        id="mediaUrlInput"
                        placeholder="https://example.com/image.jpg"
                        value={mediaUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMediaUrl(val);
                          if (!val) {
                            setMediaMimeType("");
                            setMediaName("");
                          } else {
                            const ext = val.split("?")[0].split(".").pop()?.toLowerCase();
                            let guessedMime = "image/jpeg";
                            if (ext === "png") guessedMime = "image/png";
                            else if (ext === "gif") guessedMime = "image/gif";
                            else if (ext === "mp4") guessedMime = "video/mp4";
                            else if (ext === "pdf") guessedMime = "application/pdf";
                            else if (ext === "doc" || ext === "docx") guessedMime = "application/msword";
                            setMediaMimeType(guessedMime);
                            setMediaName(val.substring(val.lastIndexOf("/") + 1));
                          }
                        }}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    {mediaUrl && (
                      <div className="flex items-center justify-between text-xs text-gray-500 border rounded px-2.5 py-1 bg-gray-50">
                        <span className="truncate max-w-[120px] font-medium">{mediaName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setMediaUrl("");
                            setMediaName("");
                            setMediaMimeType("");
                          }}
                          className="text-red-500 hover:text-red-700 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Text composer */}
              <div className="space-y-2 mt-2">
                {isQr && localTemplates && localTemplates.length > 0 && (
                  <div className="mb-3">
                    <Label className="text-xs font-semibold text-gray-700 block mb-1">Apply Saved QR Template</Label>
                    <Select
                      onValueChange={(val) => {
                        const selected = localTemplates.find((t: any) => t.id === val);
                        if (selected) {
                          setCustomMessage(selected.body);
                          if (selected.mediaUrl) {
                            setMediaUrl(selected.mediaUrl);
                            setMediaName("Template Attachment");
                            setMediaMimeType("image/png");
                          } else {
                            setMediaUrl("");
                            setMediaName("");
                            setMediaMimeType("");
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select a template to auto-fill..." />
                      </SelectTrigger>
                      <SelectContent>
                        {localTemplates.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label htmlFor="customMessageTextarea" className="text-xs font-semibold text-gray-700">Message Body</Label>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-1.5"
                      onClick={() => insertFormatting("<b>", "</b>")}
                    >
                      Bold
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-1.5"
                      onClick={() => insertFormatting("<i>", "</i>")}
                    >
                      Italic
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-1.5"
                      onClick={() => insertFormatting("<del>", "</del>")}
                    >
                      Strike
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-1.5"
                      onClick={() => insertFormatting("<code>", "</code>")}
                    >
                      Mono
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-1.5 flex items-center gap-1"
                        >
                          <Smile className="w-3 h-3 text-purple-600" /> Emojis
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" align="end">
                        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                          {POPULAR_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => insertEmoji(emoji)}
                              className="text-lg p-1 hover:bg-purple-100 rounded transition-colors text-center"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Textarea
                  id="customMessageTextarea"
                  rows={5}
                  placeholder="Compose message..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="font-sans text-xs resize-none"
                />
                <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                  💡 <strong>Tip:</strong> Use contact variables by writing their column/field names inside double brackets (e.g. <code>{"{{name}}"}</code>, <code>{"{{phone}}"}</code>, <code>{"{{company}}"}</code>, or <code>{"{{city}}"}</code>).
                </p>

                {isQr && (
                  <>
                    <div className="flex items-center space-x-2 mt-3 p-2 bg-gray-50 border border-gray-100 rounded-md">
                      <Checkbox
                        id="saveAsTemplateCheckbox"
                        checked={saveAsTemplate}
                        onCheckedChange={(checked) => setSaveAsTemplate(!!checked)}
                      />
                      <Label htmlFor="saveAsTemplateCheckbox" className="text-xs font-medium text-gray-600 cursor-pointer">
                        Save this message as a QR template
                      </Label>
                    </div>

                    {saveAsTemplate && (
                      <div className="mt-2 space-y-1">
                        <Label htmlFor="newTemplateNameInput" className="text-xs font-semibold text-gray-700">Template Name</Label>
                        <Input
                          id="newTemplateNameInput"
                          placeholder="e.g. welcome_message"
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-1.5 hover:bg-green-50 hover:text-green-700"
                    onClick={() => {
                      const textarea = document.getElementById("customMessageTextarea") as HTMLTextAreaElement;
                      if (!textarea) return;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const text = textarea.value;
                      const replacement = "{{name}}";
                      const newValue = text.substring(0, start) + replacement + text.substring(end);
                      setCustomMessage(newValue);
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + replacement.length, start + replacement.length);
                      }, 0);
                    }}
                  >
                    + Name
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-1.5 hover:bg-green-50 hover:text-green-700"
                    onClick={() => {
                      const textarea = document.getElementById("customMessageTextarea") as HTMLTextAreaElement;
                      if (!textarea) return;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const text = textarea.value;
                      const replacement = "{{phone}}";
                      const newValue = text.substring(0, start) + replacement + text.substring(end);
                      setCustomMessage(newValue);
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + replacement.length, start + replacement.length);
                      }, 0);
                    }}
                  >
                    + Phone
                  </Button>
                  {customVariables.map((cVar) => (
                    <Button
                      key={cVar}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-1.5 hover:bg-green-50 hover:text-green-700"
                      onClick={() => {
                        const textarea = document.getElementById("customMessageTextarea") as HTMLTextAreaElement;
                        if (!textarea) return;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;
                        const replacement = `{{${cVar}}}`;
                        const newValue = text.substring(0, start) + replacement + text.substring(end);
                        setCustomMessage(newValue);
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + replacement.length, start + replacement.length);
                        }, 0);
                      }}
                    >
                      + {cVar.charAt(0).toUpperCase() + cVar.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Preview Card */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-start">
              <div 
                className="bg-[#efeae2] border rounded-lg p-4 flex flex-col justify-between min-h-[220px] font-sans relative overflow-hidden" 
                style={{ 
                  backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                  backgroundSize: "cover"
                }}
              >
                <div className="bg-white/95 backdrop-blur-sm self-start rounded-lg rounded-tl-none p-2.5 shadow-sm max-w-[85%] relative border border-gray-100">
                  {mediaUrl && (
                    <div className="mb-2 rounded overflow-hidden max-h-[140px] bg-gray-100 border flex items-center justify-center">
                      {mediaMimeType?.startsWith("image/") ? (
                        <img src={encodeURI(mediaUrl)} alt="Header Preview" className="w-full h-full object-cover max-h-[140px]" />
                      ) : mediaMimeType?.startsWith("video/") ? (
                        <video src={encodeURI(mediaUrl)} className="w-full h-full object-cover max-h-[140px]" controls />
                      ) : (
                        <div className="flex items-center gap-2 p-3 text-xs text-gray-600 w-full">
                          <FileText className="h-6 w-6 text-blue-500 shrink-0" />
                          <div className="truncate flex-1">
                            <p className="font-semibold truncate text-[11px]">{mediaName || "Document"}</p>
                            <p className="text-[9px] text-gray-500 truncate">{mediaMimeType || "application/pdf"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {customMessage ? renderPreviewText(customMessage) : <span className="text-gray-400 text-xs italic">Type a message to preview...</span>}
                  <div className="text-[9px] text-gray-400 text-right mt-1 flex items-center justify-end gap-0.5">
                    <span>12:00 PM</span>
                    <Check className="h-3 w-3 text-blue-500" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {(isQr || (utilityCategoryHelperEnabled && selectedTemplate)) && (
        <>
          {/* Anti-ban / Rate Limit Optimization Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {isQr ? (
                    <>
                      <Clock className="h-4 w-4 text-amber-500" />
                      Anti-Ban & Speed Optimization
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4 text-blue-600 animate-pulse" />
                      Rate Limit & Delivery Spacing Optimizer
                    </>
                  )}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableChunkingToggle"
                    checked={enableChunking}
                    onCheckedChange={(checked) => setEnableChunking(!!checked)}
                  />
                  <Label htmlFor="enableChunkingToggle" className="text-xs font-semibold cursor-pointer text-gray-700">
                    Enable Spaced Sending (Batches/Chunks)
                  </Label>
                </div>
              </div>
            </CardHeader>
            {enableChunking && (
              <CardContent className="transition-all duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="delayBetweenMessages" className="text-xs font-semibold text-gray-700">
                      Delay Between Messages (Sec)
                    </Label>
                    <Input
                      id="delayBetweenMessages"
                      type="number"
                      min={0}
                      value={delayBetweenMessages}
                      onChange={(e) => setDelayBetweenMessages(Math.max(0, parseInt(e.target.value) || 0))}
                      className="mt-1 h-9 text-xs"
                    />
                    <span className="text-[10px] text-gray-500">
                      {isQr ? "Wait between messages. Default 3s." : "Wait between API calls. Set 0s for instant."}
                    </span>
                  </div>
                  <div>
                    <Label htmlFor="chunkSize" className="text-xs font-semibold text-gray-700">
                      {isQr ? "Chunk Size (Messages)" : "Batch Size (Messages)"}
                    </Label>
                    <Input
                      id="chunkSize"
                      type="number"
                      min={1}
                      value={chunkSize}
                      onChange={(e) => setChunkSize(Math.max(1, parseInt(e.target.value) || 1))}
                      className="mt-1 h-9 text-xs"
                    />
                    <span className="text-[10px] text-gray-500">
                      {isQr ? "Batch size before long pause. Default 100." : "Messages per batch. Default 500."}
                    </span>
                  </div>
                  <div>
                    <Label htmlFor="delayBetweenChunks" className="text-xs font-semibold text-gray-700">
                      {isQr ? "Delay Between Chunks (Min)" : "Delay Between Batches (Min)"}
                    </Label>
                    <Input
                      id="delayBetweenChunks"
                      type="number"
                      min={0}
                      value={delayBetweenChunks}
                      onChange={(e) => setDelayBetweenChunks(Math.max(0, parseInt(e.target.value) || 0))}
                      className="mt-1 h-9 text-xs"
                    />
                    <span className="text-[10px] text-gray-500">
                      {isQr ? "Pause duration between batches. Default 5m." : "Pause time between batches. Set 0m to disable."}
                    </span>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Warmer messages Setup */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Anti-Spam</Badge>
                  Message Warmer Setup
                </span>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="warmerEnabled"
                    checked={warmerEnabled}
                    onCheckedChange={(checked) => {
                      const isChecked = !!checked;
                      setWarmerEnabled(isChecked);
                      if (isChecked && warmerData?.messages) {
                        setSelectedWarmerMsgs(warmerData.messages.map((m: any) => m.messageText));
                      }
                    }}
                  />
                  <Label htmlFor="warmerEnabled" className="text-xs font-semibold cursor-pointer">
                    Enable Warmer Interleaving
                  </Label>
                </div>
              </CardTitle>
            </CardHeader>
            {warmerEnabled && (
              <CardContent className="space-y-3 pt-0">
                <p className="text-xs text-muted-foreground">
                  Interleaves random conversational "warmer" messages to other contacts in your database during execution to reduce spam flags.
                </p>
                {warmerData?.messages && warmerData.messages.length > 0 ? (
                  <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto bg-gray-50/50">
                    <div className="flex items-center justify-between pb-2 border-b text-xs font-semibold text-gray-500">
                      <span>Select Warmer Messages to Use</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedWarmerMsgs.length === warmerData.messages.length) {
                            setSelectedWarmerMsgs([]);
                          } else {
                            setSelectedWarmerMsgs(warmerData.messages.map((m: any) => m.messageText));
                          }
                        }}
                        className="text-green-600 hover:text-green-700 text-[11px]"
                      >
                        {selectedWarmerMsgs.length === warmerData.messages.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    {warmerData.messages.map((msg: any) => {
                      const isSelected = selectedWarmerMsgs.includes(msg.messageText);
                      return (
                        <div key={msg.id} className="flex items-start space-x-2 py-1.5">
                          <Checkbox
                            id={`warmer-msg-${msg.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedWarmerMsgs([...selectedWarmerMsgs, msg.messageText]);
                              } else {
                                setSelectedWarmerMsgs(selectedWarmerMsgs.filter((m) => m !== msg.messageText));
                              }
                            }}
                            className="mt-0.5"
                          />
                          <Label htmlFor={`warmer-msg-${msg.id}`} className="text-xs font-normal leading-tight text-gray-700 cursor-pointer">
                            {msg.messageText}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3 text-xs flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      No warmer messages configured for this channel. Go to <strong>Channel Settings &gt; Warmer Settings</strong> to add messages, or we will use standard fallback greetings.
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </>
      )}

      {messagingLimit != null && !isQr && (
        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Your channel's WhatsApp messaging limit is{" "}
            <strong>
              {messagingLimit === Infinity
                ? "Unlimited"
                : messagingLimit.toLocaleString()}
            </strong>
            {messagingLimit !== Infinity ? " messages per 24 hours" : ""}
            {messagingTier ? ` (${messagingTier})` : ""}.
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Scheduling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="scheduledTime">Schedule Campaign (Optional)</Label>
            <Input
              id="scheduledTime"
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoRetry"
              checked={autoRetry}
              onCheckedChange={(checked) => setAutoRetry(!!checked)}
            />
            <Label htmlFor="autoRetry" className="font-normal text-sm">
              Enable auto-retry for failed messages
            </Label>
          </div>

            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(!!checked)}
                />
                <Label htmlFor="isRecurring" className="font-normal text-sm cursor-pointer">
                  Repeat/Schedule campaign on a recurring basis
                </Label>
              </div>

              {isRecurring && (
                <div className="space-y-3 pl-6 pt-1 transition-all duration-200">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Recurring Interval</Label>
                    <div className="flex gap-2">
                      {(["8", "24", "48", "custom"] as const).map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          variant={recurringIntervalType === preset ? "default" : "outline"}
                          size="sm"
                          className="h-8 text-xs px-3"
                          onClick={() => setRecurringIntervalType(preset)}
                        >
                          {preset === "custom" ? "Custom Hours" : `${preset} Hours`}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {recurringIntervalType === "custom" && (
                    <div>
                      <Label htmlFor="customIntervalHours" className="text-xs font-semibold text-gray-700">
                        Custom Interval (Hours)
                      </Label>
                      <Input
                        id="customIntervalHours"
                        type="number"
                        min={1}
                        value={customIntervalHours}
                        onChange={(e) => setCustomIntervalHours(Math.max(1, parseInt(e.target.value) || 1))}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="recurringIterations" className="text-xs font-semibold text-gray-700">
                      Iterations Limit (Max 20, Default 3)
                    </Label>
                    <Input
                      id="recurringIterations"
                      type="number"
                      min={1}
                      max={20}
                      value={recurringIterations}
                      onChange={(e) => setRecurringIterations(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                      className="mt-1 h-9 text-xs"
                    />
                    <span className="text-[10px] text-gray-500 block">
                      The campaign will run a total of {recurringIterations} times at the selected interval.
                    </span>
                  </div>
                </div>
              )}
            </div>
        </CardContent>
      </Card>

      {children}

      <MediaGalleryDialog
        open={showMediaGallery}
        onOpenChange={setShowMediaGallery}
        onSelect={(url, name) => {
          setMediaUrl(url);
          setMediaName(name);
          const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
          let guessedMime = "image/jpeg";
          if (ext === "png") guessedMime = "image/png";
          else if (ext === "gif") guessedMime = "image/gif";
          else if (ext === "mp4") guessedMime = "video/mp4";
          else if (ext === "pdf") guessedMime = "application/pdf";
          setMediaMimeType(guessedMime);
        }}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={
            user?.username === 'demouser' 
              ? true 
              : isCreating || (!isQr && !selectedTemplate)
          }
        >
          {scheduledTime ? "Schedule Campaign" : "Start Campaign"}
        </Button>
      </div>
    </form>
  );
}
