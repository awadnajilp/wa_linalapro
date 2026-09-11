import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar as CalendarIcon, Clock, Users, Settings, Plus, Trash, Edit, RefreshCw, FileText, CheckCircle, ExternalLink, Download, FileSpreadsheet, Sparkles, UserCheck, Shield, Phone, Mail, Image as ImageIcon, Briefcase, ChevronRight, Check } from "lucide-react";
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

export default function ServiceBookingLedger() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeChannel } = useChannelContext();

  const [activeTab, setActiveTab] = useState("bookings");

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

  // Config State
  const [configForm, setConfigForm] = useState<any>({
    bookingTriggerKeyword: "book",
    isBookingFlowActive: true,
    welcomeMessage: "Welcome to our booking system! Please choose a service:",
    requireMasterSelection: true,
    currency: "INR",
    labelCod: "Pay at Venue (Cash/Card)",
    labelUpiDirect: "GPay/PhonePe(UPI)",
    labelQrPay: "Acc. Info(QR Code)",
    labelGateway: "Online Payment",
    upiId: "",
    upiMerchantName: "",
    qrCodeUrl: "",
    dailyReportWaEnabled: false,
    dailyReportWaNumbers: [] as string[]
  });

  // Media Gallery Picker States
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
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

  React.useEffect(() => {
    if (configData?.config) {
      setConfigForm({ ...configData.config });
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
    onSuccess: () => toast({ title: "Saved", description: "Service booking settings updated." }),
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  // Open Service Edit/Add Modal
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

  // Open Master Edit/Add Modal
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
            <Clock className="w-7 h-7 text-indigo-600" />
            Service Bookings & Appointments
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage your service catalog, specialists, dynamic time slots, and WhatsApp automated booking flows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ChannelSwitcher />
        </div>
      </div>

      {/* Tabs */}
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
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="font-semibold text-indigo-600">{b.bookingNumber}</TableCell>
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
                    <div className="text-xs bg-indigo-50 text-indigo-700 rounded px-2 py-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Trigger: *{s.triggerKeyword}*
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
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
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

        {/* TAB 5: SETTINGS */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Booking Flow Settings</CardTitle>
              <CardDescription>Configure trigger keywords, welcome messages, and specialist selection rules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold">Enable Automated Booking Flow</Label>
                  <p className="text-xs text-muted-foreground">Automatically respond when customers message your trigger keyword.</p>
                </div>
                <Switch
                  checked={configForm.isBookingFlowActive}
                  onCheckedChange={v => setConfigForm({ ...configForm, isBookingFlowActive: v })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Global Booking Trigger Keyword</Label>
                  <Input
                    value={configForm.bookingTriggerKeyword}
                    onChange={e => setConfigForm({ ...configForm, bookingTriggerKeyword: e.target.value })}
                    placeholder="e.g. book, appointment, salon"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={configForm.currency}
                    onChange={e => setConfigForm({ ...configForm, currency: e.target.value })}
                    placeholder="e.g. INR, SAR, USD"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Welcome Message</Label>
                <Textarea
                  value={configForm.welcomeMessage}
                  onChange={e => setConfigForm({ ...configForm, welcomeMessage: e.target.value })}
                  placeholder="Welcome! Please choose a service to get started:"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label className="font-semibold">Require Specialist / Master Selection</Label>
                  <p className="text-xs text-muted-foreground">If enabled, asks customers to choose a specialist before selecting date/time slot.</p>
                </div>
                <Switch
                  checked={configForm.requireMasterSelection}
                  onCheckedChange={v => setConfigForm({ ...configForm, requireMasterSelection: v })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment & Merchant Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Payment & WhatsApp Alerts</CardTitle>
              <CardDescription>Configure payment methods and instant WhatsApp alerts sent to merchant numbers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pay at Venue / COD Label</Label>
                  <Input
                    value={configForm.labelCod}
                    onChange={e => setConfigForm({ ...configForm, labelCod: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>UPI Direct Pay ID</Label>
                  <Input
                    value={configForm.upiId || ""}
                    onChange={e => setConfigForm({ ...configForm, upiId: e.target.value })}
                    placeholder="merchant@upi"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Merchant Instant WhatsApp Alert Numbers</Label>
                <Input
                  value={Array.isArray(configForm.dailyReportWaNumbers) ? configForm.dailyReportWaNumbers.join(", ") : ""}
                  onChange={e => setConfigForm({
                    ...configForm,
                    dailyReportWaNumbers: e.target.value.split(",").map(n => n.trim()).filter(Boolean)
                  })}
                  placeholder="e.g. 919876543210, 966564359373"
                />
                <p className="text-xs text-muted-foreground">
                  Individual bookings will be sent instantly to these WhatsApp numbers with the PDF booking slip and payment receipt.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => saveConfigMutation.mutate({
                    ...configForm,
                    channelId: activeChannel?.id
                  })}
                  disabled={saveConfigMutation.isPending}
                >
                  Save Settings
                </Button>
              </div>
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
          if (galleryTargetMsgIdx !== null && serviceForm.serviceMessages[galleryTargetMsgIdx]) {
            const updated = [...serviceForm.serviceMessages];
            updated[galleryTargetMsgIdx].mediaUrl = media.url;
            setServiceForm({ ...serviceForm, serviceMessages: updated });
          }
          setIsGalleryOpen(false);
          setGalleryTargetMsgIdx(null);
        }}
      />
    </div>
  );
}
