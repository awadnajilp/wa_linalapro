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
  Check, CreditCard, MessageSquare, Bot, UserPlus, Shuffle, Bell
} from "lucide-react";
import { useChannelContext } from "@/contexts/channel-context";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaGalleryDialog } from "@/components/media/MediaGalleryDialog";
import { ChannelSwitcher } from "@/components/channel-switcher";

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

  const [activeTab, setActiveTab] = useState("bookings");
  const [configSubTab, setConfigSubTab] = useState("general");

  // Filter States
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceFilter, setSelectedServiceFilter] = useState("all");

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
    checkoutFields: ["name", "phone", "notes"],
    currency: "INR",
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
    dailyReportWaEnabled: false,
    dailyReportWaNumbers: [] as string[],
    aiEnabled: false,
    aiTakeoverEnabled: false,
    aiSystemPrompt: ""
  });

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

  const { data: configData } = useQuery<{ config: any }>({
    queryKey: ["/api/service-booking/config", activeChannel?.id],
    queryFn: () => apiRequest("GET", `/api/service-booking/config?channelId=${activeChannel?.id || ""}`).then(r => r.json())
  });

  const { data: teamMembers } = useQuery<any[]>({
    queryKey: ["/api/team"],
    queryFn: () => apiRequest("GET", "/api/team").then(r => r.json()).catch(() => [])
  });

  useEffect(() => {
    if (configData?.config) {
      setConfigForm((prev: any) => ({
        ...prev,
        ...configData.config,
        defaultWorkingHours: configData.config.defaultWorkingHours || prev.defaultWorkingHours,
        checkoutFields: Array.isArray(configData.config.checkoutFields) ? configData.config.checkoutFields : prev.checkoutFields,
        dailyReportWaNumbers: Array.isArray(configData.config.dailyReportWaNumbers) ? configData.config.dailyReportWaNumbers : prev.dailyReportWaNumbers
      }));
    }
  }, [configData]);

  // Mutations
  const saveServiceMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/service-booking/services", data).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Success", description: "Service saved successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/services"] });
      setIsServiceModalOpen(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/service-booking/services/${id}`).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Deleted", description: "Service removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/services"] });
    }
  });

  const saveMasterMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/service-booking/masters", data).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Success", description: "Specialist saved successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/masters"] });
      setIsMasterModalOpen(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const deleteMasterMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/service-booking/masters/${id}`).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Deleted", description: "Specialist removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/masters"] });
    }
  });

  const saveCategoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/service-booking/categories", data).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Success", description: "Category saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/categories"] });
      setIsCategoryModalOpen(false);
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/service-booking/categories/${id}`).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Deleted", description: "Category removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/categories"] });
    }
  });

  const updateBookingStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PUT", `/api/service-booking/bookings/${id}/status`, { status }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Status Updated", description: "Booking status has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/service-booking/bookings"] });
    }
  });

  const saveConfigMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/service-booking/config", data).then(r => r.json()),
    onSuccess: () => toast({ title: "Saved", description: "All Service Booking settings updated successfully." }),
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const openServiceModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        name: service.name,
        categoryId: service.categoryId || "",
        price: service.price,
        durationMinutes: service.durationMinutes || 30,
        description: service.description || "",
        longDescription: service.longDescription || "",
        triggerKeyword: service.triggerKeyword || "",
        isTriggerEnabled: service.isTriggerEnabled ?? false,
        currency: service.currency || "INR",
        isActive: service.isActive ?? true,
        serviceMessages: Array.isArray(service.serviceMessages) ? [...service.serviceMessages] : []
      });
    } else {
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
        currency: "INR",
        isActive: true,
        serviceMessages: []
      });
    }
    setIsServiceModalOpen(true);
  };

  const openMasterModal = (master?: ServiceMaster) => {
    if (master) {
      setEditingMaster(master);
      setMasterForm({
        name: master.name,
        title: master.title || "Specialist",
        bio: master.bio || "",
        photoUrl: master.photoUrl || "",
        serviceIds: Array.isArray(master.serviceIds) ? [...master.serviceIds] : [],
        slotIntervalMinutes: master.slotIntervalMinutes || 30,
        workingHours: master.workingHours || {
          days: [1, 2, 3, 4, 5, 6],
          startTime: "09:00",
          endTime: "18:00",
          breakStartTime: "13:00",
          breakEndTime: "14:00"
        },
        isActive: master.isActive ?? true
      });
    } else {
      setEditingMaster(null);
      setMasterForm({
        name: "",
        title: "Specialist",
        bio: "",
        photoUrl: "",
        serviceIds: [],
        slotIntervalMinutes: 30,
        workingHours: {
          days: [1, 2, 3, 4, 5, 6],
          startTime: "09:00",
          endTime: "18:00",
          breakStartTime: "13:00",
          breakEndTime: "14:00"
        },
        isActive: true
      });
    }
    setIsMasterModalOpen(true);
  };

  const services = servicesData?.services || [];
  const masters = mastersData?.masters || [];
  const categories = categoriesData?.categories || [];
  const bookings = bookingsData?.bookings || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-7 h-7 text-blue-600" />
            Service Bookings & Appointments
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage your service catalog, staff specialists, dynamic real-time slot scheduling, and WhatsApp automated booking flows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ChannelSwitcher />
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Bookings ({bookings.length})
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Services ({services.length})
          </TabsTrigger>
          <TabsTrigger value="masters" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Specialists / Staff ({masters.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            Categories ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BOOKINGS */}
        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>Appointments & Bookings</CardTitle>
                  <CardDescription>Live bookings received from your WhatsApp booking flows.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("/api/service-booking/bookings/export", "_blank")}
                    className="flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Export Excel
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                <Input
                  placeholder="Search by customer, phone, or booking #..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedServiceFilter} onValueChange={setSelectedServiceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isBookingsLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading bookings...</div>
              ) : bookings.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-2" />
                  <p>No appointments found matching your filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Specialist</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="font-semibold text-blue-600">{b.bookingNumber}</TableCell>
                          <TableCell>
                            <div className="font-medium">{b.customerName || "Customer"}</div>
                            <div className="text-xs text-muted-foreground">{b.customerPhone}</div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{b.serviceName}</span>
                            <div className="text-xs text-muted-foreground">{b.durationMinutes || 30} mins</div>
                          </TableCell>
                          <TableCell>{b.masterName || <span className="text-muted-foreground italic">Any Specialist</span>}</TableCell>
                          <TableCell>
                            <div className="font-medium">{b.bookingDate}</div>
                            <div className="text-xs text-muted-foreground">{b.startTime} - {b.endTime}</div>
                          </TableCell>
                          <TableCell className="font-medium text-emerald-600">
                            {b.currency} {b.totalAmount}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                              {b.paymentMethod} ({b.paymentStatus})
                            </span>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={b.status}
                              onValueChange={val => updateBookingStatusMutation.mutate({ id: b.id, status: val })}
                            >
                              <SelectTrigger className="h-8 text-xs w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`/api/service-booking/bookings/${b.id}/pdf`, "_blank")}
                              title="Download PDF Slip"
                            >
                              <Download className="w-4 h-4 text-slate-600" />
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
        </TabsContent>

        {/* TAB 2: SERVICES */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Service Catalog</h2>
              <p className="text-xs text-muted-foreground">Configure the services offered to customers via WhatsApp.</p>
            </div>
            <Button onClick={() => openServiceModal()} className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Service
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(s => (
              <Card key={s.id} className="flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{s.name}</CardTitle>
                      <CardDescription className="text-xs">{s.durationMinutes} minutes duration</CardDescription>
                    </div>
                    <span className="text-base font-bold text-emerald-600">
                      {s.currency || "INR"} {s.price}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {s.description && (
                    <p className="text-muted-foreground text-xs line-clamp-2">{s.description}</p>
                  )}
                  {s.triggerKeyword && s.isTriggerEnabled && (
                    <div className="text-xs bg-blue-50 text-blue-700 rounded px-2 py-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Direct Trigger: *{s.triggerKeyword}*
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className={`text-xs px-2 py-0.5 rounded ${s.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openServiceModal(s)}>
                        <Edit className="w-4 h-4 text-slate-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteServiceMutation.mutate(s.id)}>
                        <Trash className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 3: SPECIALISTS / MASTERS */}
        <TabsContent value="masters" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Specialists & Staff Masters</h2>
              <p className="text-xs text-muted-foreground">Assign specialists to services, define individual working hours and slot durations.</p>
            </div>
            <Button onClick={() => openMasterModal()} className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Specialist
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {masters.map(m => (
              <Card key={m.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{m.name}</CardTitle>
                      <CardDescription className="text-xs">{m.title || "Specialist"}</CardDescription>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {m.slotIntervalMinutes || 30}m slots
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <div>
                    <strong>Working Hours:</strong> {m.workingHours?.startTime || "09:00"} - {m.workingHours?.endTime || "18:00"}
                  </div>
                  <div>
                    <strong>Break Time:</strong> {m.workingHours?.breakStartTime || "13:00"} - {m.workingHours?.breakEndTime || "14:00"}
                  </div>
                  <div>
                    <strong>Assigned Services:</strong> {Array.isArray(m.serviceIds) && m.serviceIds.length > 0 ? `${m.serviceIds.length} service(s)` : "All Services"}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className={`px-2 py-0.5 rounded ${m.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      {m.isActive ? "Active" : "Inactive"}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openMasterModal(m)}>
                        <Edit className="w-4 h-4 text-slate-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMasterMutation.mutate(m.id)}>
                        <Trash className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 4: CATEGORIES */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Service Categories</h2>
              <p className="text-xs text-muted-foreground">Group your services by category.</p>
            </div>
            <Button
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: "", description: "", sortOrder: 0 });
                setIsCategoryModalOpen(true);
              }}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Category
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                      No categories created yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.description || "-"}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCategory(c);
                            setCategoryForm({ name: c.name, description: c.description || "", sortOrder: c.sortOrder || 0 });
                            setIsCategoryModalOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteCategoryMutation.mutate(c.id)}>
                          <Trash className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 5: COMPREHENSIVE SETTINGS */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    Service Booking & Flow Settings
                  </CardTitle>
                  <CardDescription>
                    Configure business identity, payments, working hours, auto-assignment, and instant WhatsApp alerts.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => saveConfigMutation.mutate({
                    ...configForm,
                    channelId: activeChannel?.id
                  })}
                  disabled={saveConfigMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saveConfigMutation.isPending ? "Saving..." : "Save All Settings"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={configSubTab} onValueChange={setConfigSubTab} className="w-full">
                <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto p-1 bg-slate-100 rounded-xl mb-6 gap-1">
                  <TabsTrigger value="general" className="flex items-center gap-1.5 py-2 text-xs font-semibold">
                    <Settings className="w-3.5 h-3.5 text-blue-600" /> General
                  </TabsTrigger>
                  <TabsTrigger value="checkout" className="flex items-center gap-1.5 py-2 text-xs font-semibold">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Checkout & Payments
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="flex items-center gap-1.5 py-2 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Working Hours & Slots
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="flex items-center gap-1.5 py-2 text-xs font-semibold">
                    <Bell className="w-3.5 h-3.5 text-purple-600" /> WhatsApp & Alerts
                  </TabsTrigger>
                  <TabsTrigger value="ai_team" className="flex items-center gap-1.5 py-2 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> AI & Team Routing
                  </TabsTrigger>
                </TabsList>

                {/* Sub-Tab 1: General Settings */}
                <TabsContent value="general" className="space-y-6">
                  {/* Business Identity */}
                  <div className="p-4 border rounded-lg bg-slate-50/50 space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      Business Identity (Displayed on Booking Slips & Invoices)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>Business / Salon Name</Label>
                        <Input
                          value={configForm.businessName || ""}
                          onChange={e => setConfigForm({ ...configForm, businessName: e.target.value })}
                          placeholder="e.g. Apex Wellness & Spa"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Business Website</Label>
                        <Input
                          value={configForm.businessWebsite || ""}
                          onChange={e => setConfigForm({ ...configForm, businessWebsite: e.target.value })}
                          placeholder="e.g. www.apexwellness.com"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Business Logo URL</Label>
                        <div className="flex gap-2">
                          <Input
                            value={configForm.businessLogo || ""}
                            onChange={e => setConfigForm({ ...configForm, businessLogo: e.target.value })}
                            placeholder="https://.../logo.png"
                            className="h-9 text-xs flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setGalleryTargetField("businessLogo");
                              setIsGalleryOpen(true);
                            }}
                            className="h-9 px-2"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Business Address / Venue</Label>
                      <Input
                        value={configForm.businessAddress || ""}
                        onChange={e => setConfigForm({ ...configForm, businessAddress: e.target.value })}
                        placeholder="e.g. 101 MG Road, Suite 4B, Bangalore"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Flow Triggers & Welcome */}
                  <div className="p-4 border rounded-lg space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      Flow Triggers & Welcome Messages
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-semibold text-sm">Enable Automated Booking Flow</Label>
                        <p className="text-xs text-muted-foreground">Automatically trigger booking dialogs when customers message your trigger keyword.</p>
                      </div>
                      <Switch
                        checked={configForm.isBookingFlowActive}
                        onCheckedChange={v => setConfigForm({ ...configForm, isBookingFlowActive: v })}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Global Booking Trigger Keyword</Label>
                        <Input
                          value={configForm.bookingTriggerKeyword || "book"}
                          onChange={e => setConfigForm({ ...configForm, bookingTriggerKeyword: e.target.value })}
                          placeholder="e.g. book, appointment, services"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Currency Symbol/Code</Label>
                        <Input
                          value={configForm.currency || "INR"}
                          onChange={e => setConfigForm({ ...configForm, currency: e.target.value })}
                          placeholder="e.g. INR, SAR, USD"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Welcome Message Body</Label>
                      <Textarea
                        value={configForm.welcomeMessage || ""}
                        onChange={e => setConfigForm({ ...configForm, welcomeMessage: e.target.value })}
                        placeholder="Welcome! Please choose a service to get started:"
                        rows={3}
                        className="text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Welcome Header Media Type</Label>
                        <Select
                          value={configForm.welcomeHeaderType || "none"}
                          onValueChange={v => setConfigForm({ ...configForm, welcomeHeaderType: v })}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="image">Image Banner</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {configForm.welcomeHeaderType !== "none" && (
                        <div className="space-y-1.5">
                          <Label>Header Media URL</Label>
                          <div className="flex gap-2">
                            <Input
                              value={configForm.welcomeHeaderUrl || ""}
                              onChange={e => setConfigForm({ ...configForm, welcomeHeaderUrl: e.target.value })}
                              placeholder="https://.../banner.jpg"
                              className="h-9 text-xs flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setGalleryTargetField("welcomeHeaderUrl");
                                setIsGalleryOpen(true);
                              }}
                              className="h-9 px-2"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Sub-Tab 2: Checkout & Payments */}
                <TabsContent value="checkout" className="space-y-6">
                  {/* Checkout Fields */}
                  <div className="p-4 border rounded-lg space-y-3">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2">
                      Customer Checkout Fields to Collect
                    </h3>
                    <div className="flex flex-wrap gap-4 text-xs">
                      {["name", "phone", "notes", "address", "email"].map(f => {
                        const isChecked = Array.isArray(configForm.checkoutFields) && configForm.checkoutFields.includes(f);
                        return (
                          <label key={f} className="flex items-center gap-2 cursor-pointer bg-slate-50 border p-2 rounded-md">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={checked => {
                                const current = Array.isArray(configForm.checkoutFields) ? configForm.checkoutFields : [];
                                const updated = checked ? [...current, f] : current.filter((c: string) => c !== f);
                                setConfigForm({ ...configForm, checkoutFields: updated });
                              }}
                            />
                            <span className="capitalize font-medium">{f}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="p-4 border rounded-lg space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      Payment Methods & Gateways
                    </h3>

                    {/* Pay at Venue */}
                    <div className="space-y-2 border-b pb-4">
                      <Label className="font-semibold">Pay at Venue / Cash on Delivery</Label>
                      <Input
                        value={configForm.labelCod || "Pay at Venue (Cash/Card)"}
                        onChange={e => setConfigForm({ ...configForm, labelCod: e.target.value })}
                        placeholder="Pay at Venue (Cash/Card)"
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* UPI Direct */}
                    <div className="space-y-3 border-b pb-4">
                      <Label className="font-semibold text-sm">UPI Direct Pay (GPay / PhonePe / Paytm)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                          placeholder="UPI ID (e.g. name@upi)"
                          value={configForm.upiId || ""}
                          onChange={e => setConfigForm({ ...configForm, upiId: e.target.value })}
                          className="h-9 text-xs"
                        />
                        <Input
                          placeholder="UPI Merchant / Business Name"
                          value={configForm.upiMerchantName || ""}
                          onChange={e => setConfigForm({ ...configForm, upiMerchantName: e.target.value })}
                          className="h-9 text-xs"
                        />
                        <Input
                          placeholder="Custom Label in WhatsApp"
                          value={configForm.labelUpiDirect || "GPay/PhonePe(UPI)"}
                          onChange={e => setConfigForm({ ...configForm, labelUpiDirect: e.target.value })}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    {/* QR Code Pay */}
                    <div className="space-y-3 border-b pb-4">
                      <Label className="font-semibold text-sm">QR Code / Account Info Pay</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Store QR Code Image URL"
                            value={configForm.qrCodeUrl || ""}
                            onChange={e => setConfigForm({ ...configForm, qrCodeUrl: e.target.value })}
                            className="h-9 text-xs flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setGalleryTargetField("qrCodeUrl");
                              setIsGalleryOpen(true);
                            }}
                            className="h-9 px-2"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Custom Label in WhatsApp"
                          value={configForm.labelQrPay || "Acc. Info(QR Code)"}
                          onChange={e => setConfigForm({ ...configForm, labelQrPay: e.target.value })}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    {/* Razorpay Gateway */}
                    <div className="space-y-3 border-b pb-4">
                      <Label className="font-semibold text-sm">Razorpay Payment Gateway</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          placeholder="Razorpay Key ID"
                          value={configForm.razorpayKeyId || ""}
                          onChange={e => setConfigForm({ ...configForm, razorpayKeyId: e.target.value })}
                          className="h-9 text-xs"
                        />
                        <Input
                          placeholder="Razorpay Key Secret"
                          type="password"
                          value={configForm.razorpayKeySecret || ""}
                          onChange={e => setConfigForm({ ...configForm, razorpayKeySecret: e.target.value })}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    {/* Instamojo Gateway */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold text-sm">Instamojo Gateway</Label>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={configForm.instamojoSandbox}
                            onCheckedChange={v => setConfigForm({ ...configForm, instamojoSandbox: !!v })}
                          />
                          <span className="text-xs text-muted-foreground">Sandbox / Test Mode</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          placeholder="Instamojo API Key"
                          value={configForm.instamojoApiKey || ""}
                          onChange={e => setConfigForm({ ...configForm, instamojoApiKey: e.target.value })}
                          className="h-9 text-xs"
                        />
                        <Input
                          placeholder="Instamojo Auth Token"
                          type="password"
                          value={configForm.instamojoAuthToken || ""}
                          onChange={e => setConfigForm({ ...configForm, instamojoAuthToken: e.target.value })}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Sub-Tab 3: Working Hours & Slots */}
                <TabsContent value="schedule" className="space-y-6">
                  <div className="p-4 border rounded-lg space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Default Business Schedule & Time Slot Rules
                    </h3>

                    {/* Working Days */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Operating Days of the Week</Label>
                      <div className="flex flex-wrap gap-2">
                        {DEFAULT_DAYS.map(d => {
                          const activeDays: number[] = configForm.defaultWorkingHours?.days || [1, 2, 3, 4, 5, 6];
                          const isChecked = activeDays.includes(d.day);
                          return (
                            <label
                              key={d.day}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                                isChecked ? "bg-blue-50 border-blue-200 text-blue-800 font-bold" : "bg-slate-50 border-slate-200 text-slate-500"
                              }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={checked => {
                                  const updated = checked
                                    ? [...activeDays, d.day]
                                    : activeDays.filter((val: number) => val !== d.day);
                                  setConfigForm({
                                    ...configForm,
                                    defaultWorkingHours: { ...configForm.defaultWorkingHours, days: updated }
                                  });
                                }}
                              />
                              <span>{d.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hours & Breaks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Business Opening Time (24h)</Label>
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
                        <Label className="text-xs">Business Closing Time (24h)</Label>
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
                        <Label className="text-xs">Lunch / Break Start (24h)</Label>
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
                        <Label className="text-xs">Lunch / Break End (24h)</Label>
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

                    {/* Slot Intervals & Advances */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Default Slot Step Interval (Minutes)</Label>
                        <Input
                          type="number"
                          value={configForm.defaultSlotIntervalMinutes || 30}
                          onChange={e => setConfigForm({ ...configForm, defaultSlotIntervalMinutes: parseInt(e.target.value, 10) || 30 })}
                          className="h-9 text-xs"
                        />
                        <p className="text-xs text-muted-foreground">e.g. 15, 30, 45, or 60 minutes between available slots.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Max Days in Advance for Booking</Label>
                        <Input
                          type="number"
                          value={configForm.maxDaysInAdvance || 14}
                          onChange={e => setConfigForm({ ...configForm, maxDaysInAdvance: parseInt(e.target.value, 10) || 14 })}
                          className="h-9 text-xs"
                        />
                        <p className="text-xs text-muted-foreground">e.g. Customers can book up to 14 days ahead.</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div>
                        <Label className="font-semibold text-sm">Require Specialist / Staff Selection</Label>
                        <p className="text-xs text-muted-foreground">Prompt customers to pick a specialist before selecting a date and slot.</p>
                      </div>
                      <Switch
                        checked={configForm.requireMasterSelection}
                        onCheckedChange={v => setConfigForm({ ...configForm, requireMasterSelection: v })}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Sub-Tab 4: WhatsApp & Instant Alerts */}
                <TabsContent value="reports" className="space-y-6">
                  <div className="p-4 border rounded-lg space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-purple-600" />
                      Merchant Instant Alerts & Summaries
                    </h3>

                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">Instant WhatsApp Notification Numbers</Label>
                      <Input
                        value={Array.isArray(configForm.dailyReportWaNumbers) ? configForm.dailyReportWaNumbers.join(", ") : ""}
                        onChange={e => setConfigForm({
                          ...configForm,
                          dailyReportWaNumbers: e.target.value.split(",").map(n => n.trim()).filter(Boolean)
                        })}
                        placeholder="e.g. 919876543210, 966564359373"
                        className="h-9 text-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        Whenever an appointment is booked or a payment receipt is received, instant WhatsApp alerts with PDF booking slips will be forwarded to these numbers.
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div>
                        <Label className="font-semibold text-sm">Daily WhatsApp Booking Summary</Label>
                        <p className="text-xs text-muted-foreground">Send a daily consolidated summary report of all appointments.</p>
                      </div>
                      <Switch
                        checked={configForm.dailyReportWaEnabled}
                        onCheckedChange={v => setConfigForm({ ...configForm, dailyReportWaEnabled: v })}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Sub-Tab 5: AI & Team Routing */}
                <TabsContent value="ai_team" className="space-y-6">
                  {/* AI Assistant */}
                  <div className="p-4 border rounded-lg space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-indigo-600" />
                      AI Assistant & Auto-Answers
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-semibold text-sm">Enable AI Service Booking Assistant</Label>
                        <p className="text-xs text-muted-foreground">Allows AI to answer questions regarding services, pricing, and guide customers into booking.</p>
                      </div>
                      <Switch
                        checked={configForm.aiEnabled}
                        onCheckedChange={v => setConfigForm({ ...configForm, aiEnabled: v })}
                      />
                    </div>

                    {configForm.aiEnabled && (
                      <div className="space-y-1.5 pt-2">
                        <Label className="text-xs font-semibold">Custom AI System Prompt</Label>
                        <Textarea
                          value={configForm.aiSystemPrompt || ""}
                          onChange={e => setConfigForm({ ...configForm, aiSystemPrompt: e.target.value })}
                          placeholder="You are an appointment booking assistant for our clinic/salon. Answer client questions professionally and encourage them to complete their booking."
                          rows={4}
                          className="text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Team Auto-Assignment */}
                  <div className="p-4 border rounded-lg space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      Team Auto-Assignment
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-semibold text-sm">Auto-Assign Conversations to Staff</Label>
                        <p className="text-xs text-muted-foreground">Automatically assign incoming customer chats to team members.</p>
                      </div>
                      <Switch
                        checked={configForm.autoAssignEnabled}
                        onCheckedChange={v => setConfigForm({ ...configForm, autoAssignEnabled: v })}
                      />
                    </div>

                    {configForm.autoAssignEnabled && (
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Assignment Mode</Label>
                          <Select
                            value={configForm.autoAssignMode || "permanent"}
                            onValueChange={v => setConfigForm({ ...configForm, autoAssignMode: v })}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="permanent">Permanent Agent</SelectItem>
                              <SelectItem value="round_robin">Round Robin (Rotates among staff)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {configForm.autoAssignMode === "permanent" && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Select Assigned Team Member</Label>
                            <Select
                              value={configForm.autoAssignUserId || "none"}
                              onValueChange={v => setConfigForm({ ...configForm, autoAssignUserId: v === "none" ? null : v })}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Select Team Member" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {Array.isArray(teamMembers) && teamMembers.map(tm => (
                                  <SelectItem key={tm.id} value={tm.id}>{tm.name || tm.username} ({tm.email})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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

      {/* SERVICE MODAL */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
            <DialogDescription>Define service details, pricing, duration, and sequence messages.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input
                value={serviceForm.name}
                onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                placeholder="e.g. Executive Haircut & Styling"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Price ({serviceForm.currency}) *</Label>
                <Input
                  type="number"
                  value={serviceForm.price}
                  onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (Minutes) *</Label>
                <Input
                  type="number"
                  value={serviceForm.durationMinutes}
                  onChange={e => setServiceForm({ ...serviceForm, durationMinutes: parseInt(e.target.value, 10) || 30 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={serviceForm.categoryId || "none"}
                onValueChange={v => setServiceForm({ ...serviceForm, categoryId: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={serviceForm.description}
                onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                placeholder="Brief summary shown in WhatsApp..."
              />
            </div>

            <div className="space-y-2">
              <Label>Individual Trigger Keyword</Label>
              <Input
                value={serviceForm.triggerKeyword}
                onChange={e => setServiceForm({ ...serviceForm, triggerKeyword: e.target.value })}
                placeholder="e.g. haircut (triggers this service directly)"
              />
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  checked={serviceForm.isTriggerEnabled}
                  onCheckedChange={v => setServiceForm({ ...serviceForm, isTriggerEnabled: !!v })}
                />
                <span className="text-xs text-muted-foreground">Enable direct keyword trigger for this service</span>
              </div>
            </div>

            {/* Sequence Media Messages Repeater */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Service Specific Messages / Media</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newMsg: ServiceMessage = {
                      id: `msg_${Date.now()}`,
                      text: "",
                      mediaType: "none",
                      mediaUrl: "",
                      sortOrder: serviceForm.serviceMessages.length
                    };
                    setServiceForm({
                      ...serviceForm,
                      serviceMessages: [...serviceForm.serviceMessages, newMsg]
                    });
                  }}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Message
                </Button>
              </div>

              {serviceForm.serviceMessages.map((msg, idx) => (
                <div key={msg.id} className="p-3 bg-muted/40 rounded-lg space-y-2 border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Message #{idx + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updated = serviceForm.serviceMessages.filter((_, i) => i !== idx);
                        setServiceForm({ ...serviceForm, serviceMessages: updated });
                      }}
                    >
                      <Trash className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Text content..."
                    value={msg.text}
                    onChange={e => {
                      const updated = [...serviceForm.serviceMessages];
                      updated[idx].text = e.target.value;
                      setServiceForm({ ...serviceForm, serviceMessages: updated });
                    }}
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={msg.mediaType}
                      onValueChange={val => {
                        const updated = [...serviceForm.serviceMessages];
                        updated[idx].mediaType = val as any;
                        setServiceForm({ ...serviceForm, serviceMessages: updated });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Media Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Media</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="audio">Audio Voice Note</SelectItem>
                        <SelectItem value="document">Document (PDF)</SelectItem>
                      </SelectContent>
                    </Select>
                    {msg.mediaType !== "none" && (
                      <div className="flex gap-1">
                        <Input
                          placeholder="Media URL"
                          value={msg.mediaUrl}
                          onChange={e => {
                            const updated = [...serviceForm.serviceMessages];
                            updated[idx].mediaUrl = e.target.value;
                            setServiceForm({ ...serviceForm, serviceMessages: updated });
                          }}
                          className="h-8 text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setGalleryTargetField("serviceMessage");
                            setGalleryTargetMsgIdx(idx);
                            setIsGalleryOpen(true);
                          }}
                          className="h-8 px-2"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsServiceModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveServiceMutation.mutate({
                ...serviceForm,
                id: editingService?.id
              })}
              disabled={saveServiceMutation.isPending}
            >
              Save Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SPECIALIST / MASTER MODAL */}
      <Dialog open={isMasterModalOpen} onOpenChange={setIsMasterModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMaster ? "Edit Specialist" : "Add Specialist / Master"}</DialogTitle>
            <DialogDescription>Define working hours, slot intervals, and assigned services.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Specialist Name *</Label>
              <Input
                value={masterForm.name}
                onChange={e => setMasterForm({ ...masterForm, name: e.target.value })}
                placeholder="e.g. Dr. John Doe, Sarah Jenkins"
              />
            </div>

            <div className="space-y-2">
              <Label>Professional Title</Label>
              <Input
                value={masterForm.title}
                onChange={e => setMasterForm({ ...masterForm, title: e.target.value })}
                placeholder="e.g. Senior Stylist, Consultant, Specialist"
              />
            </div>

            <div className="space-y-2">
              <Label>Assigned Services (Multi-select)</Label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-lg max-h-36 overflow-y-auto border">
                {services.map(s => {
                  const isChecked = masterForm.serviceIds.includes(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={checked => {
                          const updated = checked
                            ? [...masterForm.serviceIds, s.id]
                            : masterForm.serviceIds.filter(id => id !== s.id);
                          setMasterForm({ ...masterForm, serviceIds: updated });
                        }}
                      />
                      <span>{s.name}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">If none selected, specialist can perform all services.</p>
            </div>

            {/* Working Hours */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="font-semibold">Working Hours & Breaks</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Start Time (24h)</span>
                  <Input
                    type="time"
                    value={masterForm.workingHours.startTime}
                    onChange={e => setMasterForm({
                      ...masterForm,
                      workingHours: { ...masterForm.workingHours, startTime: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">End Time (24h)</span>
                  <Input
                    type="time"
                    value={masterForm.workingHours.endTime}
                    onChange={e => setMasterForm({
                      ...masterForm,
                      workingHours: { ...masterForm.workingHours, endTime: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Break Start (24h)</span>
                  <Input
                    type="time"
                    value={masterForm.workingHours.breakStartTime}
                    onChange={e => setMasterForm({
                      ...masterForm,
                      workingHours: { ...masterForm.workingHours, breakStartTime: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Break End (24h)</span>
                  <Input
                    type="time"
                    value={masterForm.workingHours.breakEndTime}
                    onChange={e => setMasterForm({
                      ...masterForm,
                      workingHours: { ...masterForm.workingHours, breakEndTime: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Slot Step Interval (Minutes)</span>
                <Input
                  type="number"
                  value={masterForm.slotIntervalMinutes}
                  onChange={e => setMasterForm({ ...masterForm, slotIntervalMinutes: parseInt(e.target.value, 10) || 30 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMasterModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMasterMutation.mutate({
                ...masterForm,
                id: editingMaster?.id
              })}
              disabled={saveMasterMutation.isPending}
            >
              Save Specialist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CATEGORY MODAL */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Category Name *</Label>
              <Input
                value={categoryForm.name}
                onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g. Haircuts, Spa, Medical"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                value={categoryForm.description}
                onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveCategoryMutation.mutate({
                ...categoryForm,
                id: editingCategory?.id
              })}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Gallery Selector */}
      <MediaGalleryDialog
        open={isGalleryOpen}
        onOpenChange={setIsGalleryOpen}
        onSelectMedia={media => {
          if (galleryTargetField === "businessLogo") {
            setConfigForm((prev: any) => ({ ...prev, businessLogo: media.url }));
          } else if (galleryTargetField === "welcomeHeaderUrl") {
            setConfigForm((prev: any) => ({ ...prev, welcomeHeaderUrl: media.url }));
          } else if (galleryTargetField === "qrCodeUrl") {
            setConfigForm((prev: any) => ({ ...prev, qrCodeUrl: media.url }));
          } else if (galleryTargetField === "serviceMessage" && galleryTargetMsgIdx !== null) {
            const updated = [...serviceForm.serviceMessages];
            if (updated[galleryTargetMsgIdx]) {
              updated[galleryTargetMsgIdx].mediaUrl = media.url;
              setServiceForm({ ...serviceForm, serviceMessages: updated });
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
