import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Calendar as CalendarIcon, Clock, Users, Settings, Plus, Trash, Edit, RefreshCw, 
  FileText, CheckCircle, ExternalLink, Download, FileSpreadsheet, Sparkles, 
  UserCheck, Shield, Phone, Mail, Image as ImageIcon, Briefcase, ChevronRight, 
  Check, CreditCard, MessageSquare, Bot, UserPlus, Shuffle, Bell, RotateCcw,
  Percent, Flame, AlertCircle, PhoneCall, Key, Mic, Volume2, Send, Activity, Globe
} from "lucide-react";
import { useChannelContext } from "@/contexts/channel-context";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaGalleryDialog } from "@/components/media/MediaGalleryDialog";
import { ChannelSwitcher } from "@/components/channel-switcher";

export const COMMON_TIMEZONES = [
  { value: "Asia/Kolkata", label: "India Standard Time (IST, UTC+5:30)" },
  { value: "Asia/Riyadh", label: "Saudi Arabia (AST, UTC+3:00)" },
  { value: "Asia/Dubai", label: "UAE / Gulf (GST, UTC+4:00)" },
  { value: "Asia/Kuwait", label: "Kuwait (AST, UTC+3:00)" },
  { value: "Asia/Qatar", label: "Qatar (AST, UTC+3:00)" },
  { value: "Asia/Bahrain", label: "Bahrain (AST, UTC+3:00)" },
  { value: "Asia/Muscat", label: "Oman (GST, UTC+4:00)" },
  { value: "Africa/Cairo", label: "Egypt (EEST, UTC+3:00)" },
  { value: "Europe/London", label: "London / UK (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European Time (CET/CEST, UTC+1/2)" },
  { value: "America/New_York", label: "US Eastern Time (EST/EDT, UTC-5/4)" },
  { value: "America/Chicago", label: "US Central Time (CST/CDT, UTC-6/5)" },
  { value: "America/Denver", label: "US Mountain Time (MST/MDT, UTC-7/6)" },
  { value: "America/Los_Angeles", label: "US Pacific Time (PST/PDT, UTC-8/7)" },
  { value: "Asia/Singapore", label: "Singapore (SGT, UTC+8:00)" },
  { value: "Asia/Tokyo", label: "Japan (JST, UTC+9:00)" },
  { value: "Australia/Sydney", label: "Sydney (AEST, UTC+10:00)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
];

interface ServiceMessage {
  id: string;
  text: string;
  mediaType: "none" | "image" | "video" | "audio" | "document";
  mediaUrl: string;
  sortOrder: number;
}

interface Service {
  id: string;
  name: string;
  categoryId?: string | null;
  price: string;
  durationMinutes: number;
  description?: string | null;
  longDescription?: string | null;
  photos: string[];
  serviceMessages?: ServiceMessage[];
  triggerKeyword?: string | null;
  isTriggerEnabled: boolean;
  currency?: string;
  isActive: boolean;
  createdAt: string;
}

interface ServiceCategory {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
}

interface ServiceMaster {
  id: string;
  name: string;
  title: string;
  bio?: string | null;
  photoUrl?: string | null;
  serviceIds: string[];
  workingHours?: {
    days?: number[];
    startTime?: string;
    endTime?: string;
    breakStartTime?: string;
    breakEndTime?: string;
  };
  slotIntervalMinutes: number;
  timezone?: string | null;
  isActive: boolean;
}

interface ServiceBooking {
  id: string;
  bookingNumber: string;
  customerPhone: string;
  customerName?: string | null;
  serviceName: string;
  masterName?: string | null;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalAmount: string;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  notes?: string | null;
  createdAt: string;
}

interface AbandonedBooking {
  id: string;
  customerPhone: string;
  customerName?: string | null;
  serviceName?: string | null;
  servicePrice?: string | null;
  masterName?: string | null;
  bookingDate?: string | null;
  selectedSlot?: string | null;
  currentStep: string;
  status: string;
  followupCount: number;
  followup1SentAt?: string | null;
  followup2SentAt?: string | null;
  createdAt: string;
}

const DEFAULT_DAYS = [
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
  { day: 0, label: "Sun" },
];

export default function ServiceBookingLedger() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeChannel } = useChannelContext();
  const channelId = activeChannel?.id;

  const [activeTab, setActiveTab] = useState("bookings");
  const [configSubTab, setConfigSubTab] = useState("general");

  // Filter States
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceFilter, setSelectedServiceFilter] = useState("all");

  // Abandoned Bookings Filter States
  const [abandonedSearch, setAbandonedSearch] = useState("");
  const [abandonedStatusFilter, setAbandonedStatusFilter] = useState("all");
  const [abandonedPage, setAbandonedPage] = useState(1);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [selectedBookingForRecovery, setSelectedBookingForRecovery] = useState<AbandonedBooking | null>(null);
  const [customRecoveryMessage, setCustomRecoveryMessage] = useState("");

  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    categoryId: "",
    price: "0",
    durationMinutes: 30,
    description: "",
    longDescription: "",
    triggerKeyword: "",
    isTriggerEnabled: false,
    currency: "INR",
    isActive: true,
    serviceMessages: [] as ServiceMessage[]
  });

  // Master / Specialist Modal State
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [editingMaster, setEditingMaster] = useState<ServiceMaster | null>(null);
  const [masterForm, setMasterForm] = useState({
    name: "",
    title: "Specialist",
    bio: "",
    photoUrl: "",
    serviceIds: [] as string[],
    slotIntervalMinutes: 30,
    timezone: "",
    workingHours: {
      days: [1, 2, 3, 4, 5, 6],
      startTime: "09:00",
      endTime: "18:00",
      breakStartTime: "13:00",
      breakEndTime: "14:00"
    },
    isActive: true
  });

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", sortOrder: 0 });

  // Comprehensive Config Form State
  const [configForm, setConfigForm] = useState<any>({
    businessName: "",
    businessAddress: "",
    businessWebsite: "",
    businessLogo: "",
    bookingTriggerKeyword: "book",
    isBookingFlowActive: true,
    welcomeMessage: "Welcome to our service booking system! Please choose a service to get started:",
    welcomeHeaderUrl: "",
    welcomeHeaderType: "image",
    welcomeMessages: [] as any[],
    requireMasterSelection: true,
    defaultWorkingHours: {
      days: [1, 2, 3, 4, 5, 6],
      startTime: "09:00",
      endTime: "18:00",
      breakStartTime: "13:00",
      breakEndTime: "14:00"
    },
    defaultSlotIntervalMinutes: 30,
    maxDaysInAdvance: 14,
    checkoutFields: [
      { text: "Please enter your full name:", variable: "name" },
      { text: "Please enter your contact phone number:", variable: "phone" },
      { text: "Any special requests or customer notes:", variable: "notes" }
    ],
    useWhatsappFlowForm: false,
    whatsappFlowId: "",
    whatsappFlowCtaText: "Book Appointment 📅",
    currency: "INR",
    timezone: "Asia/Kolkata",
    labelCod: "Pay at Venue (Cash/Card)",
    labelUpiDirect: "GPay/PhonePe(UPI)",
    labelQrPay: "Acc. Info(QR Code)",
    labelGateway: "Online Payment",
    upiId: "",
    upiMerchantName: "",
    qrCodeUrl: "",
    razorpayKeyId: "",
    razorpayKeySecret: "",
    instamojoApiKey: "",
    instamojoAuthToken: "",
    instamojoSandbox: true,
    autoAssignEnabled: false,
    autoAssignMode: "permanent",
    autoAssignUserId: "",
    autoAssignExcludedUserIds: [] as string[],
    dailyReportEnabled: false,
    dailyReportEmails: [] as string[],
    dailyReportTime: "21:00",
    merchantAlertEmails: [] as string[],
    dailyReportWaEnabled: false,
    dailyReportWaNumbers: [] as string[],
    dailyReportWaChannelId: "",
    apiKeySource: "own_key",
    aiEnabled: false,
    aiTakeoverEnabled: false,
    aiVoiceEnabled: false,
    voiceProfileId: "",
    aiVoiceLanguageMode: "profile",
    aiTimeoutMinutes: 30,
    aiAskButtonEnabled: true,
    aiSystemPrompt: "",
    abandonedBookingRecoveryEnabled: false,
    abandonedBookingDelay1Minutes: 60,
    abandonedBookingDelay2Hours: 18,
    abandonedBookingDiscountCode: "",
    abandonedBookingDiscountPercent: "10",
    abandonedBookingMessage1: "",
    abandonedBookingMessage2: ""
  });

  // Report email & WA input states
  const [dailyReportEmailInput, setDailyReportEmailInput] = useState("");
  const [dailyReportWaNumberInput, setDailyReportWaNumberInput] = useState("");
  const [merchantEmailInput, setMerchantEmailInput] = useState("");
  const [isSendingTestReport, setIsSendingTestReport] = useState(false);
  const [isSendingTestWaReport, setIsSendingTestWaReport] = useState(false);
  const [isSyncingFlow, setIsSyncingFlow] = useState(false);

  // Template edits & submitting states
  const [templateEdits, setTemplateEdits] = useState<Record<string, { header?: string; body: string; footer?: string }>>({});
  const [submittingTemplateName, setSubmittingTemplateName] = useState<string | null>(null);

  // Media Gallery Picker States
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryTargetField, setGalleryTargetField] = useState<string | null>(null);
  const [galleryTargetMsgIdx, setGalleryTargetMsgIdx] = useState<number | null>(null);

  // Queries
  const { data: servicesData, isLoading: isServicesLoading } = useQuery<{ services: Service[] }>({
    queryKey: ["/api/service-booking/services"],
    queryFn: () => apiRequest("GET", "/api/service-booking/services").then(r => r.json())
  });

  const { data: categoriesData } = useQuery<{ categories: ServiceCategory[] }>({
    queryKey: ["/api/service-booking/categories"],
    queryFn: () => apiRequest("GET", "/api/service-booking/categories").then(r => r.json())
  });

  const { data: mastersData } = useQuery<{ masters: ServiceMaster[] }>({
    queryKey: ["/api/service-booking/masters"],
    queryFn: () => apiRequest("GET", "/api/service-booking/masters").then(r => r.json())
  });

  const { data: bookingsData, isLoading: isBookingsLoading } = useQuery<{ bookings: ServiceBooking[] }>({
    queryKey: ["/api/service-booking/bookings", statusFilter, searchQuery, selectedServiceFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);
      if (selectedServiceFilter !== "all") params.append("serviceId", selectedServiceFilter);
      return apiRequest("GET", `/api/service-booking/bookings?${params.toString()}`).then(r => r.json());
    }
  });

  const { data: abandonedData, isLoading: isAbandonedLoading } = useQuery<{ abandonedBookings: AbandonedBooking[]; total: number; totalPages: number }>({
    queryKey: ["/api/service-booking/abandoned-bookings", abandonedStatusFilter, abandonedSearch, abandonedPage, channelId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (abandonedStatusFilter !== "all") params.append("status", abandonedStatusFilter);
      if (abandonedSearch) params.append("search", abandonedSearch);
      if (channelId) params.append("channelId", channelId);
      params.append("page", String(abandonedPage));
      return apiRequest("GET", `/api/service-booking/abandoned-bookings?${params.toString()}`).then(r => r.json());
    }
  });

  const { data: configData } = useQuery<{ config: any }>({
    queryKey: ["/api/service-booking/config", channelId],
    queryFn: () => apiRequest("GET", `/api/service-booking/config?channelId=${channelId || ""}`).then(r => r.json())
  });

  const { data: templatesData, refetch: refetchTemplates } = useQuery<{ templates: any[]; channelConnectionMethod: string }>({
    queryKey: ["/api/service-booking/templates", channelId],
    queryFn: () => {
      if (!channelId) return { templates: [], channelConnectionMethod: "embedded" };
      return apiRequest("GET", `/api/service-booking/templates?channelId=${channelId}`).then(r => r.json());
    },
    enabled: !!channelId
  });

  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/team/members"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/team/members?limit=1000");
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      } catch {
        return [];
      }
    }
  });

  const { data: voiceProfiles = [] } = useQuery<any[]>({
    queryKey: ["/api/voice-profiles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/voice-profiles");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: availableFlows = [] } = useQuery<any[]>({
    queryKey: ["/api/whatsapp-flows", channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const res = await apiRequest("GET", `/api/whatsapp-flows?channelId=${channelId}`);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json?.flows || [];
    },
    enabled: !!channelId
  });

  const { data: allChannels = [] } = useQuery<any[]>({
    queryKey: ["/api/channels"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/channels");
      if (!res.ok) return [];
      return res.json();
    }
  });

  useEffect(() => {
    if (configData?.config) {
      const cfg = configData.config;
      let parsedFields = cfg.checkoutFields;
      if (Array.isArray(parsedFields) && parsedFields.length > 0 && typeof parsedFields[0] === "string") {
        parsedFields = parsedFields.map((f: string) => ({
          text: `Please enter your *${f}*:`,
          variable: f
        }));
      }
      setConfigForm({
        ...cfg,
        checkoutFields: Array.isArray(parsedFields) ? parsedFields : [
          { text: "Please enter your full name:", variable: "name" },
          { text: "Please enter your contact phone number:", variable: "phone" },
          { text: "Any special requests or customer notes:", variable: "notes" }
        ],
        welcomeMessages: Array.isArray(cfg.welcomeMessages) ? cfg.welcomeMessages : [],
        dailyReportEmails: Array.isArray(cfg.dailyReportEmails) ? cfg.dailyReportEmails : [],
        merchantAlertEmails: Array.isArray(cfg.merchantAlertEmails) ? cfg.merchantAlertEmails : [],
        dailyReportWaNumbers: Array.isArray(cfg.dailyReportWaNumbers) ? cfg.dailyReportWaNumbers : [],
        autoAssignExcludedUserIds: Array.isArray(cfg.autoAssignExcludedUserIds) ? cfg.autoAssignExcludedUserIds : [],
        timezone: cfg.timezone || "Asia/Kolkata"
      });
    }
  }, [configData]);

  // Mutations
  const saveConfigMutation = useMutation({
    mutationFn: (data: any) => {
      const sanitized = {
        ...data,
        channelId: channelId || null,
        whatsappFlowId: data.whatsappFlowId || null,
        voiceProfileId: data.voiceProfileId || null,
        autoAssignUserId: data.autoAssignUserId || null,
        dailyReportWaChannelId: data.dailyReportWaChannelId || null,
        activeServiceId: data.activeServiceId || null,
      };
      delete sanitized.id;
      delete sanitized.createdAt;
      delete sanitized.updatedAt;
      return apiRequest("POST", "/api/service-booking/config", sanitized);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/config"] });
      toast({ title: "Saved", description: "Service Booking configuration updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save configuration", variant: "destructive" });
    }
  });

  const saveServiceMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/service-booking/services", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/services"] });
      setIsServiceModalOpen(false);
      toast({ title: "Saved", description: "Service saved successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/service-booking/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/services"] });
      toast({ title: "Deleted", description: "Service deleted." });
    }
  });

  const saveMasterMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/service-booking/masters", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/masters"] });
      setIsMasterModalOpen(false);
      toast({ title: "Saved", description: "Specialist saved successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const deleteMasterMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/service-booking/masters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/masters"] });
      toast({ title: "Deleted", description: "Specialist deleted." });
    }
  });

  const saveCategoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/service-booking/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/categories"] });
      setIsCategoryModalOpen(false);
      toast({ title: "Saved", description: "Category saved successfully." });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/service-booking/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/categories"] });
      toast({ title: "Deleted", description: "Category deleted." });
    }
  });

  const updateBookingStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PUT", `/api/service-booking/bookings/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/bookings"] });
      toast({ title: "Status Updated", description: "Booking status has been updated." });
    }
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: ({ id, paymentStatus }: { id: string; paymentStatus: string }) =>
      apiRequest("PUT", `/api/service-booking/bookings/${id}/payment-status`, { paymentStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/bookings"] });
      toast({ title: "Payment Status Updated", description: "Payment status has been updated." });
    }
  });

  const provisionTemplatesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/service-booking/templates/provision", { channelId }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/templates"] });
      toast({
        title: "Templates Provisioned",
        description: `Successfully provisioned ${data.total} WhatsApp templates for Meta & QR.`
      });
    },
    onError: (err: any) => {
      toast({ title: "Provisioning Failed", description: err.message, variant: "destructive" });
    }
  });

  const submitTemplateMutation = useMutation({
    mutationFn: (data: { templateName: string; body: string; header?: string; footer?: string }) => {
      setSubmittingTemplateName(data.templateName);
      return apiRequest("POST", "/api/service-booking/templates/submit", { ...data, channelId });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/templates"] });
      toast({
        title: "Template Submitted",
        description: data.message || "Template submitted successfully."
      });
      setSubmittingTemplateName(null);
    },
    onError: (err: any) => {
      setSubmittingTemplateName(null);
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    }
  });

  const recoverBookingMutation = useMutation({
    mutationFn: ({ id, customMessage }: { id: string; customMessage?: string }) =>
      apiRequest("POST", `/api/service-booking/abandoned-bookings/${id}/recover`, { customMessage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/abandoned-bookings"] });
      setRecoveryModalOpen(false);
      setSelectedBookingForRecovery(null);
      setCustomRecoveryMessage("");
      toast({ title: "Recovery Sent", description: "Automated booking recovery message dispatched." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  });

  // Action handlers
  const handleSyncBookingFlow = async () => {
    if (!channelId) {
      toast({ title: "Channel Required", description: "Please select an active channel to sync WhatsApp Flow Form.", variant: "destructive" });
      return;
    }
    try {
      setIsSyncingFlow(true);
      const res = await apiRequest("POST", "/api/service-booking/sync-booking-flow", { channelId });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to sync flow");
      setConfigForm((prev: any) => ({
        ...prev,
        useWhatsappFlowForm: true,
        whatsappFlowId: json?.data?.id || prev.whatsappFlowId
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-flows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/config"] });
      toast({ title: "Meta Flow Synced!", description: "Native WhatsApp appointment booking flow has been published to Meta." });
    } catch (err: any) {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSyncingFlow(false);
    }
  };

  const handleSendTestEmailReport = async () => {
    if (configForm.dailyReportEmails.length === 0) {
      toast({ title: "No Emails Configured", description: "Please add at least one recipient email address first.", variant: "destructive" });
      return;
    }
    try {
      setIsSendingTestReport(true);
      const res = await apiRequest("POST", "/api/service-booking/reports/send-test-email", {
        channelId,
        targetEmails: configForm.dailyReportEmails
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to send report");
      toast({ title: "Report Sent!", description: `Sent daily appointments summary Excel email to ${configForm.dailyReportEmails.length} recipients.` });
    } catch (err: any) {
      toast({ title: "Send Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSendingTestReport(false);
    }
  };

  const handleSendTestWaReport = async () => {
    if (configForm.dailyReportWaNumbers.length === 0) {
      toast({ title: "No Numbers Configured", description: "Please add at least one WhatsApp phone number first.", variant: "destructive" });
      return;
    }
    try {
      setIsSendingTestWaReport(true);
      const res = await apiRequest("POST", "/api/service-booking/reports/send-test-wa", {
        channelId: configForm.dailyReportWaChannelId || channelId,
        targetNumbers: configForm.dailyReportWaNumbers
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to forward report");
      toast({ title: "WhatsApp Report Forwarded!", description: `Forwarded daily appointments schedule to ${json.count || configForm.dailyReportWaNumbers.length} WhatsApp numbers.` });
    } catch (err: any) {
      toast({ title: "Forward Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSendingTestWaReport(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <CalendarIcon className="w-8 h-8 text-indigo-600" />
            Service Booking & Appointments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage automated appointment scheduling, specialists, working hours, dynamic time slots, and WhatsApp booking flows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ChannelSwitcher />
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 h-auto p-1 bg-slate-100 rounded-xl gap-1">
          <TabsTrigger value="bookings" className="flex items-center gap-1.5 py-2.5 text-xs font-semibold">
            <CalendarIcon className="w-4 h-4 text-indigo-600" />
            Bookings Ledger
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-1.5 py-2.5 text-xs font-semibold">
            <Briefcase className="w-4 h-4 text-emerald-600" />
            Services Catalog
          </TabsTrigger>
          <TabsTrigger value="masters" className="flex items-center gap-1.5 py-2.5 text-xs font-semibold">
            <Users className="w-4 h-4 text-blue-600" />
            Specialists / Staff
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-1.5 py-2.5 text-xs font-semibold">
            <FileText className="w-4 h-4 text-purple-600" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="abandoned_bookings" className="flex items-center gap-1.5 py-2.5 text-xs font-semibold">
            <RotateCcw className="w-4 h-4 text-amber-600" />
            Abandoned Bookings
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 py-2.5 text-xs font-semibold">
            <Settings className="w-4 h-4 text-slate-600" />
            Settings Hub
          </TabsTrigger>
        </TabsList>

        {/* 1. BOOKINGS LEDGER TAB */}
        <TabsContent value="bookings" className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border shadow-xs">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <Input
                placeholder="Search by customer, phone, booking #, service..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="max-w-xs text-xs h-9"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] text-xs h-9">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 self-end md:self-auto">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9"
                onClick={() => window.open("/api/service-booking/bookings/export", "_blank")}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export Excel (.xlsx)
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold">Ref #</TableHead>
                    <TableHead className="font-bold">Customer</TableHead>
                    <TableHead className="font-bold">Service & Specialist</TableHead>
                    <TableHead className="font-bold">Date & Time Slot</TableHead>
                    <TableHead className="font-bold">Amount</TableHead>
                    <TableHead className="font-bold">Payment</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isBookingsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                        Loading appointment bookings...
                      </TableCell>
                    </TableRow>
                  ) : (bookingsData?.bookings || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No appointments found matching current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (bookingsData?.bookings || []).map((b: ServiceBooking) => (
                      <TableRow key={b.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-mono font-bold text-indigo-600">{b.bookingNumber}</TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900">{b.customerName || "Customer"}</div>
                          <div className="text-[11px] text-muted-foreground">{b.customerPhone}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{b.serviceName}</div>
                          <div className="text-[11px] text-slate-500">Staff: {b.masterName || "Next Available"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{b.bookingDate}</div>
                          <div className="text-[11px] text-indigo-600 font-semibold">{b.startTime} - {b.endTime}</div>
                        </TableCell>
                        <TableCell className="font-bold text-emerald-600">
                          {b.currency || "INR"} {Number(b.totalAmount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={b.paymentStatus || "pending"}
                            onValueChange={v => updatePaymentStatusMutation.mutate({ id: b.id, paymentStatus: v })}
                          >
                            <SelectTrigger className="h-7 text-[11px] w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="pending_verification">Verify Receipt</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={b.status || "confirmed"}
                            onValueChange={v => updateBookingStatusMutation.mutate({ id: b.id, status: v })}
                          >
                            <SelectTrigger className="h-7 text-[11px] w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-indigo-600 hover:text-indigo-800"
                            onClick={() => window.open(`/api/service-booking/bookings/${b.id}/pdf`, "_blank")}
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            PDF Slip
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. SERVICES CATALOG TAB */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border">
            <div>
              <h2 className="text-base font-bold text-slate-800">Services Catalog</h2>
              <p className="text-xs text-muted-foreground">Manage service items, duration, pricing, and trigger keywords.</p>
            </div>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
              onClick={() => {
                setEditingService(null);
                setServiceForm({
                  name: "",
                  categoryId: "",
                  price: "0",
                  durationMinutes: 30,
                  description: "",
                  longDescription: "",
                  triggerKeyword: "",
                  isTriggerEnabled: false,
                  currency: configForm.currency || "INR",
                  isActive: true,
                  serviceMessages: []
                });
                setIsServiceModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add New Service
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(servicesData?.services || []).map((s: Service) => (
              <Card key={s.id} className="relative overflow-hidden border shadow-xs hover:border-emerald-300 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-bold text-slate-800">{s.name}</CardTitle>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {s.currency || "INR"} {s.price}
                    </span>
                  </div>
                  <CardDescription className="text-xs flex items-center gap-2 mt-1 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    {s.durationMinutes} mins
                    {s.triggerKeyword && (
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-700">
                        Trigger: "{s.triggerKeyword}"
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <p className="text-xs text-slate-600 line-clamp-2">{s.description || "No description provided."}</p>
                  <div className="flex justify-end gap-2 border-t pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setEditingService(s);
                        setServiceForm({
                          name: s.name,
                          categoryId: s.categoryId || "",
                          price: s.price,
                          durationMinutes: s.durationMinutes,
                          description: s.description || "",
                          longDescription: s.longDescription || "",
                          triggerKeyword: s.triggerKeyword || "",
                          isTriggerEnabled: s.isTriggerEnabled,
                          currency: s.currency || "INR",
                          isActive: s.isActive,
                          serviceMessages: s.serviceMessages || []
                        });
                        setIsServiceModalOpen(true);
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteServiceMutation.mutate(s.id)}
                    >
                      <Trash className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 3. SPECIALISTS / MASTERS TAB */}
        <TabsContent value="masters" className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border">
            <div>
              <h2 className="text-base font-bold text-slate-800">Specialists & Staff Masters</h2>
              <p className="text-xs text-muted-foreground">Assign services, set custom working hours and slot durations per master.</p>
            </div>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
              onClick={() => {
                setEditingMaster(null);
                setMasterForm({
                  name: "",
                  title: "Specialist",
                  bio: "",
                  photoUrl: "",
                  serviceIds: [],
                  slotIntervalMinutes: 30,
                  timezone: "",
                  workingHours: {
                    days: [1, 2, 3, 4, 5, 6],
                    startTime: "09:00",
                    endTime: "18:00",
                    breakStartTime: "13:00",
                    breakEndTime: "14:00"
                  },
                  isActive: true
                });
                setIsMasterModalOpen(true);
              }}
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              Add Specialist
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(mastersData?.masters || []).map((m: ServiceMaster) => (
              <Card key={m.id} className="border shadow-xs hover:border-blue-300 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800">{m.name}</CardTitle>
                      <CardDescription className="text-xs text-blue-600 font-medium">{m.title || "Specialist"}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>{m.workingHours?.startTime || "09:00"} - {m.workingHours?.endTime || "18:00"}</span>
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">Slot: {m.slotIntervalMinutes}m</span>
                  </div>
                  {m.timezone && (
                    <div className="flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50/70 px-2 py-0.5 rounded w-fit">
                      <Globe className="w-3 h-3 text-blue-600" />
                      <span>{m.timezone}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{m.bio || "No biography added."}</p>
                  <div className="flex justify-end gap-2 border-t pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setEditingMaster(m);
                        setMasterForm({
                          name: m.name,
                          title: m.title || "Specialist",
                          bio: m.bio || "",
                          photoUrl: m.photoUrl || "",
                          serviceIds: m.serviceIds || [],
                          slotIntervalMinutes: m.slotIntervalMinutes || 30,
                          timezone: m.timezone || "",
                          workingHours: m.workingHours || {
                            days: [1, 2, 3, 4, 5, 6],
                            startTime: "09:00",
                            endTime: "18:00",
                            breakStartTime: "13:00",
                            breakEndTime: "14:00"
                          },
                          isActive: m.isActive
                        });
                        setIsMasterModalOpen(true);
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteMasterMutation.mutate(m.id)}
                    >
                      <Trash className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 4. CATEGORIES TAB */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border">
            <div>
              <h2 className="text-base font-bold text-slate-800">Service Categories</h2>
              <p className="text-xs text-muted-foreground">Group services by category for structured WhatsApp catalog navigation.</p>
            </div>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9"
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: "", description: "", sortOrder: 0 });
                setIsCategoryModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Category
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(categoriesData?.categories || []).map((c: ServiceCategory) => (
              <Card key={c.id} className="border shadow-xs">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-800">{c.name}</CardTitle>
                  <span className="text-xs text-slate-400">Order: {c.sortOrder}</span>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <p className="text-xs text-slate-500">{c.description || "No description provided."}</p>
                  <div className="flex justify-end gap-2 border-t pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setEditingCategory(c);
                        setCategoryForm({ name: c.name, description: c.description || "", sortOrder: c.sortOrder });
                        setIsCategoryModalOpen(true);
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteCategoryMutation.mutate(c.id)}
                    >
                      <Trash className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 5. ABANDONED BOOKINGS TAB */}
        <TabsContent value="abandoned_bookings" className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border shadow-xs">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <Input
                placeholder="Search by customer name or phone..."
                value={abandonedSearch}
                onChange={e => {
                  setAbandonedSearch(e.target.value);
                  setAbandonedPage(1);
                }}
                className="max-w-xs text-xs h-9"
              />
              <Select
                value={abandonedStatusFilter}
                onValueChange={v => {
                  setAbandonedStatusFilter(v);
                  setAbandonedPage(1);
                }}
              >
                <SelectTrigger className="w-[140px] text-xs h-9">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="abandoned">Abandoned</SelectItem>
                  <SelectItem value="recovered">Recovered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground">
              Total: <strong>{abandonedData?.total || 0}</strong> abandoned sessions
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold">Customer</TableHead>
                    <TableHead className="font-bold">Service & Specialist</TableHead>
                    <TableHead className="font-bold">Date & Slot</TableHead>
                    <TableHead className="font-bold">Last Step Reached</TableHead>
                    <TableHead className="font-bold">Follow-ups</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Abandoned At</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isAbandonedLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                        Loading abandoned bookings...
                      </TableCell>
                    </TableRow>
                  ) : (abandonedData?.abandonedBookings || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No abandoned bookings found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (abandonedData?.abandonedBookings || []).map((ab: AbandonedBooking) => (
                      <TableRow key={ab.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="font-medium text-slate-900">{ab.customerName || "Customer"}</div>
                          <div className="text-[11px] text-muted-foreground">{ab.customerPhone}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{ab.serviceName || "Service"}</div>
                          <div className="text-[11px] text-slate-500">Staff: {ab.masterName || "Next Available"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{ab.bookingDate || "N/A"}</div>
                          <div className="text-[11px] text-indigo-600">{ab.selectedSlot || "Pending slot"}</div>
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-slate-600">
                          {ab.currentStep}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {ab.followupCount || 0} Sent
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            ab.status === "recovered"
                              ? "bg-emerald-100 text-emerald-800"
                              : ab.status === "abandoned"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {ab.status.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(ab.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                            onClick={() => {
                              setSelectedBookingForRecovery(ab);
                              setCustomRecoveryMessage(
                                `👋 Hi ${ab.customerName || "there"}! We noticed you started booking your appointment for *${ab.serviceName || "our service"}* but didn't finish.\n\nReply *book* or *1* now to lock in your appointment!`
                              );
                              setRecoveryModalOpen(true);
                            }}
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Recover
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. SETTINGS HUB (SUB-TABS) */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-600" />
                    Service Booking Settings Hub
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Configure business identity, working hours, custom checkout fields, Meta WhatsApp Flows, templates, abandoned booking recovery, and email alerts.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 self-end md:self-auto"
                  onClick={() => saveConfigMutation.mutate(configForm)}
                  disabled={saveConfigMutation.isPending}
                >
                  {saveConfigMutation.isPending ? "Saving Settings..." : "Save All Settings"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs value={configSubTab} onValueChange={setConfigSubTab} className="w-full space-y-6">
                <TabsList className="grid grid-cols-2 md:grid-cols-7 h-auto p-1 bg-slate-100/90 rounded-xl gap-1">
                  <TabsTrigger value="general" className="flex items-center gap-1.5 py-2.5 text-xs font-semibold">
                    <Settings className="w-3.5 h-3.5 text-purple-600" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="scheduling" className="flex items-center gap-1.5 py-2.5 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Working Hours
                  </TabsTrigger>
                  <TabsTrigger value="checkout" className="flex items-center gap-1.5 py-2.5 text-xs font-semibold">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    Checkout & Flow
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="flex items-center gap-1.5 py-2.5 text-xs font-semibold">
                    <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger value="abandoned" className="flex items-center gap-1.5 py-2.5 text-xs font-semibold">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    Abandoned Bookings
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="flex items-center gap-1.5 py-2.5 text-xs font-semibold">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                    Reports & Alerts
                  </TabsTrigger>
                  <TabsTrigger value="ai_team" className="flex items-center gap-1.5 py-2.5 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    AI & Team
                  </TabsTrigger>
                </TabsList>

                {/* Sub-Tab 1: General Settings */}
                <TabsContent value="general" className="space-y-6 mt-0">
                  {/* Business Identity Section */}
                  <div className="p-4 border rounded-lg bg-slate-50/50 space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-purple-600" />
                      Business Identity (Displayed on Invoices & Booking Slips)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Business / Clinic Name</Label>
                        <Input
                          value={configForm.businessName || ""}
                          onChange={e => setConfigForm({ ...configForm, businessName: e.target.value })}
                          placeholder="e.g. Lumina Hair & Spa"
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Website URL</Label>
                        <Input
                          value={configForm.businessWebsite || ""}
                          onChange={e => setConfigForm({ ...configForm, businessWebsite: e.target.value })}
                          placeholder="e.g. https://luminaspa.com"
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Business Logo URL</Label>
                        <div className="flex gap-2">
                          <Input
                            value={configForm.businessLogo || ""}
                            onChange={e => setConfigForm({ ...configForm, businessLogo: e.target.value })}
                            placeholder="Logo URL"
                            className="h-9 text-xs bg-white flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs"
                            onClick={() => {
                              setGalleryTargetField("businessLogo");
                              setIsGalleryOpen(true);
                            }}
                          >
                            Gallery
                          </Button>
                        </div>
                      </div>
                      <div className="col-span-1 md:col-span-3 space-y-1.5">
                        <Label className="text-xs">Business Address / Location</Label>
                        <Textarea
                          value={configForm.businessAddress || ""}
                          onChange={e => setConfigForm({ ...configForm, businessAddress: e.target.value })}
                          placeholder="e.g. 101 Royal Avenue, Downtown City Center"
                          rows={2}
                          className="text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Flow Triggers & Welcome Media */}
                  <div className="p-4 border rounded-lg bg-white space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-purple-600" />
                      Inbound Triggers & Flow Activation
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-semibold text-sm">Automated WhatsApp Booking Flow</Label>
                        <p className="text-xs text-muted-foreground">Enable interactive conversational booking when customer messages keyword.</p>
                      </div>
                      <Switch
                        checked={configForm.isBookingFlowActive}
                        onCheckedChange={v => setConfigForm({ ...configForm, isBookingFlowActive: v })}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Trigger Keyword</Label>
                        <Input
                          value={configForm.bookingTriggerKeyword || ""}
                          onChange={e => setConfigForm({ ...configForm, bookingTriggerKeyword: e.target.value })}
                          placeholder="e.g. book, appointment, schedule"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Base Currency</Label>
                        <Select
                          value={configForm.currency || "INR"}
                          onValueChange={v => setConfigForm({ ...configForm, currency: v })}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INR">INR (₹)</SelectItem>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="SAR">SAR (SAR)</SelectItem>
                            <SelectItem value="AED">AED (AED)</SelectItem>
                            <SelectItem value="QAR">QAR (QAR)</SelectItem>
                            <SelectItem value="OMR">OMR (OMR)</SelectItem>
                            <SelectItem value="KWD">KWD (KWD)</SelectItem>
                            <SelectItem value="BHD">BHD (BHD)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-blue-600" />
                          Business Timezone
                        </Label>
                        <Select
                          value={configForm.timezone || "Asia/Kolkata"}
                          onValueChange={v => setConfigForm({ ...configForm, timezone: v })}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            {COMMON_TIMEZONES.map(tz => (
                              <SelectItem key={tz.value} value={tz.value} className="text-xs">
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t">
                      <Label className="text-xs">Welcome Greeting Message</Label>
                      <Textarea
                        value={configForm.welcomeMessage || ""}
                        onChange={e => setConfigForm({ ...configForm, welcomeMessage: e.target.value })}
                        placeholder="Welcome message..."
                        rows={2}
                        className="text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Welcome Header Media Type</Label>
                        <Select
                          value={configForm.welcomeHeaderType || "image"}
                          onValueChange={v => setConfigForm({ ...configForm, welcomeHeaderType: v })}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Media Header</SelectItem>
                            <SelectItem value="image">Image Header</SelectItem>
                            <SelectItem value="video">Video Header</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Welcome Header Media URL</Label>
                        <div className="flex gap-2">
                          <Input
                            value={configForm.welcomeHeaderUrl || ""}
                            onChange={e => setConfigForm({ ...configForm, welcomeHeaderUrl: e.target.value })}
                            placeholder="Media URL"
                            className="h-9 text-xs flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs"
                            onClick={() => {
                              setGalleryTargetField("welcomeHeaderUrl");
                              setIsGalleryOpen(true);
                            }}
                          >
                            Gallery
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Welcome Messages Sequence (Repeating Multi-Message Onboarding) */}
                  <div className="p-4 border rounded-lg bg-purple-50/20 space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-600" />
                      Welcome Messages Sequence (Multi-Message Onboarding)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Define a sequence of messages sent one-by-one to clients when they initiate appointment booking.
                    </p>
                    <div className="space-y-3">
                      {(configForm.welcomeMessages || []).map((msg: any, idx: number) => (
                        <div key={msg.id || idx} className="p-3 border rounded-lg bg-white space-y-3 shadow-xs">
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs font-bold text-purple-700">Message #{idx + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 h-6 text-xs p-1"
                              onClick={() => {
                                const updated = configForm.welcomeMessages.filter((_: any, i: number) => i !== idx);
                                setConfigForm({ ...configForm, welcomeMessages: updated });
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[11px]">Media Type</Label>
                              <Select
                                value={msg.mediaType || "none"}
                                onValueChange={v => {
                                  const updated = [...configForm.welcomeMessages];
                                  updated[idx].mediaType = v;
                                  setConfigForm({ ...configForm, welcomeMessages: updated });
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Text Only</SelectItem>
                                  <SelectItem value="image">Image</SelectItem>
                                  <SelectItem value="video">Video</SelectItem>
                                  <SelectItem value="audio">Audio / Voice Note</SelectItem>
                                  <SelectItem value="document">Document / PDF</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <Label className="text-[11px]">Media URL</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={msg.mediaUrl || ""}
                                  onChange={e => {
                                    const updated = [...configForm.welcomeMessages];
                                    updated[idx].mediaUrl = e.target.value;
                                    setConfigForm({ ...configForm, welcomeMessages: updated });
                                  }}
                                  placeholder="Media URL"
                                  className="h-8 text-xs bg-white flex-1"
                                  disabled={msg.mediaType === "none"}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs"
                                  disabled={msg.mediaType === "none"}
                                  onClick={() => {
                                    setGalleryTargetField(`welcome_seq_${idx}`);
                                    setIsGalleryOpen(true);
                                  }}
                                >
                                  Gallery
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="space-y-1 md:col-span-3">
                              <Label className="text-[11px]">Message Text</Label>
                              <Textarea
                                value={msg.text || ""}
                                onChange={e => {
                                  const updated = [...configForm.welcomeMessages];
                                  updated[idx].text = e.target.value;
                                  setConfigForm({ ...configForm, welcomeMessages: updated });
                                }}
                                placeholder="Message copy..."
                                className="text-xs min-h-[50px]"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">Sequence Weight</Label>
                              <Input
                                type="number"
                                value={msg.sortOrder || idx + 1}
                                onChange={e => {
                                  const updated = [...configForm.welcomeMessages];
                                  updated[idx].sortOrder = parseInt(e.target.value) || 0;
                                  setConfigForm({ ...configForm, welcomeMessages: updated });
                                }}
                                className="h-8 text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed border-purple-300 text-purple-700 hover:bg-purple-50 text-xs h-9"
                        onClick={() => {
                          setConfigForm({
                            ...configForm,
                            welcomeMessages: [
                              ...(configForm.welcomeMessages || []),
                              {
                                id: Math.random().toString(36).substring(7),
                                text: "",
                                mediaType: "none",
                                mediaUrl: "",
                                sortOrder: (configForm.welcomeMessages || []).length + 1
                              }
                            ]
                          });
                        }}
                      >
                        + Add Welcome Message to Sequence
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Sub-Tab 2: Scheduling & Working Hours */}
                <TabsContent value="scheduling" className="space-y-6 mt-0">
                  <div className="p-4 border rounded-lg bg-white space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Dynamic Slot Calculation & Operating Hours
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Default Slot Interval</Label>
                        <Select
                          value={String(configForm.defaultSlotIntervalMinutes || 30)}
                          onValueChange={v => setConfigForm({ ...configForm, defaultSlotIntervalMinutes: parseInt(v) })}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 Minutes</SelectItem>
                            <SelectItem value="20">20 Minutes</SelectItem>
                            <SelectItem value="30">30 Minutes (Recommended)</SelectItem>
                            <SelectItem value="45">45 Minutes</SelectItem>
                            <SelectItem value="60">60 Minutes (1 Hour)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Max Days in Advance for Bookings</Label>
                        <Input
                          type="number"
                          value={configForm.maxDaysInAdvance || 14}
                          onChange={e => setConfigForm({ ...configForm, maxDaysInAdvance: parseInt(e.target.value) || 14 })}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                        <Label className="text-xs font-semibold">Require Specialist Selection</Label>
                        <Switch
                          checked={configForm.requireMasterSelection}
                          onCheckedChange={v => setConfigForm({ ...configForm, requireMasterSelection: v })}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t space-y-3">
                      <Label className="text-xs font-bold text-slate-700">Weekly Business Operating Days</Label>
                      <div className="flex flex-wrap gap-2">
                        {DEFAULT_DAYS.map(d => {
                          const activeDays: number[] = configForm.defaultWorkingHours?.days || [1, 2, 3, 4, 5, 6];
                          const isSelected = activeDays.includes(d.day);
                          return (
                            <Button
                              key={d.day}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className={`h-8 text-xs px-3 ${isSelected ? "bg-blue-600 text-white" : "text-slate-600"}`}
                              onClick={() => {
                                const newDays = isSelected
                                  ? activeDays.filter(x => x !== d.day)
                                  : [...activeDays, d.day];
                                setConfigForm({
                                  ...configForm,
                                  defaultWorkingHours: { ...configForm.defaultWorkingHours, days: newDays }
                                });
                              }}
                            >
                              {d.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Opening Time</Label>
                        <Input
                          type="time"
                          value={configForm.defaultWorkingHours?.startTime || "09:00"}
                          onChange={e => setConfigForm({
                            ...configForm,
                            defaultWorkingHours: { ...configForm.defaultWorkingHours, startTime: e.target.value }
                          })}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Closing Time</Label>
                        <Input
                          type="time"
                          value={configForm.defaultWorkingHours?.endTime || "18:00"}
                          onChange={e => setConfigForm({
                            ...configForm,
                            defaultWorkingHours: { ...configForm.defaultWorkingHours, endTime: e.target.value }
                          })}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Break Window Start</Label>
                        <Input
                          type="time"
                          value={configForm.defaultWorkingHours?.breakStartTime || "13:00"}
                          onChange={e => setConfigForm({
                            ...configForm,
                            defaultWorkingHours: { ...configForm.defaultWorkingHours, breakStartTime: e.target.value }
                          })}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Break Window End</Label>
                        <Input
                          type="time"
                          value={configForm.defaultWorkingHours?.breakEndTime || "14:00"}
                          onChange={e => setConfigForm({
                            ...configForm,
                            defaultWorkingHours: { ...configForm.defaultWorkingHours, breakEndTime: e.target.value }
                          })}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Sub-Tab 3: Checkout & Flow Form */}
                <TabsContent value="checkout" className="space-y-6 mt-0">
                  {/* Meta WhatsApp Flow Form Checkout */}
                  <div className="border border-indigo-200 rounded-lg p-4 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          WhatsApp Flow Form Checkout (Meta Native Form)
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded font-medium ml-1">Meta Cloud API</span>
                        </Label>
                        <span className="text-[11px] text-muted-foreground block leading-tight">
                          Replaces step-by-step text questions with a single native WhatsApp form. When a client books, WhatsApp opens an interactive form with specialist picker, date & time, and payment method all in one screen.
                        </span>
                      </div>
                      <Switch
                        checked={!!configForm.useWhatsappFlowForm}
                        onCheckedChange={v => setConfigForm({ ...configForm, useWhatsappFlowForm: v })}
                      />
                    </div>

                    {!!configForm.useWhatsappFlowForm && (
                      <div className="pt-3 border-t border-indigo-100 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-700">Select WhatsApp Form</Label>
                            <Select
                              value={configForm.whatsappFlowId || "none"}
                              onValueChange={v => setConfigForm({ ...configForm, whatsappFlowId: v === "none" ? "" : v })}
                            >
                              <SelectTrigger className="h-9 text-xs bg-white">
                                <SelectValue placeholder="-- Choose an existing Form --" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-- Choose an existing Form --</SelectItem>
                                {(availableFlows || []).map((fl: any) => (
                                  <SelectItem key={fl?.id || Math.random()} value={fl?.id || ""}>
                                    {fl?.name || "Untitled Flow"} ({fl?.status || "DRAFT"})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-700">Form CTA Button Label</Label>
                            <Input
                              value={configForm.whatsappFlowCtaText || "Book Appointment 📅"}
                              onChange={e => setConfigForm({ ...configForm, whatsappFlowCtaText: e.target.value })}
                              placeholder="Book Appointment 📅"
                              className="text-xs h-9 bg-white"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] text-muted-foreground italic">
                            ✨ Clicking Auto-Generate will build, publish, and sync a Meta Form matching your custom checkout fields below.
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isSyncingFlow}
                            onClick={handleSyncBookingFlow}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 flex items-center gap-1.5"
                          >
                            {isSyncingFlow ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Syncing with Meta...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                Auto-Generate & Sync Form
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Custom Checkout Fields (Q&A List) */}
                  <div className="p-4 border rounded-lg bg-white space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      Custom Checkout Fields (Q&A Questions List)
                    </h3>
                    <div className="space-y-3">
                      {(configForm.checkoutFields || []).map((field: any, idx: number) => (
                        <div key={idx} className="flex flex-col sm:flex-row gap-2 p-3 border rounded-md bg-slate-50/50">
                          <div className="flex-grow space-y-1">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Question Prompt Text</Label>
                            <Input
                              value={field.text || ""}
                              onChange={e => {
                                const copy = [...configForm.checkoutFields];
                                copy[idx].text = e.target.value;
                                setConfigForm({ ...configForm, checkoutFields: copy });
                              }}
                              placeholder="e.g. Please enter your full name:"
                              className="text-xs bg-white h-8"
                            />
                          </div>
                          <div className="w-full sm:w-1/3 space-y-1">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Variable Key</Label>
                            <Input
                              value={field.variable || ""}
                              onChange={e => {
                                const copy = [...configForm.checkoutFields];
                                copy[idx].variable = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                                setConfigForm({ ...configForm, checkoutFields: copy });
                              }}
                              placeholder="e.g. name"
                              className="text-xs bg-white h-8 font-mono"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 self-end h-8"
                            onClick={() => {
                              const copy = configForm.checkoutFields.filter((_: any, i: number) => i !== idx);
                              setConfigForm({ ...configForm, checkoutFields: copy });
                            }}
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs h-8"
                        onClick={() => {
                          setConfigForm({
                            ...configForm,
                            checkoutFields: [...(configForm.checkoutFields || []), { text: "", variable: "" }]
                          });
                        }}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add New Question
                      </Button>
                    </div>
                  </div>

                  {/* Payment Methods & Custom Labels */}
                  <div className="p-4 border rounded-lg bg-white space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      Payment Methods & Custom Labels
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cash on Arrival (Venue) Label</Label>
                        <Input
                          value={configForm.labelCod || "Pay at Venue (Cash/Card)"}
                          onChange={e => setConfigForm({ ...configForm, labelCod: e.target.value })}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">UPI Direct Mobile Pay Label</Label>
                        <Input
                          value={configForm.labelUpiDirect || "GPay/PhonePe(UPI)"}
                          onChange={e => setConfigForm({ ...configForm, labelUpiDirect: e.target.value })}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">UPI QR Code Pay Label</Label>
                        <Input
                          value={configForm.labelQrPay || "Acc. Info(QR Code)"}
                          onChange={e => setConfigForm({ ...configForm, labelQrPay: e.target.value })}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Online Gateway Pay Label</Label>
                        <Input
                          value={configForm.labelGateway || "Online Payment"}
                          onChange={e => setConfigForm({ ...configForm, labelGateway: e.target.value })}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Merchant UPI ID (GPay / PhonePe deep-links)</Label>
                        <Input
                          value={configForm.upiId || ""}
                          onChange={e => setConfigForm({ ...configForm, upiId: e.target.value })}
                          placeholder="e.g. merchant@okhdfcbank"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Payee Display Name</Label>
                        <Input
                          value={configForm.upiMerchantName || ""}
                          onChange={e => setConfigForm({ ...configForm, upiMerchantName: e.target.value })}
                          placeholder="e.g. Lumina Clinic"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t">
                      <Label className="text-xs">UPI Payment Scan QR Code Image</Label>
                      <div className="flex gap-2">
                        <Input
                          value={configForm.qrCodeUrl || ""}
                          onChange={e => setConfigForm({ ...configForm, qrCodeUrl: e.target.value })}
                          placeholder="QR Code Image URL"
                          className="h-9 text-xs flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs"
                          onClick={() => {
                            setGalleryTargetField("qrCodeUrl");
                            setIsGalleryOpen(true);
                          }}
                        >
                          Gallery
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Online Payment Gateways */}
                  <div className="p-4 border rounded-lg bg-white space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      Online Payment Gateways (Razorpay & Instamojo)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 border rounded-lg bg-slate-50 space-y-3">
                        <h4 className="font-bold text-xs text-slate-800">Razorpay Gateway</h4>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Key ID</Label>
                          <Input
                            type="password"
                            value={configForm.razorpayKeyId || ""}
                            onChange={e => setConfigForm({ ...configForm, razorpayKeyId: e.target.value })}
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Key Secret</Label>
                          <Input
                            type="password"
                            value={configForm.razorpayKeySecret || ""}
                            onChange={e => setConfigForm({ ...configForm, razorpayKeySecret: e.target.value })}
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="p-3 border rounded-lg bg-slate-50 space-y-3">
                        <h4 className="font-bold text-xs text-slate-800">Instamojo Gateway</h4>
                        <div className="space-y-1">
                          <Label className="text-[11px]">API Key</Label>
                          <Input
                            type="password"
                            value={configForm.instamojoApiKey || ""}
                            onChange={e => setConfigForm({ ...configForm, instamojoApiKey: e.target.value })}
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Auth Token</Label>
                          <Input
                            type="password"
                            value={configForm.instamojoAuthToken || ""}
                            onChange={e => setConfigForm({ ...configForm, instamojoAuthToken: e.target.value })}
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Sub-Tab 4: WhatsApp Notification Templates */}
                <TabsContent value="templates" className="space-y-6 mt-0">
                  <div className="p-4 border rounded-xl bg-gradient-to-r from-teal-50/80 via-emerald-50/50 to-blue-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-teal-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-teal-600 text-white">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            WhatsApp Notification Templates
                            <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase">
                              Category: UTILITY
                            </span>
                          </h3>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Pre-formatted for guaranteed Meta Cloud API <strong className="text-teal-700">UTILITY</strong> approval with dynamic variable interpolation.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetchTemplates()}
                        className="text-xs border-teal-200 text-teal-700 hover:bg-teal-50 h-8"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Refresh Status
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => provisionTemplatesMutation.mutate()}
                        disabled={provisionTemplatesMutation.isPending}
                        className="text-xs bg-teal-600 hover:bg-teal-700 text-white h-8"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        {provisionTemplatesMutation.isPending ? "Provisioning..." : "⚡ Auto-Provision All"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(templatesData?.templates || []).map((tpl: any) => {
                      const currentEdit = templateEdits[tpl.name] || {
                        header: tpl.header || tpl.defaultHeader || "",
                        body: tpl.body || tpl.defaultBody || "",
                        footer: tpl.footer || tpl.defaultFooter || ""
                      };
                      const isSubmitting = submittingTemplateName === tpl.name;

                      return (
                        <div key={tpl.name} className="border rounded-xl bg-white shadow-xs overflow-hidden">
                          <div className="p-4 bg-slate-50/70 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded">
                                  {tpl.name}
                                </span>
                                <h4 className="font-bold text-slate-900 text-sm">{tpl.title}</h4>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  tpl.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : tpl.status === "PENDING"
                                    ? "bg-amber-100 text-amber-800"
                                    : tpl.status === "REJECTED"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}>
                                  {tpl.status === "APPROVED" && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                                  {tpl.status}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{tpl.description}</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              disabled={isSubmitting}
                              onClick={() => {
                                submitTemplateMutation.mutate({
                                  templateName: tpl.name,
                                  header: currentEdit.header,
                                  body: currentEdit.body,
                                  footer: currentEdit.footer
                                });
                              }}
                              className="text-xs bg-teal-600 hover:bg-teal-700 text-white shrink-0 h-8"
                            >
                              <Send className="w-3 h-3 mr-1" />
                              {isSubmitting ? "Submitting..." : "Save & Submit to Meta"}
                            </Button>
                          </div>

                          <div className="p-4 space-y-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-700">Available Placeholders (click to append):</Label>
                              <div className="flex flex-wrap gap-1.5">
                                {(tpl.variables || []).map((v: any) => (
                                  <button
                                    key={v.index}
                                    type="button"
                                    onClick={() => {
                                      const tag = `{{${v.index}}}`;
                                      const newBody = `${currentEdit.body} ${tag}`;
                                      setTemplateEdits(prev => ({
                                        ...prev,
                                        [tpl.name]: { ...currentEdit, body: newBody }
                                      }));
                                    }}
                                    className="text-[11px] font-mono bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                                  >
                                    {`{{${v.index}}}`} ({v.label})
                                  </button>
                                ))}
                              </div>
                            </div>

                            {tpl.defaultHeader !== undefined && (
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold">Header Text</Label>
                                <Input
                                  value={currentEdit.header || ""}
                                  onChange={e => setTemplateEdits(prev => ({
                                    ...prev,
                                    [tpl.name]: { ...currentEdit, header: e.target.value }
                                  }))}
                                  className="text-xs h-8"
                                />
                              </div>
                            )}

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Message Body</Label>
                              <Textarea
                                value={currentEdit.body}
                                onChange={e => setTemplateEdits(prev => ({
                                  ...prev,
                                  [tpl.name]: { ...currentEdit, body: e.target.value }
                                }))}
                                rows={3}
                                className="text-xs font-mono"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Footer Text</Label>
                              <Input
                                value={currentEdit.footer || ""}
                                onChange={e => setTemplateEdits(prev => ({
                                  ...prev,
                                  [tpl.name]: { ...currentEdit, footer: e.target.value }
                                }))}
                                className="text-xs h-8"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Sub-Tab 5: Abandoned Booking Recovery */}
                <TabsContent value="abandoned" className="space-y-6 mt-0">
                  <div className="p-4 border rounded-lg bg-white shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                          <RotateCcw className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                            Abandoned Booking Recovery Automation
                            <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              24h Window
                            </span>
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Automatically send follow-up reminders with optional discount vouchers to clients who drop off during booking.
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={configForm.abandonedBookingRecoveryEnabled}
                        onCheckedChange={v => setConfigForm({ ...configForm, abandonedBookingRecoveryEnabled: v })}
                      />
                    </div>

                    {configForm.abandonedBookingRecoveryEnabled && (
                      <div className="space-y-4 pt-3 border-t border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 border rounded-lg bg-slate-50 space-y-1.5">
                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Follow-up 1 Delay (Minutes)
                            </Label>
                            <Input
                              type="number"
                              min={5}
                              max={1440}
                              value={configForm.abandonedBookingDelay1Minutes || 60}
                              onChange={e => setConfigForm({ ...configForm, abandonedBookingDelay1Minutes: parseInt(e.target.value) || 60 })}
                              className="text-xs bg-white w-32 h-8"
                            />
                            <p className="text-[11px] text-muted-foreground">Dispatched after client stops responding during booking.</p>
                          </div>
                          <div className="p-3 border rounded-lg bg-slate-50 space-y-1.5">
                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                              <Flame className="w-3.5 h-3.5 text-orange-600" />
                              Follow-up 2 Delay (Hours)
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              max={23}
                              value={configForm.abandonedBookingDelay2Hours || 18}
                              onChange={e => setConfigForm({ ...configForm, abandonedBookingDelay2Hours: parseInt(e.target.value) || 18 })}
                              className="text-xs bg-white w-32 h-8"
                            />
                            <p className="text-[11px] text-muted-foreground">Dispatched as last-chance offer before slot release.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Incentive Discount Code (Optional)</Label>
                            <Input
                              value={configForm.abandonedBookingDiscountCode || ""}
                              onChange={e => setConfigForm({ ...configForm, abandonedBookingDiscountCode: e.target.value.toUpperCase() })}
                              placeholder="e.g. BOOK10"
                              className="text-xs uppercase font-mono h-9"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Discount Percent (%)</Label>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={configForm.abandonedBookingDiscountPercent || "10"}
                              onChange={e => setConfigForm({ ...configForm, abandonedBookingDiscountPercent: e.target.value })}
                              placeholder="10"
                              className="text-xs h-9"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Follow-up #1 Message Template</Label>
                            <Textarea
                              rows={3}
                              value={configForm.abandonedBookingMessage1 || ""}
                              onChange={e => setConfigForm({ ...configForm, abandonedBookingMessage1: e.target.value })}
                              placeholder="👋 Hi {name}! We noticed you started booking an appointment for *{service_name}* ({price}) but did not finish..."
                              className="text-xs font-sans"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Available placeholders: <code className="text-slate-700">{"{name}"}</code>, <code className="text-slate-700">{"{service_name}"}</code>, <code className="text-slate-700">{"{price}"}</code>
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Follow-up #2 Message Template</Label>
                            <Textarea
                              rows={3}
                              value={configForm.abandonedBookingMessage2 || ""}
                              onChange={e => setConfigForm({ ...configForm, abandonedBookingMessage2: e.target.value })}
                              placeholder="⏰ *Last chance!* Your appointment slot for *{service_name}* is waiting.{discount_info}..."
                              className="text-xs font-sans"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Available placeholders: <code className="text-slate-700">{"{name}"}</code>, <code className="text-slate-700">{"{service_name}"}</code>, <code className="text-slate-700">{"{discount_info}"}</code>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Sub-Tab 6: Reports & Alerts */}
                <TabsContent value="reports" className="space-y-6 mt-0">
                  {/* Daily Email Report */}
                  <div className="p-4 border rounded-lg bg-white shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                            Daily Appointments Summary Email Report
                            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              Excel Attachment (.xlsx)
                            </span>
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Automatically emails a daily schedule of all appointments with an attached Excel spreadsheet (.xlsx).
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={configForm.dailyReportEnabled}
                        onCheckedChange={v => setConfigForm({ ...configForm, dailyReportEnabled: v })}
                      />
                    </div>

                    {configForm.dailyReportEnabled && (
                      <div className="space-y-4 pt-3 border-t border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 border rounded-lg bg-slate-50 space-y-2">
                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              Scheduled Daily Trigger Time (24h)
                            </Label>
                            <Input
                              type="time"
                              value={configForm.dailyReportTime || "21:00"}
                              onChange={e => setConfigForm({ ...configForm, dailyReportTime: e.target.value })}
                              className="text-xs bg-white w-36 font-mono h-8"
                            />
                            <p className="text-[11px] text-muted-foreground">Bookings compiled and sent daily at this time.</p>
                          </div>
                          <div className="p-3 border rounded-lg bg-emerald-50/40 border-emerald-100 flex flex-col justify-between">
                            <div>
                              <Label className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                On-Demand Test Email Report
                              </Label>
                              <p className="text-[11px] text-slate-500 mt-1">Send today's appointments schedule immediately for testing.</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSendTestEmailReport}
                              disabled={isSendingTestReport || configForm.dailyReportEmails.length === 0}
                              className="w-full text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-100 mt-2 h-8"
                            >
                              {isSendingTestReport ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                  Sending Email...
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5 mr-1.5" />
                                  Send Test Email Report Now
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Recipient Email Addresses</Label>
                          <div className="flex gap-2">
                            <Input
                              type="email"
                              value={dailyReportEmailInput}
                              onChange={e => setDailyReportEmailInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const trimmed = dailyReportEmailInput.trim().toLowerCase();
                                  if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                                    if (!configForm.dailyReportEmails.includes(trimmed)) {
                                      setConfigForm({ ...configForm, dailyReportEmails: [...configForm.dailyReportEmails, trimmed] });
                                      setDailyReportEmailInput("");
                                    }
                                  }
                                }
                              }}
                              placeholder="e.g. manager@clinic.com"
                              className="text-xs bg-white flex-1 h-9"
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                              onClick={() => {
                                const trimmed = dailyReportEmailInput.trim().toLowerCase();
                                if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                                  if (!configForm.dailyReportEmails.includes(trimmed)) {
                                    setConfigForm({ ...configForm, dailyReportEmails: [...configForm.dailyReportEmails, trimmed] });
                                    setDailyReportEmailInput("");
                                  }
                                }
                              }}
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              Add Email
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {configForm.dailyReportEmails.map((email: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-slate-100 border text-slate-800 text-xs px-2.5 py-1 rounded-full">
                                <Mail className="w-3 h-3 text-emerald-600" />
                                <span className="font-mono text-[11px]">{email}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = configForm.dailyReportEmails.filter((_: any, i: number) => i !== idx);
                                    setConfigForm({ ...configForm, dailyReportEmails: updated });
                                  }}
                                  className="text-slate-400 hover:text-red-600 ml-1"
                                >
                                  <Trash className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Daily WhatsApp Report */}
                  <div className="p-4 border rounded-lg bg-white shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-50 text-green-600 border border-green-100">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                            Daily Appointments Summary WhatsApp Forwarding
                            <span className="text-[10px] font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                              WhatsApp (.xlsx attached)
                            </span>
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Forward daily appointment lists directly to management & specialist WhatsApp numbers.
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={configForm.dailyReportWaEnabled}
                        onCheckedChange={v => setConfigForm({ ...configForm, dailyReportWaEnabled: v })}
                      />
                    </div>

                    {configForm.dailyReportWaEnabled && (
                      <div className="space-y-4 pt-3 border-t border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 border rounded-lg bg-slate-50 space-y-2">
                            <Label className="text-xs font-semibold">Select Forwarding WhatsApp Channel</Label>
                            <Select
                              value={configForm.dailyReportWaChannelId || channelId || ""}
                              onValueChange={v => setConfigForm({ ...configForm, dailyReportWaChannelId: v })}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue placeholder="Select Channel" />
                              </SelectTrigger>
                              <SelectContent>
                                {(allChannels || []).map((c: any) => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs">
                                    {c.name || c.phoneNumber || c.id} ({c.connectionMethod === "qr_code" ? "QR Channel" : "Cloud API"})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="p-3 border rounded-lg bg-green-50/40 border-green-100 flex flex-col justify-between">
                            <div>
                              <Label className="text-xs font-semibold text-green-800 flex items-center gap-1.5">
                                <Send className="w-3.5 h-3.5 text-green-600" />
                                On-Demand WhatsApp Forward
                              </Label>
                              <p className="text-[11px] text-slate-500 mt-1">Send today's appointments schedule to WhatsApp numbers now.</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSendTestWaReport}
                              disabled={isSendingTestWaReport || configForm.dailyReportWaNumbers.length === 0}
                              className="w-full text-xs font-semibold text-green-700 border-green-300 hover:bg-green-100 mt-2 h-8"
                            >
                              {isSendingTestWaReport ? "Sending WhatsApp..." : "Send Test WhatsApp Report Now"}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Recipient WhatsApp Numbers (with country code)</Label>
                          <div className="flex gap-2">
                            <Input
                              type="tel"
                              value={dailyReportWaNumberInput}
                              onChange={e => setDailyReportWaNumberInput(e.target.value)}
                              placeholder="e.g. +919876543210"
                              className="text-xs bg-white flex-1 h-9"
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="text-xs bg-green-600 hover:bg-green-700 text-white h-9"
                              onClick={() => {
                                const trimmed = dailyReportWaNumberInput.trim().replace(/[^0-9+]/g, "");
                                if (trimmed && trimmed.length >= 7) {
                                  if (!configForm.dailyReportWaNumbers.includes(trimmed)) {
                                    setConfigForm({ ...configForm, dailyReportWaNumbers: [...configForm.dailyReportWaNumbers, trimmed] });
                                    setDailyReportWaNumberInput("");
                                  }
                                }
                              }}
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              Add Phone
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {configForm.dailyReportWaNumbers.map((phone: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-slate-100 border text-slate-800 text-xs px-2.5 py-1 rounded-full">
                                <PhoneCall className="w-3 h-3 text-green-600" />
                                <span className="font-mono text-[11px]">{phone}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = configForm.dailyReportWaNumbers.filter((_: any, i: number) => i !== idx);
                                    setConfigForm({ ...configForm, dailyReportWaNumbers: updated });
                                  }}
                                  className="text-slate-400 hover:text-red-600 ml-1"
                                >
                                  <Trash className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Merchant Instant Notification Emails */}
                  <div className="p-4 border rounded-lg bg-white shadow-xs space-y-3">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-purple-600" />
                      Instant Merchant Alert Emails (On Every New Booking)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Receive an instant email alert with the customer's PDF booking slip attached whenever a client schedules an appointment.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={merchantEmailInput}
                        onChange={e => setMerchantEmailInput(e.target.value)}
                        placeholder="e.g. bookings@clinic.com"
                        className="text-xs bg-white flex-1 h-9"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white h-9"
                        onClick={() => {
                          const trimmed = merchantEmailInput.trim().toLowerCase();
                          if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                            if (!configForm.merchantAlertEmails.includes(trimmed)) {
                              setConfigForm({ ...configForm, merchantAlertEmails: [...configForm.merchantAlertEmails, trimmed] });
                              setMerchantEmailInput("");
                            }
                          }
                        }}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add Alert Email
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {configForm.merchantAlertEmails.map((email: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-slate-100 border text-slate-800 text-xs px-2.5 py-1 rounded-full">
                          <Mail className="w-3 h-3 text-purple-600" />
                          <span className="font-mono text-[11px]">{email}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = configForm.merchantAlertEmails.filter((_: any, i: number) => i !== idx);
                              setConfigForm({ ...configForm, merchantAlertEmails: updated });
                            }}
                            className="text-slate-400 hover:text-red-600 ml-1"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Sub-Tab 7: AI & Team Routing */}
                <TabsContent value="ai_team" className="space-y-6 mt-0">
                  {/* AI Assistant Settings */}
                  <div className="p-4 border rounded-lg bg-purple-50/20 space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      Service Booking AI Assistant Settings
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-semibold text-sm">Enable AI Assistant for Appointment Inquiries</Label>
                        <p className="text-xs text-muted-foreground">Allow AI to discuss services, pricing, specialist availability, and answer customer FAQs.</p>
                      </div>
                      <Switch
                        checked={configForm.aiEnabled}
                        onCheckedChange={v => setConfigForm({ ...configForm, aiEnabled: v })}
                      />
                    </div>

                    {configForm.aiEnabled && (
                      <div className="space-y-4 pt-3 border-t border-purple-100">
                        {/* Billing Mode */}
                        <div className="bg-white p-3.5 rounded-lg border space-y-2">
                          <Label className="text-xs font-bold flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-purple-600" />
                            API Key & Billing Mode
                          </Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div
                              onClick={() => setConfigForm({ ...configForm, apiKeySource: "own_key" })}
                              className={`cursor-pointer rounded-lg p-3 border text-xs transition-all ${
                                configForm.apiKeySource === "own_key"
                                  ? "border-purple-600 bg-purple-50/60 ring-2 ring-purple-600/20 shadow-xs"
                                  : "border-slate-200 bg-white"
                              }`}
                            >
                              <div className="font-bold text-slate-900">Use My Own API Keys</div>
                              <p className="text-[11px] text-muted-foreground mt-1">Free mode using your configured OpenAI, Sarvam & Groq keys.</p>
                            </div>
                            <div
                              onClick={() => setConfigForm({ ...configForm, apiKeySource: "admin_key" })}
                              className={`cursor-pointer rounded-lg p-3 border text-xs transition-all ${
                                configForm.apiKeySource === "admin_key"
                                  ? "border-purple-600 bg-purple-50/60 ring-2 ring-purple-600/20 shadow-xs"
                                  : "border-slate-200 bg-white"
                              }`}
                            >
                              <div className="font-bold text-slate-900">Use Platform Admin Keys</div>
                              <p className="text-[11px] text-muted-foreground mt-1">Zero setup. Pay-as-you-go billing directly from wallet.</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-semibold flex items-center gap-1.5">
                                <Bot className="w-3.5 h-3.5 text-purple-600" />
                                AI Inbox Takeover
                              </Label>
                              <p className="text-[11px] text-muted-foreground">Auto-respond to all incoming messages with AI.</p>
                            </div>
                            <Switch
                              checked={configForm.aiTakeoverEnabled}
                              onCheckedChange={v => setConfigForm({ ...configForm, aiTakeoverEnabled: v })}
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-semibold flex items-center gap-1.5">
                                <Mic className="w-3.5 h-3.5 text-purple-600" />
                                Respond with Audio Notes
                              </Label>
                              <p className="text-[11px] text-muted-foreground">Synthesize spoken voice notes for inbound audios.</p>
                            </div>
                            <Switch
                              checked={configForm.aiVoiceEnabled}
                              onCheckedChange={v => setConfigForm({ ...configForm, aiVoiceEnabled: v })}
                            />
                          </div>
                        </div>

                        {configForm.aiVoiceEnabled && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border rounded-lg bg-white">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Active AI Voice Profile</Label>
                              <Select
                                value={configForm.voiceProfileId || "default"}
                                onValueChange={v => setConfigForm({ ...configForm, voiceProfileId: v === "default" ? "" : v })}
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Select Voice Profile" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="default">Default Profile</SelectItem>
                                  {(voiceProfiles || []).map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name} ({p.provider.toUpperCase()} - {p.languageCode})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Voice Language Mode</Label>
                              <Select
                                value={configForm.aiVoiceLanguageMode || "profile"}
                                onValueChange={v => setConfigForm({ ...configForm, aiVoiceLanguageMode: v })}
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="profile">Use Voice Profile Language</SelectItem>
                                  <SelectItem value="auto">Auto-Detect Customer Language</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label className="text-xs">Custom AI System Prompt</Label>
                          <Textarea
                            value={configForm.aiSystemPrompt || ""}
                            onChange={e => setConfigForm({ ...configForm, aiSystemPrompt: e.target.value })}
                            placeholder="You are an appointment booking assistant for our clinic/salon. Answer client questions professionally and encourage them to complete their booking."
                            rows={3}
                            className="text-xs bg-white font-sans"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Team Auto-Assignment with Round-Robin Exclusions */}
                  <div className="p-4 border rounded-lg bg-white shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-800">Team Auto-Assignment & Conversation Routing</h3>
                          <p className="text-xs text-muted-foreground">
                            Automatically assign incoming client chats to staff logins (Permanent Agent or Round-Robin).
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={configForm.autoAssignEnabled}
                        onCheckedChange={v => setConfigForm({ ...configForm, autoAssignEnabled: v })}
                      />
                    </div>

                    {configForm.autoAssignEnabled && (
                      <div className="space-y-4 pt-1">
                        {/* Mode Selector */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div
                            onClick={() => setConfigForm({ ...configForm, autoAssignMode: "permanent" })}
                            className={`cursor-pointer rounded-lg p-3.5 border transition-all ${
                              configForm.autoAssignMode === "permanent"
                                ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20 shadow-xs"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="autoAssignMode"
                                checked={configForm.autoAssignMode === "permanent"}
                                onChange={() => setConfigForm({ ...configForm, autoAssignMode: "permanent" })}
                                className="text-blue-600"
                              />
                              <span className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                                Permanent Team Member
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 pl-5">Assign all incoming client chats strictly to one dedicated team member.</p>
                          </div>

                          <div
                            onClick={() => setConfigForm({ ...configForm, autoAssignMode: "round_robin" })}
                            className={`cursor-pointer rounded-lg p-3.5 border transition-all ${
                              configForm.autoAssignMode === "round_robin"
                                ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20 shadow-xs"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="autoAssignMode"
                                checked={configForm.autoAssignMode === "round_robin"}
                                onChange={() => setConfigForm({ ...configForm, autoAssignMode: "round_robin" })}
                                className="text-blue-600"
                              />
                              <span className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                                <Shuffle className="w-3.5 h-3.5 text-blue-600" />
                                Round Robin (Multi-Agent Distribution)
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 pl-5">Evenly distribute incoming chats among available specialists based on least recent activity.</p>
                          </div>
                        </div>

                        {/* Permanent mode selector */}
                        {configForm.autoAssignMode === "permanent" && (
                          <div className="p-3.5 rounded-lg border border-blue-100 bg-blue-50/30 space-y-2">
                            <Label className="text-xs font-semibold text-slate-700">Select Permanent Assignee</Label>
                            <Select
                              value={configForm.autoAssignUserId ? String(configForm.autoAssignUserId) : undefined}
                              onValueChange={v => setConfigForm({ ...configForm, autoAssignUserId: v || "" })}
                            >
                              <SelectTrigger className="h-9 text-xs bg-white">
                                <SelectValue placeholder="Select team member..." />
                              </SelectTrigger>
                              <SelectContent>
                                {(teamMembers || []).map((m: any) => (
                                  <SelectItem key={String(m.id)} value={String(m.id)}>
                                    {m.name || m.username || m.email} ({m.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Round-Robin mode with Exclusions */}
                        {configForm.autoAssignMode === "round_robin" && (
                          <div className="p-3.5 rounded-lg border border-blue-100 bg-blue-50/30 space-y-3">
                            <div>
                              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                <Shuffle className="w-3.5 h-3.5 text-blue-600" />
                                Round Robin Distribution Pool & Exclusions
                              </Label>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Check any team members to <strong>exclude</strong> from receiving round-robin chats (e.g. managers or offline staff):
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-md border">
                              {(teamMembers || []).map((m: any) => {
                                const isExcluded = (configForm.autoAssignExcludedUserIds || []).includes(String(m.id));
                                return (
                                  <div
                                    key={m.id}
                                    onClick={() => {
                                      const current = configForm.autoAssignExcludedUserIds || [];
                                      const updated = isExcluded
                                        ? current.filter((id: string) => id !== String(m.id))
                                        : [...current, String(m.id)];
                                      setConfigForm({ ...configForm, autoAssignExcludedUserIds: updated });
                                    }}
                                    className={`flex items-center gap-2.5 p-2 rounded border cursor-pointer text-xs transition-colors ${
                                      isExcluded
                                        ? "bg-rose-50 border-rose-200 text-rose-800"
                                        : "bg-slate-50/60 border-slate-200 text-slate-800 hover:bg-slate-100"
                                    }`}
                                  >
                                    <Checkbox
                                      checked={isExcluded}
                                      onCheckedChange={() => {}}
                                    />
                                    <div className="truncate">
                                      <div className="font-medium truncate">{m.name || m.username}</div>
                                      <div className="text-[10px] text-muted-foreground truncate">{m.email}</div>
                                    </div>
                                    {isExcluded && (
                                      <span className="ml-auto text-[10px] font-bold text-rose-600 uppercase">
                                        Excluded
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manual Recovery Message Modal */}
      <Dialog open={recoveryModalOpen} onOpenChange={setRecoveryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              Dispatch Booking Recovery Message
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send a tailored appointment recovery message to <strong>{selectedBookingForRecovery?.customerPhone}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Message Copy</Label>
              <Textarea
                rows={4}
                value={customRecoveryMessage}
                onChange={e => setCustomRecoveryMessage(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRecoveryModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
              onClick={() => {
                if (selectedBookingForRecovery) {
                  recoverBookingMutation.mutate({
                    id: selectedBookingForRecovery.id,
                    customMessage: customRecoveryMessage
                  });
                }
              }}
              disabled={recoverBookingMutation.isPending}
            >
              {recoverBookingMutation.isPending ? "Sending..." : "Send Recovery Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service CRUD Modal */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingService ? "Edit Service" : "Create New Service"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Service Name *</Label>
                <Input
                  value={serviceForm.name}
                  onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="e.g. Hair Styling & Treatment"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select
                  value={serviceForm.categoryId || "none"}
                  onValueChange={v => setServiceForm({ ...serviceForm, categoryId: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {(categoriesData?.categories || []).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Price ({serviceForm.currency})</Label>
                <Input
                  type="number"
                  value={serviceForm.price}
                  onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duration (Minutes)</Label>
                <Input
                  type="number"
                  value={serviceForm.durationMinutes}
                  onChange={e => setServiceForm({ ...serviceForm, durationMinutes: parseInt(e.target.value) || 30 })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Trigger Keyword (Optional)</Label>
                <Input
                  value={serviceForm.triggerKeyword || ""}
                  onChange={e => {
                    const kw = e.target.value;
                    setServiceForm({
                      ...serviceForm,
                      triggerKeyword: kw,
                      isTriggerEnabled: kw.trim().length > 0 ? true : serviceForm.isTriggerEnabled
                    });
                  }}
                  placeholder="e.g. hair, facial"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Enable Keyword Direct Trigger</Label>
                <p className="text-[10px] text-gray-500">
                  Allow customers to jump directly into booking this service by typing &quot;{serviceForm.triggerKeyword || keyword}&quot;
                </p>
              </div>
              <Switch
                checked={Boolean(serviceForm.isTriggerEnabled)}
                onCheckedChange={checked => setServiceForm({ ...serviceForm, isTriggerEnabled: checked })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Short Description</Label>
              <Textarea
                value={serviceForm.description}
                onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsServiceModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              onClick={() => {
                if (!serviceForm.name) {
                  toast({ title: "Name Required", description: "Please enter a service name.", variant: "destructive" });
                  return;
                }
                saveServiceMutation.mutate({
                  ...(editingService ? { id: editingService.id } : {}),
                  ...serviceForm
                });
              }}
              disabled={saveServiceMutation.isPending}
            >
              {saveServiceMutation.isPending ? "Saving..." : "Save Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Specialist / Master Modal */}
      <Dialog open={isMasterModalOpen} onOpenChange={setIsMasterModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingMaster ? "Edit Specialist" : "Add New Specialist"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Specialist Name *</Label>
                <Input
                  value={masterForm.name}
                  onChange={e => setMasterForm({ ...masterForm, name: e.target.value })}
                  placeholder="e.g. Dr. Alex Carter"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Title / Role</Label>
                <Input
                  value={masterForm.title}
                  onChange={e => setMasterForm({ ...masterForm, title: e.target.value })}
                  placeholder="e.g. Senior Stylist / Dermatologist"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Assign to Services</Label>
              <div className="grid grid-cols-2 gap-2 p-2 border rounded-md max-h-36 overflow-y-auto">
                {(servicesData?.services || []).map(s => {
                  const isAssigned = masterForm.serviceIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        const updated = isAssigned
                          ? masterForm.serviceIds.filter(id => id !== s.id)
                          : [...masterForm.serviceIds, s.id];
                        setMasterForm({ ...masterForm, serviceIds: updated });
                      }}
                      className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer ${isAssigned ? "bg-blue-50 text-blue-800 font-semibold" : "hover:bg-slate-50"}`}
                    >
                      <Checkbox checked={isAssigned} onCheckedChange={() => {}} />
                      <span>{s.name}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">If none selected, this specialist will be available for all services.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Start Time</Label>
                <Input
                  type="time"
                  value={masterForm.workingHours?.startTime || "09:00"}
                  onChange={e => setMasterForm({
                    ...masterForm,
                    workingHours: { ...masterForm.workingHours, startTime: e.target.value }
                  })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Time</Label>
                <Input
                  type="time"
                  value={masterForm.workingHours?.endTime || "18:00"}
                  onChange={e => setMasterForm({
                    ...masterForm,
                    workingHours: { ...masterForm.workingHours, endTime: e.target.value }
                  })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <Label className="text-xs flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                Specialist Timezone (Optional Override)
              </Label>
              <Select
                value={masterForm.timezone || "default"}
                onValueChange={v => setMasterForm({ ...masterForm, timezone: v === "default" ? "" : v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="default" className="text-xs font-semibold text-blue-600">
                    Use Business Timezone ({configForm.timezone || "Asia/Kolkata"})
                  </SelectItem>
                  {COMMON_TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value} className="text-xs">
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Override if this specialist operates in a different timezone than the business.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsMasterModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              onClick={() => {
                if (!masterForm.name) {
                  toast({ title: "Name Required", description: "Please enter specialist name.", variant: "destructive" });
                  return;
                }
                saveMasterMutation.mutate({
                  ...(editingMaster ? { id: editingMaster.id } : {}),
                  ...masterForm
                });
              }}
              disabled={saveMasterMutation.isPending}
            >
              {saveMasterMutation.isPending ? "Saving..." : "Save Specialist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Category Name *</Label>
              <Input
                value={categoryForm.name}
                onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g. Hair, Skin, Consultation"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                value={categoryForm.description}
                onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Category description"
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
              onClick={() => {
                if (!categoryForm.name) return;
                saveCategoryMutation.mutate({
                  ...(editingCategory ? { id: editingCategory.id } : {}),
                  ...categoryForm
                });
              }}
              disabled={saveCategoryMutation.isPending}
            >
              Save Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Gallery Dialog */}
      <MediaGalleryDialog
        open={isGalleryOpen}
        onOpenChange={setIsGalleryOpen}
        onSelect={(rawUrl: any) => {
          const url = typeof rawUrl === "string" ? rawUrl : rawUrl?.url || "";
          if (galleryTargetField === "businessLogo") {
            setConfigForm((prev: any) => ({ ...prev, businessLogo: url }));
          } else if (galleryTargetField === "welcomeHeaderUrl") {
            setConfigForm((prev: any) => ({ ...prev, welcomeHeaderUrl: url }));
          } else if (galleryTargetField === "qrCodeUrl") {
            setConfigForm((prev: any) => ({ ...prev, qrCodeUrl: url }));
          } else if (galleryTargetField?.startsWith("welcome_seq_")) {
            const idx = parseInt(galleryTargetField.replace("welcome_seq_", ""), 10);
            if (!isNaN(idx) && configForm.welcomeMessages?.[idx]) {
              const updated = [...configForm.welcomeMessages];
              updated[idx].mediaUrl = url;
              setConfigForm((prev: any) => ({ ...prev, welcomeMessages: updated }));
            }
          }
          setIsGalleryOpen(false);
          setGalleryTargetField(null);
          setGalleryTargetMsgIdx(null);
        }}
      />
    </div>
  );
}
