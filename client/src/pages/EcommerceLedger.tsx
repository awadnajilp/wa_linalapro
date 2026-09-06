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
import { ShoppingCart, Package, Settings, ClipboardList, Users, UserCheck, Shuffle, Plus, Trash, Edit, RefreshCw, FileText, CheckCircle, ExternalLink, MessageSquare, Sparkles, Download, Truck, Calendar as CalendarIcon, Coins, Key, Bot, Volume2, Mic, Activity, ArrowUpRight, Mail, Clock, FileSpreadsheet, Send, ShoppingBag, RotateCcw, Percent, Flame, MessageCircle, AlertCircle, PhoneCall, CreditCard } from "lucide-react";
import { useChannelContext } from "@/contexts/channel-context";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { ChannelSwitcher } from "@/components/channel-switcher";
import { MediaGalleryDialog } from "@/components/media/MediaGalleryDialog";
import { useTranslation } from "@/lib/i18n";

const DEFAULT_AI_SYSTEM_PROMPT = `You are a helpful customer sales AI assistant for this store.
You are chatting with a customer regarding this product:
- Name: {product_name}
- Price: {product_price}
- Description: {product_description}

CRITICAL DIRECTIVE: Keep responses concise and conversational for WhatsApp (under 150 words). Always try to close the sale by encouraging them to buy and proceed to checkout once their queries are addressed. Inform the user they can type 'checkout' or '1' at any time to buy!`;

interface Product {
  id: string;
  name: string;
  price: string;
  description: string | null;
  longDescription?: string | null;
  photos: string[] | string;
  checkoutLink: string | null;
  triggerKeyword: string | null;
  isTriggerEnabled: boolean;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerPhone: string;
  customerName: string | null;
  customerData: Record<string, any>;
  productId: string | null;
  productName: string | null;
  price: string;
  quantity: number;
  totalAmount: string;
  paymentMethod: string;
  paymentStatus: string;
  receiptUrl: string | null;
  status: string;
  createdAt: string;
}

interface Customer {
  phone: string;
  name: string | null;
  lastOrderDate: string;
  totalOrders: string;
  totalSpent: string;
}

interface EcommerceConfig {
  id: string;
  storeTriggerKeyword: string;
  isStoreFlowActive: boolean;
  welcomeMessage: string;
  welcomeHeaderUrl: string | null;
  welcomeHeaderType: string;
  qrCodeUrl: string | null;
  checkoutFields: string[];
  instamojoApiKey: string | null;
  instamojoAuthToken: string | null;
  instamojoSandbox: boolean;
  razorpayKeyId: string | null;
  razorpayKeySecret: string | null;
  autoAssignEnabled?: boolean;
  autoAssignMode?: "permanent" | "round_robin";
  autoAssignUserId?: string | null;
  autoAssignExcludedUserIds?: string[];
  isActive: boolean;
}

const countriesList = [
  { code: "IN", name: "India" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "BH", name: "Bahrain" },
  { code: "QA", name: "Qatar" },
  { code: "KW", name: "Kuwait" },
  { code: "OM", name: "Oman" },
  { code: "EG", name: "Egypt" },
  { code: "MA", name: "Morocco" },
  { code: "GB", name: "United Kingdom" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "BR", name: "Brazil" },
  { code: "US", name: "United States" }
];

const countryStates: Record<string, string[]> = {
  IN: [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", 
    "West Bengal", "Delhi", "Chandigarh", "Jammu and Kashmir", "Ladakh", "Puducherry"
  ],
  SA: [
    "Riyadh", "Makkah", "Madinah", "Eastern Province", "Qassim", "Asir", "Tabuk", "Hail", 
    "Northern Borders", "Jazan", "Najran", "Baha", "Jawf"
  ],
  AE: [
    "Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"
  ],
  BH: [
    "Capital Governorate", "Muharraq Governorate", "Northern Governorate", "Southern Governorate"
  ],
  QA: [
    "Doha", "Al Rayyan", "Al Wakra", "Al Khor", "Al Daayen", "Al Shahaniya", "Umm Salal", "Madinat ash Shamal"
  ],
  KW: [
    "Capital", "Hawalli", "Farwaniya", "Ahmadi", "Jahra", "Mubarak Al-Kabeer"
  ],
  OM: [
    "Muscat", "Dhofar", "Musandam", "Buraimi", "Ad Dakhiliyah", "Al Batinah North", "Al Batinah South", "Al Wusta", "Ash Sharqiyah North", "Ash Sharqiyah South", "Ad Dhahirah"
  ],
  EG: [
    "Cairo", "Alexandria", "Giza", "Qalyubia", "Gharbia", "Dakahlia", "Monufia", "Sharqia", "Beheira", "Damietta", "Kafr El Sheikh", "Matrouh", "Port Said", "Ismailia", "Suez", "North Sinai", "South Sinai", "Fayoum", "Beni Suef", "Minya", "Assiut", "Sohag", "Qena", "Luxor", "Aswan", "Red Sea", "New Valley"
  ],
  MA: [
    "Tanger-Tetouan-Al Hoceima", "Oriental", "Fes-Meknes", "Rabat-Sale-Kenitra", "Beni Mellal-Khenifra", "Casablanca-Settat", "Marrakesh-Safi", "Draa-Tafilalet", "Souss-Massa", "Guelmim-Oued Noun", "Laayoune-Sakia El Hamra", "Dakhla-Oued Ed-Dahab"
  ],
  GB: [
    "England", "Scotland", "Wales", "Northern Ireland"
  ],
  FR: [
    "Auvergne-Rhone-Alpes", "Bourgogne-Franche-Comte", "Brittany", "Centre-Val de Loire", "Corsica", "Grand Est", "Hauts-de-France", "Ile-de-France", "Normandy", "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Cote d'Azur"
  ],
  DE: [
    "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hesse", "Lower Saxony", "Mecklenburg-Vorpommern", "North Rhine-Westphalia", "Rhineland-Palatinate", "Saarland", "Saxony", "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia"
  ],
  ES: [
    "Andalusia", "Aragon", "Asturias", "Balearic Islands", "Basque Country", "Canary Islands", "Cantabria", "Castile and Leon", "Castile-La Mancha", "Catalonia", "Extremadura", "Galicia", "La Rioja", "Madrid", "Murcia", "Navarre", "Valencian Community", "Ceuta", "Melilla"
  ],
  PT: [
    "Aveiro", "Beja", "Braga", "Braganca", "Castelo Branco", "Coimbra", "Evora", "Faro", "Guarda", "Leiria", "Lisbon", "Portalegre", "Porto", "Santarem", "Setubal", "Viana do Castelo", "Vila Real", "Viseu", "Azores", "Madeira"
  ],
  BR: [
    "Acre", "Alagoas", "Amapa", "Amazonas", "Bahia", "Ceara", "Distrito Federal", "Espirito Santo", "Goias", "Maranhao", "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Para", "Paraiba", "Parana", "Pernambuco", "Piaui", "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondonia", "Roraima", "Santa Catarina", "Sao Paulo", "Sergipe", "Tocantins"
  ],
  US: [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", 
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", 
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", 
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", 
    "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", 
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", 
    "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
  ]
};


export default function EcommerceLedger() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedChannel } = useChannelContext();

  const channelId = selectedChannel?.id;

  // Active Tab
  const [activeTab, setActiveTab] = useState("products");
  const [configSubTab, setConfigSubTab] = useState("general");

  // Modals Open state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Filters for Orders
  const [search, setSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [orderStartDate, setOrderStartDate] = useState("");
  const [orderEndDate, setOrderEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const [customersPage, setCustomersPage] = useState(1);
  const limit = 10;

  React.useEffect(() => {
    setPage(1);
  }, [search, orderStatus, paymentStatus, orderStartDate, orderEndDate]);

  // Product Form states
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodLongDesc, setProdLongDesc] = useState("");
  const [prodPhotos, setProdPhotos] = useState("");
  const [prodCheckoutLink, setProdCheckoutLink] = useState("");
  const [prodTrigger, setProdTrigger] = useState("");
  const [prodTriggerEnabled, setProdTriggerEnabled] = useState(false);

  // Gallery Dialog states
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<any>("product");

  const getCurrencySymbol = (currencyCode: string | null | undefined) => {
    const code = currencyCode || storeCurrency || "INR";
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      AED: "AED",
      SAR: "SAR",
      INR: "₹",
      AUD: "A$",
      CAD: "C$",
      JPY: "¥",
      SGD: "S$",
      QAR: "QAR",
      OMR: "OMR",
      BHD: "BHD",
      KWD: "KWD",
      EGP: "EGP",
      MAD: "MAD"
    };
    return symbols[code] || code;
  };

  const getPreviewUrl = (url: string | null | undefined) => {
    if (!url) return "";
    if (url.startsWith("/api/") || url.startsWith("data:")) {
      return url;
    }
    return `/api/media/preview?url=${encodeURIComponent(url)}`;
  };

  const splitPhotos = (input: string): string[] => {
    if (!input) return [];
    return input
      .split(/(?:,\s*|\s+)(?=https?:\/\/|\/uploads)/)
      .map((p) => p.trim())
      .filter(Boolean);
  };

  // Store Configuration Form states
  const [activeProductId, setActiveProductId] = useState<string>("");
  const [storeKeyword, setStoreKeyword] = useState("store");
  const [storeFlowActive, setStoreFlowActive] = useState(true);
  const [welcomeMsg, setWelcomeMsg] = useState("Welcome to our store!");
  const [welcomeHeaderUrl, setWelcomeHeaderUrl] = useState("");
  const [welcomeHeaderType, setWelcomeHeaderType] = useState("image");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [checkoutFields, setCheckoutFields] = useState<{ text: string; variable: string }[]>([]);
  const [instaKey, setInstaKey] = useState("");
  const [instaToken, setInstaToken] = useState("");
  const [instaSandbox, setInstaSandbox] = useState(true);
  const [rzpKeyId, setRzpKeyId] = useState("");
  const [rzpKeySecret, setRzpKeySecret] = useState("");
  const [upiId, setUpiId] = useState("");
  const [upiMerchantName, setUpiMerchantName] = useState("");
  const [storeCurrency, setStoreCurrency] = useState("INR");
  const [configActive, setConfigActive] = useState(true);

  // AI & Welcome Messages States
  const [apiKeySource, setApiKeySource] = useState<"own_key" | "admin_key">("own_key");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiTakeoverEnabled, setAiTakeoverEnabled] = useState(false);
  const [aiVoiceEnabled, setAiVoiceEnabled] = useState(false);
  const [askQuantity, setAskQuantity] = useState(true);
  const [configVoiceProfileId, setConfigVoiceProfileId] = useState<string>("");
  const [configAiVoiceLanguageMode, setConfigAiVoiceLanguageMode] = useState<string>("profile");
  const [aiTimeoutMinutes, setAiTimeoutMinutes] = useState(30);
  const [aiAskButtonEnabled, setAiAskButtonEnabled] = useState(true);
  const [aiSystemPrompt, setAiSystemPrompt] = useState("");
  const [welcomeMessages, setWelcomeMessages] = useState<{ id: string; text: string; mediaType: "none" | "image" | "video" | "audio"; mediaUrl: string; sortOrder: number }[]>([]);

  // Store Identity Profile
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeWebsite, setStoreWebsite] = useState("");
  const [storeLogo, setStoreLogo] = useState("");

  // Delivery Fee States
  const [deliveryFeeType, setDeliveryFeeType] = useState("flat");
  const [flatDeliveryFee, setFlatDeliveryFee] = useState("0");
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState("0");
  const [stateDeliveryFees, setStateDeliveryFees] = useState<Record<string, string>>({});
  const [storeCountry, setStoreCountry] = useState("IN");
  const [labelCod, setLabelCod] = useState("Cash On Delvry(COD)");
  const [labelUpiDirect, setLabelUpiDirect] = useState("GPay/PhonePe(UPI)");
  const [labelQrPay, setLabelQrPay] = useState("Acc. Info(QR Code)");
  const [labelGateway, setLabelGateway] = useState("Online Payment");
  const [selectedStateOverride, setSelectedStateOverride] = useState("");
  const [overrideFeeInput, setOverrideFeeInput] = useState("");

  // Order editing states
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [editOrderName, setEditOrderName] = useState("");
  const [editOrderPhone, setEditOrderPhone] = useState("");
  const [editOrderAddress, setEditOrderAddress] = useState("");
  const [editOrderPin, setEditOrderPin] = useState("");
  const [editOrderAmount, setEditOrderAmount] = useState("");
  const [editOrderQty, setEditOrderQty] = useState("");
  const [editOrderPrice, setEditOrderPrice] = useState("");
  const [editOrderPaymentMethod, setEditOrderPaymentMethod] = useState("");
  const [editOrderPaymentStatus, setEditOrderPaymentStatus] = useState("");
  const [editOrderStatus, setEditOrderStatus] = useState("");

  // Auto-Assignment States
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
  const [autoAssignMode, setAutoAssignMode] = useState<"permanent" | "round_robin">("permanent");
  const [autoAssignUserId, setAutoAssignUserId] = useState<string>("");
  const [autoAssignExcludedUserIds, setAutoAssignExcludedUserIds] = useState<string[]>([]);

  // Daily Orders Report States (Email)
  const [dailyReportEnabled, setDailyReportEnabled] = useState(false);
  const [dailyReportEmails, setDailyReportEmails] = useState<string[]>([]);
  const [dailyReportEmailInput, setDailyReportEmailInput] = useState("");
  const [dailyReportTime, setDailyReportTime] = useState("21:00");
  const [isSendingTestReport, setIsSendingTestReport] = useState(false);

  // Daily Orders WhatsApp Forwarding States
  const [dailyReportWaEnabled, setDailyReportWaEnabled] = useState(false);
  const [dailyReportWaNumbers, setDailyReportWaNumbers] = useState<string[]>([]);
  const [dailyReportWaNumberInput, setDailyReportWaNumberInput] = useState("");
  const [dailyReportWaChannelId, setDailyReportWaChannelId] = useState<string>("");
  const [isSendingTestWaReport, setIsSendingTestWaReport] = useState(false);

  // Abandoned Cart Recovery Automation Settings
  const [abandonedCartRecoveryEnabled, setAbandonedCartRecoveryEnabled] = useState(false);
  const [abandonedCartDelay1Minutes, setAbandonedCartDelay1Minutes] = useState(60);
  const [abandonedCartDelay2Hours, setAbandonedCartDelay2Hours] = useState(18);
  const [abandonedCartDiscountCode, setAbandonedCartDiscountCode] = useState("");
  const [abandonedCartDiscountPercent, setAbandonedCartDiscountPercent] = useState("10");
  const [abandonedCartMessage1, setAbandonedCartMessage1] = useState("");
  const [abandonedCartMessage2, setAbandonedCartMessage2] = useState("");

  // Abandoned Carts Ledger Tab States
  const [abandonedPage, setAbandonedPage] = useState(1);
  const [abandonedStatusFilter, setAbandonedStatusFilter] = useState("all");
  const [abandonedSearch, setAbandonedSearch] = useState("");
  const [abandonedChannelFilter, setAbandonedChannelFilter] = useState("all");
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [selectedCartForRecovery, setSelectedCartForRecovery] = useState<any | null>(null);
  const [customRecoveryMessage, setCustomRecoveryMessage] = useState("");

  // Fetch Voice Profiles
  const { data: voiceProfiles = [] } = useQuery<any[]>({
    queryKey: ["/api/voice-profiles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/voice-profiles");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Team Members
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/team/members"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/team/members?limit=1000");
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      } catch (e) {
        return [];
      }
    },
  });

  // Queries
  // 1. Fetch Ecommerce Config
  const { data: config, isLoading: isConfigLoading } = useQuery<EcommerceConfig | null>({
    queryKey: ["/api/ecommerce/config", channelId],
    queryFn: async () => {
      if (!channelId) return null;
      const res = await fetch(`/api/ecommerce/config?channelId=${channelId}`);
      if (!res.ok) throw new Error("Failed to fetch store config");
      return res.json();
    },
    enabled: !!channelId,
  });

  // 1b. Fetch AI Usage & Wallet Billing Report
  const {
    data: aiUsageReport,
    isLoading: isAiUsageLoading,
    refetch: refetchAiUsage,
    isFetching: isFetchingAiUsage
  } = useQuery<any>({
    queryKey: ["/api/ecommerce/ai-usage-report", channelId],
    queryFn: async () => {
      if (!channelId) return null;
      const res = await fetch(`/api/ecommerce/ai-usage-report?channelId=${channelId}`);
      if (!res.ok) throw new Error("Failed to fetch AI usage report");
      return res.json();
    },
    enabled: !!channelId,
  });

  // Populate config form when loaded
  React.useEffect(() => {
    if (config) {
      setActiveProductId((config as any).activeProductId || "");
      setStoreKeyword(config.storeTriggerKeyword || "store");
      setStoreFlowActive(config.isStoreFlowActive !== undefined ? config.isStoreFlowActive : true);
      setWelcomeMsg(config.welcomeMessage || "Welcome to our store!");
      setWelcomeHeaderUrl(config.welcomeHeaderUrl || "");
      setWelcomeHeaderType(config.welcomeHeaderType || "image");
      setQrCodeUrl(config.qrCodeUrl || "");
      setInstaKey(config.instamojoApiKey || "");
      setInstaToken(config.instamojoAuthToken || "");
      setInstaSandbox(config.instamojoSandbox !== undefined ? config.instamojoSandbox : true);
      setRzpKeyId(config.razorpayKeyId || "");
      setRzpKeySecret(config.razorpayKeySecret || "");
      setUpiId((config as any).upiId || "");
      setUpiMerchantName((config as any).upiMerchantName || "");
      setStoreCurrency((config as any).currency || "INR");
      setApiKeySource((config as any).apiKeySource || "own_key");
      setAiEnabled((config as any).aiEnabled !== undefined ? (config as any).aiEnabled : false);
      setAiTakeoverEnabled((config as any).aiTakeoverEnabled !== undefined ? (config as any).aiTakeoverEnabled : false);
      setAiVoiceEnabled((config as any).aiVoiceEnabled !== undefined ? (config as any).aiVoiceEnabled : false);
      setAskQuantity((config as any).askQuantity !== undefined ? (config as any).askQuantity : true);
      setConfigVoiceProfileId((config as any).voiceProfileId || "");
      setConfigAiVoiceLanguageMode((config as any).aiVoiceLanguageMode || "profile");
      setAiTimeoutMinutes((config as any).aiTimeoutMinutes !== undefined ? (config as any).aiTimeoutMinutes : 30);
      setAiAskButtonEnabled((config as any).aiAskButtonEnabled !== undefined ? (config as any).aiAskButtonEnabled : true);
      setAiSystemPrompt((config as any).aiSystemPrompt || DEFAULT_AI_SYSTEM_PROMPT);
      setWelcomeMessages(Array.isArray((config as any).welcomeMessages) ? (config as any).welcomeMessages : []);
      setStoreName((config as any).storeName || "");
      setStoreAddress((config as any).storeAddress || "");
      setStoreWebsite((config as any).storeWebsite || "");
      setStoreLogo((config as any).storeLogo || "");
      setConfigActive(config.isActive !== undefined ? config.isActive : true);
      setDeliveryFeeType((config as any).deliveryFeeType || "flat");
      setFlatDeliveryFee((config as any).flatDeliveryFee || "0");
      setDefaultDeliveryFee((config as any).defaultDeliveryFee || "0");
      setStateDeliveryFees((config as any).stateDeliveryFees || {});
      setStoreCountry((config as any).storeCountry || "IN");
      setLabelCod((config as any).labelCod || "Cash On Delvry(COD)");
      setLabelUpiDirect((config as any).labelUpiDirect || "GPay/PhonePe(UPI)");
      setLabelQrPay((config as any).labelQrPay || "Acc. Info(QR Code)");
      setLabelGateway((config as any).labelGateway || "Online Payment");
      setAutoAssignEnabled((config as any).autoAssignEnabled !== undefined ? (config as any).autoAssignEnabled : false);
      setAutoAssignMode((config as any).autoAssignMode || "permanent");
      setAutoAssignUserId((config as any).autoAssignUserId || "");
      setAutoAssignExcludedUserIds(Array.isArray((config as any).autoAssignExcludedUserIds) ? (config as any).autoAssignExcludedUserIds : []);
      setDailyReportEnabled((config as any).dailyReportEnabled !== undefined ? (config as any).dailyReportEnabled : false);
      setDailyReportEmails(Array.isArray((config as any).dailyReportEmails) ? (config as any).dailyReportEmails : []);
      setDailyReportTime((config as any).dailyReportTime || "21:00");
      setDailyReportWaEnabled((config as any).dailyReportWaEnabled !== undefined ? (config as any).dailyReportWaEnabled : false);
      setDailyReportWaNumbers(Array.isArray((config as any).dailyReportWaNumbers) ? (config as any).dailyReportWaNumbers : []);
      setDailyReportWaChannelId((config as any).dailyReportWaChannelId || "");
      setAbandonedCartRecoveryEnabled((config as any).abandonedCartRecoveryEnabled !== undefined ? (config as any).abandonedCartRecoveryEnabled : false);
      setAbandonedCartDelay1Minutes((config as any).abandonedCartDelay1Minutes !== undefined ? (config as any).abandonedCartDelay1Minutes : 60);
      setAbandonedCartDelay2Hours((config as any).abandonedCartDelay2Hours !== undefined ? (config as any).abandonedCartDelay2Hours : 18);
      setAbandonedCartDiscountCode((config as any).abandonedCartDiscountCode || "");
      setAbandonedCartDiscountPercent((config as any).abandonedCartDiscountPercent ? String((config as any).abandonedCartDiscountPercent) : "10");
      setAbandonedCartMessage1((config as any).abandonedCartMessage1 || "");
      setAbandonedCartMessage2((config as any).abandonedCartMessage2 || "");

      // Standardize loaded checkoutFields Q&A objects
      if (Array.isArray(config.checkoutFields)) {
        const parsed = config.checkoutFields.map((f: any) => {
          if (typeof f === "string") {
            const capitalized = f.charAt(0).toUpperCase() + f.slice(1);
            let promptText = `Please enter your *${capitalized}*:`;
            if (f === "pin") promptText = "Please enter your *PIN / Zip Code*:";
            if (f === "phone") promptText = "Please enter your *Contact Phone*:";
            if (f === "address") promptText = "Please enter your *Shipping Address*:";
            if (f === "name") promptText = "Please enter your *Full Name*:";
            return { text: promptText, variable: f };
          }
          return { text: f.text || "", variable: f.variable || "" };
        });
        setCheckoutFields(parsed);
      } else {
        setCheckoutFields([
          { text: "Please enter your Full Name:", variable: "name" },
          { text: "Please enter your Contact Phone:", variable: "phone" },
          { text: "Please enter your Shipping Address:", variable: "address" },
          { text: "Please enter your PIN / Zip Code:", variable: "pin" }
        ]);
      }
    }
  }, [config]);

  // Fetch all tenant channels for selector
  const { data: allChannels = [] } = useQuery<any[]>({
    queryKey: ["/api/channels"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/channels");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Template edits local state
  const [templateEdits, setTemplateEdits] = useState<Record<string, { header?: string; body?: string; footer?: string }>>({});
  const [submittingTemplateName, setSubmittingTemplateName] = useState<string | null>(null);

  // Fetch Ecommerce WhatsApp Templates
  const {
    data: ecomTemplatesData,
    isLoading: isLoadingEcomTemplates,
    refetch: refetchEcomTemplates
  } = useQuery<any>({
    queryKey: ["/api/ecommerce/templates", channelId],
    queryFn: async () => {
      if (!channelId) return null;
      const res = await apiRequest("GET", `/api/ecommerce/templates?channelId=${channelId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!channelId,
  });

  const provisionTemplatesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ecommerce/templates/provision", { channelId });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to provision templates");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Templates Provisioned",
        description: `Successfully provisioned/synced: ${data.created || 0} created, ${data.updated || 0} updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/templates", channelId] });
      refetchEcomTemplates();
    },
    onError: (err: any) => {
      toast({
        title: "Provisioning Failed",
        description: err.message || "Failed to provision templates",
        variant: "destructive",
      });
    },
  });

  const submitTemplateMutation = useMutation({
    mutationFn: async (payload: { templateName: string; header?: string; body: string; footer?: string }) => {
      setSubmittingTemplateName(payload.templateName);
      const res = await apiRequest("POST", "/api/ecommerce/templates/submit", {
        channelId,
        ...payload,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit template");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSubmittingTemplateName(null);
      toast({
        title: "Template Saved & Submitted",
        description: data.message || "Template submitted to Meta for approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/templates", channelId] });
      refetchEcomTemplates();
    },
    onError: (err: any) => {
      setSubmittingTemplateName(null);
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to submit template to Meta",
        variant: "destructive",
      });
    },
  });

  // 2. Fetch Products
  const { data: productsData, isLoading: isProductsLoading } = useQuery<{ products: Product[]; total: number }>({
    queryKey: ["/api/ecommerce/products", productsPage],
    queryFn: async () => {
      const res = await fetch(`/api/ecommerce/products?page=${productsPage}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  // 3. Fetch Orders
  const { data: ordersData, isLoading: isOrdersLoading } = useQuery<{ orders: Order[]; total: number }>({
    queryKey: ["/api/ecommerce/orders", search, orderStatus, paymentStatus, orderStartDate, orderEndDate, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        status: orderStatus,
        paymentStatus,
      });
      if (orderStartDate) params.set("startDate", orderStartDate);
      if (orderEndDate) params.set("endDate", orderEndDate);

      const res = await fetch(`/api/ecommerce/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  // 4. Fetch Customers
  const { data: customersData, isLoading: isCustomersLoading } = useQuery<{ customers: Customer[]; total: number }>({
    queryKey: ["/api/ecommerce/customers", customersPage],
    queryFn: async () => {
      const res = await fetch(`/api/ecommerce/customers?page=${customersPage}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  // 5. Fetch Abandoned Carts
  const {
    data: abandonedCartsData,
    isLoading: isAbandonedCartsLoading,
    refetch: refetchAbandonedCarts
  } = useQuery<{
    carts: any[];
    total: number;
    page: number;
    limit: number;
    stats: {
      totalAbandoned: number;
      totalRecovered: number;
      totalCancelled: number;
      totalCarts: number;
      recoveredRevenue: number;
      lostPotentialRevenue: number;
      recoveryRate: number;
    };
  }>({
    queryKey: ["/api/ecommerce/abandoned-carts", abandonedPage, abandonedStatusFilter, abandonedSearch, abandonedChannelFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(abandonedPage),
        limit: "10",
        status: abandonedStatusFilter,
        channelId: abandonedChannelFilter,
        search: abandonedSearch,
      });
      const res = await fetch(`/api/ecommerce/abandoned-carts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch abandoned carts");
      return res.json();
    },
  });

  // Mutations
  // 1. Create or Update Product
  const saveProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiRequest("POST", "/api/ecommerce/products", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/products"] });
      toast({ title: editingProduct ? "Product Updated" : "Product Created", description: "Successfully saved product." });
      setIsProductModalOpen(false);
      resetProductForm();
    },
    onError: (err: any) => {
      toast({ title: "Failed to save product", description: err.message, variant: "destructive" });
    },
  });

  // 2. Delete Product
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/ecommerce/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/products"] });
      toast({ title: "Product Deleted", description: "Successfully removed product." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete product", description: err.message, variant: "destructive" });
    },
  });

  // 3. Save Store Config
  const saveConfigMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiRequest("POST", "/api/ecommerce/config", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/config", channelId] });
      toast({ title: "Configuration Saved", description: "Successfully updated store settings." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save config", description: err.message, variant: "destructive" });
    },
  });

  // 4. Update Order Status
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status, paymentStatus }: { id: string; status?: string; paymentStatus?: string }) => {
      return apiRequest("POST", `/api/ecommerce/orders/${id}/status`, { status, paymentStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/customers"] });
      toast({ title: "Order Updated", description: "Successfully updated status and triggered WhatsApp notification." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update order", description: err.message, variant: "destructive" });
    },
  });

  // Edit Order Details Mutation
  const editOrderMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/ecommerce/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/customers"] });
      toast({ title: "Success", description: "Order updated successfully." });
      setEditingOrder(null);
    },
    onError: (err: any) => {
      toast({ title: "Failed to update order", description: err.message, variant: "destructive" });
    }
  });

  // Delete Order Mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ecommerce/orders/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/customers"] });
      toast({ title: "Success", description: "Order deleted successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete order", description: err.message, variant: "destructive" });
    }
  });

  const handleEditOrderClick = (order: any) => {
    setEditingOrder(order);
    setEditOrderName(order.customerName || "");
    setEditOrderPhone(order.customerPhone || "");
    setEditOrderAddress(order.customerData?.address || "");
    setEditOrderPin(order.customerData?.pin || "");
    setEditOrderAmount(order.totalAmount || "0");
    setEditOrderQty(String(order.quantity || "1"));
    setEditOrderPrice(String(order.price || "0"));
    setEditOrderPaymentMethod(order.paymentMethod || "cod");
    setEditOrderPaymentStatus(order.paymentStatus || "pending");
    setEditOrderStatus(order.status || "pending");
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProdName("");
    setProdPrice("");
    setProdDesc("");
    setProdLongDesc("");
    setProdPhotos("");
    setProdCheckoutLink("");
    setProdTrigger("");
    setProdTriggerEnabled(false);
  };

  const handleEditProductClick = (product: any) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdPrice(product.price);
    setProdDesc(product.description || "");
    setProdLongDesc(product.longDescription || "");
    let photoUrls = "";
    if (product.photos) {
      photoUrls = Array.isArray(product.photos)
        ? product.photos.join(", ")
        : String(product.photos);
    }
    setProdPhotos(photoUrls);
    setProdCheckoutLink(product.checkoutLink || "");
    setProdTrigger(product.triggerKeyword || "");
    setProdTriggerEnabled(product.isTriggerEnabled);
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const photosArray = splitPhotos(prodPhotos);

    const payload: any = {
      name: prodName,
      price: prodPrice,
      description: prodDesc,
      longDescription: prodLongDesc,
      photos: photosArray,
      checkoutLink: prodCheckoutLink,
      triggerKeyword: prodTrigger,
      isTriggerEnabled: prodTriggerEnabled,
      currency: storeCurrency,
    };

    if (editingProduct) {
      payload.id = editingProduct.id;
    }

    saveProductMutation.mutate(payload);
  };

  const handleExportOrders = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({
        search,
        status: orderStatus,
        paymentStatus,
        export: "true"
      });
      if (orderStartDate) params.set("startDate", orderStartDate);
      if (orderEndDate) params.set("endDate", orderEndDate);

      const res = await fetch(`/api/ecommerce/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to download export data");
      
      const { orders } = await res.json();
      
      // Convert to CSV
      const headers = [
        "Order Number",
        "Date",
        "Customer Name",
        "Customer Phone",
        "Product Name",
        "Quantity",
        "Price",
        "Total Amount",
        "Payment Method",
        "Payment Status",
        "Order Status",
        "Address",
        "PIN Code"
      ];
      
      const rows = orders.map((o: any) => [
        o.orderNumber,
        new Date(o.createdAt).toLocaleString(),
        o.customerName || "",
        o.customerPhone,
        o.productName || "",
        o.quantity,
        o.price,
        o.totalAmount,
        o.paymentMethod,
        o.paymentStatus,
        o.status,
        o.customerData?.address || "",
        o.customerData?.pin || ""
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map((row: any[]) => 
          row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")
        )
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `orders_export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Success",
        description: `Successfully exported ${orders.length} orders to Excel/CSV.`,
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId) {
      toast({ title: "No Channel Selected", description: "Please activate a WhatsApp channel first.", variant: "destructive" });
      return;
    }

    const payload = {
      channelId,
      activeProductId: activeProductId || null,
      storeTriggerKeyword: storeKeyword,
      isStoreFlowActive: storeFlowActive,
      welcomeMessage: welcomeMsg,
      welcomeHeaderUrl,
      welcomeHeaderType,
      qrCodeUrl,
      checkoutFields: checkoutFields.filter(f => f.text.trim() && f.variable.trim()),
      instamojoApiKey: instaKey,
      instamojoAuthToken: instaToken,
      instamojoSandbox: instaSandbox,
      razorpayKeyId: rzpKeyId,
      razorpayKeySecret: rzpKeySecret,
      upiId: upiId || null,
      upiMerchantName: upiMerchantName || null,
      currency: storeCurrency,
      apiKeySource,
      aiEnabled,
      aiTakeoverEnabled,
      aiVoiceEnabled,
      voiceProfileId: configVoiceProfileId || null,
      aiVoiceLanguageMode: configAiVoiceLanguageMode,
      aiTimeoutMinutes,
      aiAskButtonEnabled,
      aiSystemPrompt,
      askQuantity,
      welcomeMessages,
      storeName,
      storeAddress,
      storeWebsite,
      storeLogo,
      deliveryFeeType,
      flatDeliveryFee,
      defaultDeliveryFee,
      stateDeliveryFees,
      storeCountry,
      labelCod,
      labelUpiDirect,
      labelQrPay,
      labelGateway,
      autoAssignEnabled,
      autoAssignMode,
      autoAssignUserId: autoAssignUserId || null,
      autoAssignExcludedUserIds,
      dailyReportEnabled,
      dailyReportEmails,
      dailyReportTime,
      dailyReportWaEnabled,
      dailyReportWaNumbers,
      dailyReportWaChannelId: dailyReportWaChannelId || null,
      abandonedCartRecoveryEnabled,
      abandonedCartDelay1Minutes,
      abandonedCartDelay2Hours,
      abandonedCartDiscountCode,
      abandonedCartDiscountPercent,
      abandonedCartMessage1,
      abandonedCartMessage2,
      isActive: configActive,
    };

    saveConfigMutation.mutate(payload);
  };

  const sendRecoveryMutation = useMutation({
    mutationFn: async ({ id, customMessage }: { id: string; customMessage?: string }) => {
      const res = await apiRequest("POST", `/api/ecommerce/abandoned-carts/${id}/send-recovery`, { customMessage });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Recovery Message Sent", description: data.message || "Message delivered to customer." });
      setRecoveryModalOpen(false);
      setSelectedCartForRecovery(null);
      setCustomRecoveryMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/abandoned-carts"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send recovery message", description: err.message, variant: "destructive" });
    }
  });

  const updateCartStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/ecommerce/abandoned-carts/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Cart Status Updated", description: "Abandoned cart status has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/abandoned-carts"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
    }
  });

  const deleteCartMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/ecommerce/abandoned-carts/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Record Deleted", description: "Abandoned cart record removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/abandoned-carts"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete record", description: err.message, variant: "destructive" });
    }
  });

  const handleSendTestWaReportNow = async () => {
    if (!channelId) {
      toast({ title: "No Channel Selected", description: "Please select a channel first.", variant: "destructive" });
      return;
    }
    if (dailyReportWaNumbers.length === 0) {
      toast({ title: "No Recipients Configured", description: "Please add at least one recipient WhatsApp number first.", variant: "destructive" });
      return;
    }

    try {
      setIsSendingTestWaReport(true);
      const res = await apiRequest("POST", "/api/ecommerce/config/send-test-wa-report", {
        channelId,
        targetNumbers: dailyReportWaNumbers,
        targetChannelId: dailyReportWaChannelId || channelId
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send WhatsApp report");
      }

      toast({
        title: "WhatsApp Daily Summary Sent!",
        description: data.message || `Summary report successfully forwarded via WhatsApp to ${dailyReportWaNumbers.join(", ")}`,
      });
    } catch (err: any) {
      toast({
        title: "WhatsApp Report Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSendingTestWaReport(false);
    }
  };

  const handleSendTestReportNow = async () => {
    if (!channelId) {
      toast({ title: "No Channel Selected", description: "Please select a channel first.", variant: "destructive" });
      return;
    }
    if (dailyReportEmails.length === 0) {
      toast({ title: "No Recipients Configured", description: "Please add at least one recipient email address first.", variant: "destructive" });
      return;
    }

    try {
      setIsSendingTestReport(true);
      const res = await apiRequest("POST", "/api/ecommerce/config/send-daily-report-now", {
        channelId,
        emails: dailyReportEmails
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send report");
      }

      toast({
        title: "Daily Report Sent!",
        description: data.message || `Summary report successfully emailed to ${dailyReportEmails.join(", ")}`,
      });
    } catch (err: any) {
      toast({
        title: "Report Send Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSendingTestReport(false);
    }
  };

  const handleAddStateOverride = () => {
    if (!selectedStateOverride || !overrideFeeInput) {
      toast({ title: "Invalid Input", description: "Please select a state and enter a delivery fee.", variant: "destructive" });
      return;
    }
    setStateDeliveryFees(prev => ({
      ...prev,
      [selectedStateOverride]: overrideFeeInput
    }));
    setSelectedStateOverride("");
    setOverrideFeeInput("");
  };

  const handleRemoveStateOverride = (state: string) => {
    setStateDeliveryFees(prev => {
      const next = { ...prev };
      delete next[state];
      return next;
    });
  };

  if (!channelId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <ShoppingCart className="w-16 h-16 text-gray-300 mb-2" />
        <h2 className="text-xl font-bold text-gray-700">No Active Channel Selected</h2>
        <p className="text-gray-500 max-w-sm text-center">
          Please select a WhatsApp channel to manage your store catalog and settings.
        </p>
        <div className="w-64">
          <ChannelSwitcher />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-emerald-600" />
            {t("ecommerce.title")}
          </h1>
          <p className="text-gray-500 text-sm">
            {t("ecommerce.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 hidden sm:inline">{t("common.active")} Channel:</span>
            <ChannelSwitcher />
          </div>

          <Dialog open={isProductModalOpen} onOpenChange={(open) => {
            setIsProductModalOpen(open);
            if (!open) resetProductForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t("ecommerce.products.addProduct")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? t("ecommerce.products.editProduct") : t("ecommerce.products.addProduct")}</DialogTitle>
                <DialogDescription>
                  {t("ecommerce.products.subtitle")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleProductSubmit} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="e.g. Premium Leather Wallet"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="price">Price *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-gray-500 font-semibold">{storeCurrency}</span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      placeholder="0.00"
                      className="pl-12 text-xs h-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="desc">Short Description</Label>
                    <span className="text-[10px] text-gray-500">Summary on WhatsApp Card</span>
                  </div>
                  <Textarea
                    id="desc"
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="Brief description shown on catalog / product card..."
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="longDesc">Detailed / Long Description</Label>
                    <span className="text-[10px] text-gray-500">Sent when customer clicks "Product Info"</span>
                  </div>
                  <Textarea
                    id="longDesc"
                    value={prodLongDesc}
                    onChange={(e) => setProdLongDesc(e.target.value)}
                    placeholder="Full detailed product description, specifications, features, etc. No size limit..."
                    rows={4}
                    className="text-xs"
                  />
                </div>

              <div className="space-y-2">
                <Label htmlFor="photos">Product Photos</Label>
                <div className="flex gap-2">
                  <Textarea
                    id="photos"
                    value={prodPhotos}
                    onChange={(e) => setProdPhotos(e.target.value)}
                    placeholder="URLs (comma-separated)"
                    className="text-xs"
                    rows={2}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="self-stretch"
                    onClick={() => {
                       setGalleryTarget("product");
                       setIsGalleryOpen(true);
                    }}
                  >
                    Gallery
                  </Button>
                </div>

                {splitPhotos(prodPhotos).length > 0 && (
                  <div className="flex flex-wrap gap-2 border p-2 rounded bg-gray-50 max-h-32 overflow-y-auto mt-1">
                    {splitPhotos(prodPhotos).map((photoUrl, idx) => (
                      <div key={idx} className="relative w-14 h-14 border rounded overflow-hidden group">
                        <img src={getPreviewUrl(photoUrl)} className="w-full h-full object-cover" alt="product thumbnail" />
                        <button
                          type="button"
                          className="absolute top-0 right-0 bg-red-600 text-white rounded-full flex items-center justify-center p-0.5 opacity-80 hover:opacity-100 transition-opacity"
                          style={{ width: "16px", height: "16px", fontSize: "10px" }}
                          onClick={() => {
                            const list = splitPhotos(prodPhotos);
                            list.splice(idx, 1);
                            setProdPhotos(list.join(", "));
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="chkLink">Checkout Link (Optional redirect)</Label>
                <Input
                  id="chkLink"
                  value={prodCheckoutLink}
                  onChange={(e) => setProdCheckoutLink(e.target.value)}
                  placeholder="e.g. https://store.com/buy-now"
                />
              </div>

              <div className="border p-3 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <Label className="font-semibold">Individual Keyword Trigger</Label>
                    <span className="text-xs text-gray-500">Allow customers to buy this product directly via keyword trigger.</span>
                  </div>
                  <Switch checked={prodTriggerEnabled} onCheckedChange={setProdTriggerEnabled} />
                </div>
                {prodTriggerEnabled && (
                  <div className="space-y-1">
                    <Label htmlFor="keyword">Trigger Word</Label>
                    <Input
                      id="keyword"
                      value={prodTrigger}
                      onChange={(e) => setProdTrigger(e.target.value)}
                      placeholder="e.g. wallet, buywallet"
                      required
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saveProductMutation.isPending}>
                  {saveProductMutation.isPending ? "Saving..." : "Save Product"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-lg border flex w-fit gap-1 mb-4">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            {t("ecommerce.products.title")} ({productsData?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            {t("ecommerce.orders.title")} ({ordersData?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t("contacts.title")} ({customersData?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="abandoned_carts" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-amber-600" />
            {t("ecommerce.abandonedCarts.title")} ({abandonedCartsData?.stats?.totalAbandoned || 0})
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {t("ecommerce.settings.title")}
          </TabsTrigger>
          <TabsTrigger value="ai_usage" className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-indigo-600" />
            {t("wallets.title")}
          </TabsTrigger>
        </TabsList>

        {/* 1. PRODUCTS TAB */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>{t("ecommerce.products.title")}</CardTitle>
              <CardDescription>
                {t("ecommerce.products.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isProductsLoading ? (
                <div className="text-center py-6 flex items-center justify-center gap-2 text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading products...
                </div>
              ) : !productsData?.products || productsData.products.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No products added yet. Click "Add Product" to create one.
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Image</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Keyword Trigger</TableHead>
                        <TableHead>External Checkout</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productsData.products.map((prod) => {
                        let firstPhoto = "";
                        try {
                          const photosArray = typeof prod.photos === "string" ? JSON.parse(prod.photos) : prod.photos;
                          if (Array.isArray(photosArray) && photosArray.length > 0) {
                            firstPhoto = photosArray[0];
                          }
                        } catch {}

                        return (
                          <TableRow key={prod.id}>
                            <TableCell>
                              {firstPhoto ? (
                                <img src={getPreviewUrl(firstPhoto)} alt={prod.name} className="w-12 h-12 object-cover rounded-lg border" />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 flex items-center justify-center rounded-lg border">
                                  <Package className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">{prod.name}</TableCell>
                            <TableCell className="text-emerald-600 font-medium">
                              {getCurrencySymbol(prod.currency)} {prod.price}
                            </TableCell>
                            <TableCell>
                              {prod.isTriggerEnabled ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                  Active: {prod.triggerKeyword}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  Disabled
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {prod.checkoutLink ? (
                                <a href={prod.checkoutLink} target="_blank" rel="noreferrer" className="text-blue-500 flex items-center gap-1 text-sm hover:underline">
                                  Link <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-gray-400 text-xs">Standard Chat</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button size="icon" variant="ghost" className="text-gray-600" onClick={() => handleEditProductClick(prod)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-red-500" onClick={() => {
                                if (confirm("Are you sure you want to delete this product?")) {
                                  deleteProductMutation.mutate(prod.id);
                                }
                              }}>
                                <Trash className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {productsData.total > limit && (
                    <div className="flex justify-end gap-2 pt-2">
                      <Button size="sm" variant="outline" disabled={productsPage === 1} onClick={() => setProductsPage(p => p - 1)}>Prev</Button>
                      <Button size="sm" variant="outline" disabled={productsPage * limit >= productsData.total} onClick={() => setProductsPage(p => p + 1)}>Next</Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ORDERS TAB */}
        <TabsContent value="orders">
          <Card>
            <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0 gap-4">
              <div>
                <CardTitle>Orders Ledger</CardTitle>
                <CardDescription>Manage status updates, trace payment receipts, and dispatch notifications.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-1.5">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-[125px] h-9 text-xs justify-start font-normal border-slate-200 bg-white",
                          !orderStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                        {orderStartDate ? orderStartDate : <span>Start Date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={orderStartDate ? new Date(orderStartDate) : undefined}
                        onSelect={(date) => {
                          setOrderStartDate(date ? format(date, "yyyy-MM-dd") : "");
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-gray-400 text-xs">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-[125px] h-9 text-xs justify-start font-normal border-slate-200 bg-white",
                          !orderEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                        {orderEndDate ? orderEndDate : <span>End Date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={orderEndDate ? new Date(orderEndDate) : undefined}
                        onSelect={(date) => {
                          setOrderEndDate(date ? format(date, "yyyy-MM-dd") : "");
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Input
                  className="max-w-[200px] h-9 text-xs"
                  placeholder="Search order, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select value={orderStatus} onValueChange={setOrderStatus}>
                  <SelectTrigger className="w-[120px] h-9 text-xs">
                    <SelectValue placeholder="Order Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="w-[120px] h-9 text-xs">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="pending_verification">Verification Req</SelectItem>
                    <SelectItem value="pending_payment">Link Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportOrders}
                  disabled={isExporting || isOrdersLoading}
                  className="flex items-center gap-1.5 h-9 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? "Exporting..." : "Export Excel"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isOrdersLoading ? (
                <div className="text-center py-6 flex items-center justify-center gap-2 text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading orders...
                </div>
              ) : !ordersData?.orders || ordersData.orders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No checkout orders match the current criteria.</div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Delivery Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersData.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-semibold text-emerald-700">{order.orderNumber}</TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{order.customerName || "Customer"}</div>
                            <div className="text-xs text-gray-500">{order.customerPhone}</div>
                            {order.customerData && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button className="text-xs text-blue-500 flex items-center gap-0.5 hover:underline mt-1">
                                    View details <FileText className="w-3 h-3" />
                                  </button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Customer Order Form Data</DialogTitle>
                                    <DialogDescription>Collected fields for {order.orderNumber}</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-2 py-4">
                                    {Object.entries(order.customerData).map(([key, val]) => (
                                      <div key={key} className="flex justify-between border-b pb-1">
                                        <span className="font-semibold text-gray-600 text-sm">{key.toUpperCase()}:</span>
                                        <span className="text-gray-800 text-sm">{String(val)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{order.productName}</div>
                            <div className="text-xs text-gray-400">Qty: {order.quantity}</div>
                          </TableCell>
                          <TableCell className="font-medium">{getCurrencySymbol(order.currency)} {order.totalAmount}</TableCell>
                          <TableCell className="uppercase text-xs">{order.paymentMethod}</TableCell>
                          <TableCell>
                            <select
                              value={order.paymentStatus}
                              onChange={(e) => updateOrderStatusMutation.mutate({ id: order.id, paymentStatus: e.target.value })}
                              className="text-xs border rounded p-1"
                            >
                              <option value="pending">Pending</option>
                              <option value="pending_verification">Verification Req</option>
                              <option value="pending_payment">Link Pending</option>
                              <option value="paid">Paid</option>
                              <option value="failed">Failed</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            {order.receiptUrl ? (
                              <a href={getPreviewUrl(order.receiptUrl)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                                View <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <select
                              value={order.status}
                              onChange={(e) => updateOrderStatusMutation.mutate({ id: order.id, status: e.target.value })}
                              className="text-xs border rounded p-1 font-semibold text-emerald-800 bg-emerald-50"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right whitespace-nowrap space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 text-blue-600 hover:text-blue-700"
                              asChild
                            >
                              <a href={`/api/ecommerce/orders/${order.id}/invoice`} target="_blank" rel="noreferrer">
                                <Download className="w-3 h-3 mr-0.5" /> Invoice
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 text-emerald-600 hover:text-emerald-700"
                              asChild
                            >
                              <a href={`/api/ecommerce/orders/${order.id}/shipping-label`} target="_blank" rel="noreferrer">
                                <FileText className="w-3 h-3 mr-0.5" /> Label
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 text-amber-600 hover:text-amber-700"
                              onClick={() => handleEditOrderClick(order)}
                            >
                              <Edit className="w-3 h-3 mr-0.5" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 text-destructive hover:text-red-700"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this order?")) {
                                  deleteOrderMutation.mutate(order.id);
                                }
                              }}
                            >
                              <Trash className="w-3 h-3 mr-0.5" /> Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {ordersData.total > limit && (
                    <div className="flex justify-end gap-2 pt-2">
                      <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                      <Button size="sm" variant="outline" disabled={page * limit >= ordersData.total} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. CUSTOMERS TAB */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Customer Registry</CardTitle>
              <CardDescription>List of customers who have made orders on this store flow.</CardDescription>
            </CardHeader>
            <CardContent>
              {isCustomersLoading ? (
                <div className="text-center py-6 flex items-center justify-center gap-2 text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading customers...
                </div>
              ) : !customersData?.customers || customersData.customers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No checkout customers found.</div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer Phone</TableHead>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Total Orders</TableHead>
                        <TableHead>Total Spent</TableHead>
                        <TableHead>Last Order Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customersData.customers.map((cust) => (
                        <TableRow key={cust.phone}>
                          <TableCell className="font-mono">{cust.phone}</TableCell>
                          <TableCell>{cust.name || "Customer"}</TableCell>
                          <TableCell className="font-semibold text-gray-700">{cust.totalOrders}</TableCell>
                          <TableCell className="font-bold text-emerald-600">INR {parseFloat(cust.totalSpent || "0").toFixed(2)}</TableCell>
                          <TableCell className="text-gray-500 text-sm">{new Date(cust.lastOrderDate).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {customersData.total > limit && (
                    <div className="flex justify-end gap-2 pt-2">
                      <Button size="sm" variant="outline" disabled={customersPage === 1} onClick={() => setCustomersPage(p => p - 1)}>Prev</Button>
                      <Button size="sm" variant="outline" disabled={customersPage * limit >= customersData.total} onClick={() => setCustomersPage(p => p + 1)}>Next</Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3.5 ABANDONED CARTS TAB */}
        <TabsContent value="abandoned_carts">
          <div className="space-y-4">
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border border-amber-200 bg-amber-50/40 shadow-xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                      {t("ecommerce.abandonedCarts.totalAbandoned")}
                    </p>
                    <h3 className="text-2xl font-extrabold text-amber-950 mt-1">
                      {abandonedCartsData?.stats?.totalAbandoned || 0}
                    </h3>
                    <p className="text-[11px] text-amber-600 mt-0.5">
                      Unfinished checkout sessions
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-amber-100 text-amber-700">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-emerald-200 bg-emerald-50/40 shadow-xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                      {t("ecommerce.abandonedCarts.totalRecovered")}
                    </p>
                    <h3 className="text-2xl font-extrabold text-emerald-950 mt-1">
                      {abandonedCartsData?.stats?.totalRecovered || 0}
                    </h3>
                    <p className="text-[11px] text-emerald-600 mt-0.5">
                      Completed after follow-up
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-blue-200 bg-blue-50/40 shadow-xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                      {t("ecommerce.abandonedCarts.recoveryRate")}
                    </p>
                    <h3 className="text-2xl font-extrabold text-blue-950 mt-1">
                      {abandonedCartsData?.stats?.recoveryRate || 0}%
                    </h3>
                    <p className="text-[11px] text-blue-600 mt-0.5">
                      Conversion efficiency
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100 text-blue-700">
                    <Percent className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-purple-200 bg-purple-50/40 shadow-xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                      {t("ecommerce.abandonedCarts.recoveredRevenue")}
                    </p>
                    <h3 className="text-2xl font-extrabold text-purple-950 mt-1">
                      {storeCurrency} {Number(abandonedCartsData?.stats?.recoveredRevenue || 0).toFixed(2)}
                    </h3>
                    <p className="text-[11px] text-purple-600 mt-0.5">
                      Unrecovered: {storeCurrency} {Number(abandonedCartsData?.stats?.lostPotentialRevenue || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100 text-purple-700">
                    <Coins className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Abandoned Carts Table Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-amber-600" />
                      {t("ecommerce.abandonedCarts.title")}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {t("ecommerce.abandonedCarts.subtitle")}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchAbandonedCarts()}
                    className="text-xs h-8"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Refresh
                  </Button>
                </div>

                {/* Filter and Search Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <Input
                    placeholder={t("ecommerce.abandonedCarts.searchPlaceholder")}
                    value={abandonedSearch}
                    onChange={(e) => {
                      setAbandonedSearch(e.target.value);
                      setAbandonedPage(1);
                    }}
                    className="text-xs h-9 bg-white"
                  />
                  <Select
                    value={abandonedStatusFilter}
                    onValueChange={(val) => {
                      setAbandonedStatusFilter(val);
                      setAbandonedPage(1);
                    }}
                  >
                    <SelectTrigger className="text-xs h-9 bg-white">
                      <SelectValue placeholder={t("ecommerce.abandonedCarts.allStatuses")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">{t("ecommerce.abandonedCarts.allStatuses")}</SelectItem>
                      <SelectItem value="abandoned" className="text-xs">{t("ecommerce.abandonedCarts.statusAbandoned")}</SelectItem>
                      <SelectItem value="recovered" className="text-xs">{t("ecommerce.abandonedCarts.statusRecovered")}</SelectItem>
                      <SelectItem value="cancelled" className="text-xs">{t("ecommerce.abandonedCarts.statusCancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={abandonedChannelFilter}
                    onValueChange={(val) => {
                      setAbandonedChannelFilter(val);
                      setAbandonedPage(1);
                    }}
                  >
                    <SelectTrigger className="text-xs h-9 bg-white">
                      <SelectValue placeholder="All Channels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Connected Channels</SelectItem>
                      {allChannels.map((c: any) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.name || c.phoneNumber || c.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent>
                {isAbandonedCartsLoading ? (
                  <div className="text-center py-10 flex items-center justify-center gap-2 text-gray-500 text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading abandoned carts...
                  </div>
                ) : !abandonedCartsData?.carts || abandonedCartsData.carts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-500" />
                    <p className="font-semibold text-gray-600 text-sm">{t("ecommerce.abandonedCarts.noCartsFound")}</p>
                    <p className="text-xs text-gray-400 mt-1">When shoppers start checkout and drop off, their sessions will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader className="bg-gray-50/80">
                          <TableRow>
                            <TableHead className="text-xs font-bold">{t("ecommerce.abandonedCarts.customer")}</TableHead>
                            <TableHead className="text-xs font-bold">{t("ecommerce.abandonedCarts.product")}</TableHead>
                            <TableHead className="text-xs font-bold">{t("ecommerce.abandonedCarts.droppedStep")}</TableHead>
                            <TableHead className="text-xs font-bold">{t("ecommerce.abandonedCarts.followups")}</TableHead>
                            <TableHead className="text-xs font-bold">Status</TableHead>
                            <TableHead className="text-xs font-bold">{t("ecommerce.abandonedCarts.lastActivity")}</TableHead>
                            <TableHead className="text-xs font-bold text-right">{t("ecommerce.abandonedCarts.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {abandonedCartsData.carts.map((cart: any) => {
                            const getStepBadge = (step: string) => {
                              if (!step) return null;
                              if (step === "waiting_for_quantity") {
                                return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">{t("ecommerce.abandonedCarts.stepQuantity")}</span>;
                              }
                              if (step.startsWith("waiting_for_field:")) {
                                const fieldVar = step.replace("waiting_for_field:", "");
                                return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">{t("ecommerce.abandonedCarts.stepField")}: {fieldVar}</span>;
                              }
                              if (step === "waiting_for_checkout_confirmation") {
                                return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">{t("ecommerce.abandonedCarts.stepConfirmation")}</span>;
                              }
                              if (step === "waiting_for_payment_method") {
                                return <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">{t("ecommerce.abandonedCarts.stepPaymentMethod")}</span>;
                              }
                              if (step === "waiting_for_qr_receipt") {
                                return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">{t("ecommerce.abandonedCarts.stepQrReceipt")}</span>;
                              }
                              return <span className="bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">{step}</span>;
                            };

                            const itemTotal = (parseFloat(cart.productPrice || "0") || 0) * (cart.quantity || 1);

                            return (
                              <TableRow key={cart.id} className="hover:bg-gray-50/50">
                                {/* Customer */}
                                <TableCell>
                                  <div className="font-semibold text-xs text-gray-900">{cart.customerName || "Customer"}</div>
                                  <div className="font-mono text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                    <PhoneCall className="w-3 h-3 text-gray-400" />
                                    {cart.customerPhone}
                                  </div>
                                </TableCell>

                                {/* Product */}
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {cart.productPhoto && (
                                      <img
                                        src={getPreviewUrl(cart.productPhoto)}
                                        alt={cart.productName || "Product"}
                                        className="w-8 h-8 rounded object-cover border shrink-0"
                                      />
                                    )}
                                    <div>
                                      <div className="font-medium text-xs text-gray-800 line-clamp-1">{cart.productName || "Item"}</div>
                                      <div className="text-[11px] font-bold text-emerald-700">
                                        {storeCurrency} {itemTotal.toFixed(2)} (x{cart.quantity || 1})
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>

                                {/* Dropped Step */}
                                <TableCell>
                                  {getStepBadge(cart.currentStep)}
                                </TableCell>

                                {/* Followups */}
                                <TableCell>
                                  <div className="space-y-1">
                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      cart.followupCount === 2
                                        ? "bg-purple-100 text-purple-800"
                                        : cart.followupCount === 1
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-gray-100 text-gray-600"
                                    }`}>
                                      {cart.followupCount || 0}/2 Follow-ups
                                    </span>
                                    {cart.followup1SentAt && (
                                      <div className="text-[10px] text-gray-400">
                                        1st: {new Date(cart.followup1SentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>

                                {/* Status */}
                                <TableCell>
                                  <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                                    cart.status === "recovered"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : cart.status === "cancelled"
                                      ? "bg-gray-100 text-gray-700 border border-gray-300"
                                      : "bg-amber-100 text-amber-800 border border-amber-300"
                                  }`}>
                                    {cart.status}
                                  </span>
                                </TableCell>

                                {/* Last Activity */}
                                <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                                  {cart.lastActivityAt ? new Date(cart.lastActivityAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A"}
                                </TableCell>

                                {/* Actions */}
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Send Recovery Message button */}
                                    {cart.status === "abandoned" && (
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          setSelectedCartForRecovery(cart);
                                          const defaultMsg = `👋 Hi ${cart.customerName || "there"}! We noticed you left *${cart.productName || "your item"}* in your cart.\n\nItems in your cart are in high demand and might sell out soon. Would you like to complete your order now?`;
                                          setCustomRecoveryMessage(defaultMsg);
                                          setRecoveryModalOpen(true);
                                        }}
                                        className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1 px-2.5 shadow-xs"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        {t("ecommerce.abandonedCarts.sendRecovery")}
                                      </Button>
                                    )}

                                    {/* Open Chat Link */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      asChild
                                      className="h-7 text-xs px-2 text-gray-700 hover:bg-gray-100"
                                    >
                                      <a href={`/inbox?conversationId=${cart.conversationId}`} target="_blank" rel="noreferrer">
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </Button>

                                    {/* Status Change Popover / Quick Toggle */}
                                    {cart.status === "abandoned" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateCartStatusMutation.mutate({ id: cart.id, status: "recovered" })}
                                        disabled={updateCartStatusMutation.isPending}
                                        className="h-7 text-[11px] text-emerald-700 border-emerald-300 hover:bg-emerald-50 px-2"
                                        title={t("ecommerce.abandonedCarts.markRecovered")}
                                      >
                                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                                      </Button>
                                    )}

                                    {/* Delete Button */}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        if (window.confirm("Are you sure you want to delete this abandoned cart record?")) {
                                          deleteCartMutation.mutate(cart.id);
                                        }
                                      }}
                                      disabled={deleteCartMutation.isPending}
                                      className="h-7 text-gray-400 hover:text-red-600 px-1.5"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {abandonedCartsData.total > 10 && (
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-xs text-gray-500">
                          Showing {(abandonedPage - 1) * 10 + 1} to {Math.min(abandonedPage * 10, abandonedCartsData.total)} of {abandonedCartsData.total} abandoned carts
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={abandonedPage === 1}
                            onClick={() => setAbandonedPage(p => p - 1)}
                            className="text-xs h-8"
                          >
                            Prev
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={abandonedPage * 10 >= abandonedCartsData.total}
                            onClick={() => setAbandonedPage(p => p + 1)}
                            className="text-xs h-8"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Recovery Message Dialog */}
            <Dialog open={recoveryModalOpen} onOpenChange={setRecoveryModalOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <MessageCircle className="w-4 h-4 text-amber-600" />
                    {t("ecommerce.abandonedCarts.sendRecoveryTitle")}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {t("ecommerce.abandonedCarts.sendRecoveryDesc")}
                  </DialogDescription>
                </DialogHeader>

                {selectedCartForRecovery && (
                  <div className="space-y-4 py-2">
                    {/* Customer & Product Summary Pill */}
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-amber-900">
                          {selectedCartForRecovery.customerName || "Customer"} ({selectedCartForRecovery.customerPhone})
                        </span>
                        <span className="font-bold text-emerald-700">
                          {storeCurrency} {(parseFloat(selectedCartForRecovery.productPrice || "0") * (selectedCartForRecovery.quantity || 1)).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-amber-800 text-[11px]">
                        🛍️ {selectedCartForRecovery.productName} (x{selectedCartForRecovery.quantity || 1}) &bull; Dropped at: <span className="font-semibold">{selectedCartForRecovery.currentStep}</span>
                      </div>
                    </div>

                    {/* Message Prompt */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">
                        {t("ecommerce.abandonedCarts.recoveryMessagePrompt")}
                      </Label>
                      <Textarea
                        rows={4}
                        value={customRecoveryMessage}
                        onChange={(e) => setCustomRecoveryMessage(e.target.value)}
                        className="text-xs bg-white font-sans"
                        placeholder="Type recovery message..."
                      />
                      <p className="text-[10px] text-gray-400">
                        The message will be sent with interactive buttons: <strong>🛒 Complete Order</strong> and <strong>❌ Cancel</strong>.
                      </p>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRecoveryModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (selectedCartForRecovery) {
                        sendRecoveryMutation.mutate({
                          id: selectedCartForRecovery.id,
                          customMessage: customRecoveryMessage
                        });
                      }
                    }}
                    disabled={sendRecoveryMutation.isPending}
                    className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  >
                    {sendRecoveryMutation.isPending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                        {t("ecommerce.abandonedCarts.sending")}
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1" />
                        {t("ecommerce.abandonedCarts.sendNow")}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        {/* 4. CONFIG TAB */}
        <TabsContent value="config">
          <Card>
            <CardHeader className="pb-4 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">Store Configuration</CardTitle>
                  <CardDescription>Setup general settings, checkout flow & payments, abandoned cart, reports, and AI assistant.</CardDescription>
                </div>
                <Button
                  type="submit"
                  form="store-config-form"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm self-start sm:self-auto"
                  disabled={saveConfigMutation.isPending}
                >
                  {saveConfigMutation.isPending ? "Saving..." : "Save All Settings"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form id="store-config-form" onSubmit={handleConfigSubmit} className="space-y-6">
                <Tabs value={configSubTab} onValueChange={setConfigSubTab} className="w-full">
                  <TabsList className="grid grid-cols-2 md:grid-cols-6 h-auto p-1 bg-slate-100/90 rounded-xl mb-6 gap-1">
                    <TabsTrigger value="general" className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm rounded-lg">
                      <Settings className="w-3.5 h-3.5 text-purple-600" />
                      General Settings
                    </TabsTrigger>
                    <TabsTrigger value="checkout" className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      Checkout & Payments
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm rounded-lg">
                      <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                      WhatsApp Templates
                    </TabsTrigger>
                    <TabsTrigger value="abandoned_cart" className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm rounded-lg">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      Abandoned Cart
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-lg">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                      Reports & Notifications
                    </TabsTrigger>
                    <TabsTrigger value="ai_team" className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded-lg">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      AI & Team Routing
                    </TabsTrigger>
                  </TabsList>

                  {/* Sub-Tab 1: General Settings */}
                  <TabsContent value="general" className="space-y-6 mt-0">
                    {/* Store Identity Profile Section */}
                    <div className="space-y-4 border p-4 rounded-lg bg-gray-50/50">
                      <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-purple-600" />
                        Store Identity Profile (Displayed on Invoices & Labels)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="storeName" className="font-semibold text-gray-700">Store Name</Label>
                          <Input
                            id="storeName"
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            placeholder="e.g. SKYSECRETARY CLOUD KSA"
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="storeWebsite" className="font-semibold text-gray-700">Store Website</Label>
                          <Input
                            id="storeWebsite"
                            value={storeWebsite}
                            onChange={(e) => setStoreWebsite(e.target.value)}
                            placeholder="e.g. www.skysecretary.com"
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="font-semibold text-gray-700">Store Logo URL</Label>
                          <div className="flex gap-2">
                            <Input
                              value={storeLogo}
                              onChange={(e) => setStoreLogo(e.target.value)}
                              placeholder="e.g. https://.../logo.png"
                              className="h-9 text-xs flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 text-xs whitespace-nowrap"
                              onClick={() => {
                                const inputEl = document.createElement("input");
                                inputEl.type = "file";
                                inputEl.accept = "image/*";
                                inputEl.onchange = async (e: any) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  try {
                                    toast({ title: "Uploading...", description: "Uploading logo to storage..." });
                                    const uploadRes = await fetch("/api/media/upload", {
                                      method: "POST",
                                      body: formData,
                                    });
                                    if (!uploadRes.ok) throw new Error("Upload failed");
                                    const data = await uploadRes.json();
                                    setStoreLogo(data.url);
                                    toast({ title: "Success", description: "Logo uploaded successfully!", variant: "default" });
                                  } catch (err: any) {
                                    toast({ title: "Upload Failed", description: err.message || "Failed to upload logo", variant: "destructive" });
                                  }
                                };
                                inputEl.click();
                              }}
                            >
                              Upload
                            </Button>
                          </div>
                          {storeLogo && (
                            <div className="mt-2 w-16 h-16 border rounded overflow-hidden">
                              <img src={getPreviewUrl(storeLogo)} className="w-full h-full object-contain" alt="Store logo" />
                            </div>
                          )}
                        </div>
                        <div className="col-span-1 md:col-span-3 space-y-1.5">
                          <Label htmlFor="storeAddress" className="font-semibold text-gray-700">Store Pickup Address (Displayed on Return Shipping Labels)</Label>
                          <Textarea
                            id="storeAddress"
                            value={storeAddress}
                            onChange={(e) => setStoreAddress(e.target.value)}
                            placeholder="e.g. Warehouse A1, Industrial Area, Riyadh, Saudi Arabia"
                            className="min-h-[60px] text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* General Shop Flows & Inbound Flow */}
                    <div className="space-y-4 border p-4 rounded-lg bg-white">
                      <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-purple-600" />
                        General Shop Flows & Inbound Triggers
                      </h3>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <Label className="font-semibold">Store-wise Catalog Flow</Label>
                          <span className="text-xs text-gray-500">Enable automatic product lists when customer triggers the keyword.</span>
                        </div>
                        <Switch checked={storeFlowActive} onCheckedChange={setStoreFlowActive} />
                      </div>

                      {/* Active Product Direct Inbound Flow Option */}
                      <div className="space-y-1.5 p-3 rounded-lg border bg-purple-50/40 border-purple-100/80">
                        <div className="space-y-0.5">
                          <Label className="font-semibold text-gray-800 text-xs flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                            Active Product for Direct Inbound Flow (New / First Messages)
                          </Label>
                          <span className="text-[11px] text-gray-500 block leading-tight">
                            Select a product to automatically initiate its product details & checkout flow for any new contact's first message without needing a trigger keyword. Select "None" to keep trigger keyword based behavior.
                          </span>
                        </div>
                        <Select value={activeProductId || "none"} onValueChange={(val) => setActiveProductId(val === "none" ? "" : val)}>
                          <SelectTrigger className="h-9 text-xs bg-white mt-1">
                            <SelectValue placeholder="None (Trigger Keyword Based)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None (Trigger Keyword Based)</SelectItem>
                            {(productsData?.products || []).map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} — {(p as any).currency || storeCurrency} {p.price} {p.triggerKeyword ? `(Trigger: "${p.triggerKeyword}")` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="storeKeyword">Store Trigger Keyword</Label>
                          <Input
                            id="storeKeyword"
                            value={storeKeyword}
                            onChange={(e) => setStoreKeyword(e.target.value)}
                            placeholder="e.g. store, shop, catalogue"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="storeCurrency">Store Base Currency</Label>
                          <select
                            id="storeCurrency"
                            value={storeCurrency}
                            onChange={(e) => setStoreCurrency(e.target.value)}
                            className="w-full border rounded p-2 text-sm bg-white"
                          >
                            <option value="INR">INR (₹)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="AED">AED (AED)</option>
                            <option value="SAR">SAR (SAR)</option>
                            <option value="AUD">AUD (A$)</option>
                            <option value="CAD">CAD (C$)</option>
                            <option value="JPY">JPY (¥)</option>
                            <option value="SGD">SGD (S$)</option>
                            <option value="QAR">QAR (QAR)</option>
                            <option value="OMR">OMR (OMR)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1 pt-2 border-t">
                        <Label htmlFor="welcome">Welcome Text Message</Label>
                        <Textarea
                          id="welcome"
                          value={welcomeMsg}
                          onChange={(e) => setWelcomeMsg(e.target.value)}
                          placeholder="Welcome message..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="headerType">Header Media Type</Label>
                          <select
                            id="headerType"
                            value={welcomeHeaderType}
                            onChange={(e) => setWelcomeHeaderType(e.target.value)}
                            className="w-full border rounded p-2 text-sm bg-white"
                          >
                            <option value="none">No Header</option>
                            <option value="image">Image Header</option>
                            <option value="video">Video Header</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="headerUrl">Header Media URL</Label>
                          <div className="flex gap-2">
                            <Input
                              id="headerUrl"
                              value={welcomeHeaderUrl}
                              onChange={(e) => setWelcomeHeaderUrl(e.target.value)}
                              placeholder="e.g. https://img.com/header.jpg"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setGalleryTarget("welcome_header");
                                setIsGalleryOpen(true);
                              }}
                            >
                              Gallery
                            </Button>
                          </div>
                          {welcomeHeaderUrl && welcomeHeaderType === "image" && (
                            <div className="mt-2 w-20 h-20 border rounded overflow-hidden">
                              <img src={getPreviewUrl(welcomeHeaderUrl)} className="w-full h-full object-cover" alt="header preview" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Welcome Message Sequence */}
                    <div className="space-y-4 border p-4 rounded-lg bg-gray-50/50">
                      <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                        Welcome Messages Sequence (Multiple Messages)
                      </h3>
                      <p className="text-xs text-gray-500">
                        Define a sequence of messages sent one-by-one to shoppers when they trigger the catalog or individual products. Order them by Sequence Weight.
                      </p>

                      <div className="space-y-3">
                        {welcomeMessages.map((msg, idx) => (
                          <div key={msg.id || idx} className="border p-3 rounded-md bg-white space-y-3 relative shadow-sm">
                            <div className="flex justify-between items-center border-b pb-1.5">
                              <span className="text-xs font-bold text-purple-700">Message #{idx + 1}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 p-1 h-6"
                                onClick={() => {
                                  setWelcomeMessages(welcomeMessages.filter((_, i) => i !== idx));
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Media Type</Label>
                                <select
                                  value={msg.mediaType || "none"}
                                  onChange={(e) => {
                                    const updated = [...welcomeMessages];
                                    updated[idx].mediaType = e.target.value as any;
                                    setWelcomeMessages(updated);
                                  }}
                                  className="w-full border rounded p-1.5 text-xs bg-white"
                                >
                                  <option value="none">No Media (Text Only)</option>
                                  <option value="image">Image</option>
                                  <option value="video">Video</option>
                                  <option value="audio">Audio</option>
                                </select>
                              </div>

                              <div className="space-y-1 md:col-span-2">
                                <Label className="text-xs">Media URL (Supports Gallery)</Label>
                                <div className="flex gap-2">
                                  <Input
                                    value={msg.mediaUrl || ""}
                                    onChange={(e) => {
                                      const updated = [...welcomeMessages];
                                      updated[idx].mediaUrl = e.target.value;
                                      setWelcomeMessages(updated);
                                    }}
                                    placeholder="e.g. https://domain.com/image.png"
                                    className="h-8 text-xs"
                                    disabled={msg.mediaType === "none"}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    disabled={msg.mediaType === "none"}
                                    onClick={() => {
                                      setGalleryTarget(`welcome_seq_${idx}`);
                                      setIsGalleryOpen(true);
                                    }}
                                  >
                                    Gallery
                                  </Button>
                                </div>
                                {msg.mediaType === "image" && msg.mediaUrl && (
                                  <div className="mt-2 w-14 h-14 border rounded overflow-hidden">
                                    <img src={getPreviewUrl(msg.mediaUrl)} className="w-full h-full object-cover" alt="preview" />
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div className="space-y-1 md:col-span-3">
                                <Label className="text-xs font-semibold">Message Text Body</Label>
                                <Textarea
                                  value={msg.text || ""}
                                  onChange={(e) => {
                                    const updated = [...welcomeMessages];
                                    updated[idx].text = e.target.value;
                                    setWelcomeMessages(updated);
                                  }}
                                  placeholder="Enter message text..."
                                  className="text-xs min-h-[50px]"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Sequence Weight</Label>
                                <Input
                                  type="number"
                                  value={msg.sortOrder}
                                  onChange={(e) => {
                                    const updated = [...welcomeMessages];
                                    updated[idx].sortOrder = parseInt(e.target.value) || 0;
                                    setWelcomeMessages(updated);
                                  }}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-dashed border-purple-300 text-purple-700 hover:bg-purple-50 text-xs"
                          onClick={() => {
                            setWelcomeMessages([
                              ...welcomeMessages,
                              {
                                id: Math.random().toString(36).substring(7),
                                text: "",
                                mediaType: "none",
                                mediaUrl: "",
                                sortOrder: welcomeMessages.length + 1
                              }
                            ]);
                          }}
                        >
                          + Add Welcome Message
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saveConfigMutation.isPending}>
                        {saveConfigMutation.isPending ? "Saving..." : "Save General Settings"}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Sub-Tab 2: Checkout & Payments */}
                  <TabsContent value="checkout" className="space-y-6 mt-0">
                    {/* Checkout Questions Flow */}
                    <div className="space-y-4 border p-4 rounded-lg bg-white">
                      <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-emerald-600" />
                        Checkout Questions Flow
                      </h3>

                      <div className="flex items-center justify-between p-3 bg-emerald-50/40 border border-emerald-100 rounded-lg">
                        <div className="space-y-0.5">
                          <Label className="font-semibold text-gray-800 flex items-center gap-1.5 text-xs">
                            <Package className="w-4 h-4 text-emerald-600" />
                            Ask Quantity Question during Checkout
                          </Label>
                          <span className="text-[11px] text-gray-500 block leading-tight">
                            When disabled, checkout skips asking "How many Qty?" (defaults to 1) and proceeds directly to customer details and payment.
                          </span>
                        </div>
                        <Switch checked={askQuantity} onCheckedChange={setAskQuantity} />
                      </div>

                      <div className="space-y-3">
                        <Label className="font-semibold text-gray-700 block">Checkout Fields (Q&A List)</Label>
                        {checkoutFields.map((field, index) => (
                          <div key={index} className="flex flex-col sm:flex-row gap-2 border p-3 rounded-md bg-gray-50/50 relative">
                            <div className="flex-grow space-y-1">
                              <Label className="text-[10px] text-gray-500 font-bold uppercase">Question Prompt Text</Label>
                              <Input
                                value={field.text}
                                onChange={(e) => {
                                  const copy = [...checkoutFields];
                                  copy[index].text = e.target.value;
                                  setCheckoutFields(copy);
                                }}
                                placeholder="Please enter your full name:"
                                className="text-xs bg-white"
                              />
                            </div>
                            <div className="w-full sm:w-1/3 space-y-1">
                              <Label className="text-[10px] text-gray-500 font-bold uppercase">Variable Key Name</Label>
                              <Input
                                value={field.variable}
                                onChange={(e) => {
                                  const copy = [...checkoutFields];
                                  copy[index].variable = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                                  setCheckoutFields(copy);
                                }}
                                placeholder="name"
                                className="text-xs bg-white"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 self-end"
                              onClick={() => {
                                setCheckoutFields(checkoutFields.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full text-indigo-600 hover:text-indigo-700 border-indigo-200 hover:bg-indigo-50/50 flex items-center justify-center gap-1 mt-2 text-xs"
                          onClick={() => {
                            setCheckoutFields([...checkoutFields, { text: "", variable: "" }]);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add New Question
                        </Button>
                      </div>
                    </div>

                    {/* Delivery Fee Configuration Section */}
                    <div className="space-y-4 border p-4 rounded-lg bg-emerald-50/20 border-emerald-100">
                      <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-emerald-600" />
                        Delivery & Shipping Configuration
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                          <Label htmlFor="storeCountry" className="font-semibold text-gray-700">Store Region / Country</Label>
                          <select
                            id="storeCountry"
                            value={storeCountry}
                            onChange={(e) => {
                              setStoreCountry(e.target.value);
                              setStateDeliveryFees({}); // clear overrides on country change
                            }}
                            className="w-full border rounded h-9 text-xs p-2 bg-white"
                          >
                            {countriesList.map(c => (
                              <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="deliveryFeeType" className="font-semibold text-gray-700">Delivery Fee Calculation Type</Label>
                          <select
                            id="deliveryFeeType"
                            value={deliveryFeeType}
                            onChange={(e) => setDeliveryFeeType(e.target.value)}
                            className="w-full border rounded h-9 text-xs p-2 bg-white"
                          >
                            <option value="flat">Flat Shipping Fee (Default)</option>
                            <option value="statewise">State-wise Shipping Fee</option>
                          </select>
                        </div>

                        {deliveryFeeType === "flat" ? (
                          <div className="space-y-1.5">
                            <Label htmlFor="flatDeliveryFee" className="font-semibold text-gray-700">Flat Delivery Fee ({storeCurrency})</Label>
                            <Input
                              id="flatDeliveryFee"
                              type="number"
                              step="0.01"
                              value={flatDeliveryFee}
                              onChange={(e) => setFlatDeliveryFee(e.target.value)}
                              placeholder="0"
                              className="h-9 text-xs"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <Label htmlFor="defaultDeliveryFee" className="font-semibold text-gray-700">Default State Delivery Fee ({storeCurrency})</Label>
                            <Input
                              id="defaultDeliveryFee"
                              type="number"
                              step="0.01"
                              value={defaultDeliveryFee}
                              onChange={(e) => setDefaultDeliveryFee(e.target.value)}
                              placeholder="0"
                              className="h-9 text-xs"
                            />
                          </div>
                        )}
                      </div>

                      {deliveryFeeType === "statewise" && (
                        <div className="mt-4 pt-4 border-t border-emerald-100/50 space-y-4">
                          <h4 className="font-semibold text-sm text-slate-700">State-specific Delivery Fee Overrides</h4>
                          <div className="flex flex-wrap items-end gap-3 bg-white p-3 rounded border border-emerald-100">
                            <div className="space-y-1.5 w-[200px]">
                              <Label htmlFor="overrideState" className="text-xs text-gray-600">Select State</Label>
                              <select
                                id="overrideState"
                                value={selectedStateOverride}
                                onChange={(e) => setSelectedStateOverride(e.target.value)}
                                className="w-full border rounded h-8 text-xs p-1 bg-white"
                              >
                                <option value="">-- Choose State --</option>
                                {(countryStates[storeCountry] || []).map(st => (
                                  <option key={st} value={st} disabled={!!stateDeliveryFees[st]}>{st}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1.5 w-[150px]">
                              <Label htmlFor="overrideFee" className="text-xs text-gray-600">Delivery Fee ({storeCurrency})</Label>
                              <Input
                                id="overrideFee"
                                type="number"
                                step="0.01"
                                value={overrideFeeInput}
                                onChange={(e) => setOverrideFeeInput(e.target.value)}
                                placeholder="Fee"
                                className="h-8 text-xs"
                              />
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={handleAddStateOverride}
                            >
                              Add Override
                            </Button>
                          </div>

                          {Object.keys(stateDeliveryFees).length > 0 ? (
                            <div className="border rounded-md overflow-hidden bg-white max-w-lg">
                              <Table className="text-xs">
                                <TableHeader>
                                  <TableRow className="bg-slate-50">
                                    <TableHead className="py-2 h-8">State</TableHead>
                                    <TableHead className="py-2 h-8">Fee ({storeCurrency})</TableHead>
                                    <TableHead className="py-2 h-8 text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Object.entries(stateDeliveryFees).map(([state, fee]) => (
                                    <TableRow key={state} className="hover:bg-slate-50/50">
                                      <TableCell className="py-1.5 font-medium">{state}</TableCell>
                                      <TableCell className="py-1.5">{fee}</TableCell>
                                      <TableCell className="py-1.5 text-right">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => handleRemoveStateOverride(state)}
                                        >
                                          <Trash className="w-3.5 h-3.5" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">No specific state delivery fees configured yet. Default state fee will apply to all regions.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Custom Payment Option Labels */}
                    <div className="border p-4 rounded-lg bg-white space-y-3">
                      <h4 className="font-semibold text-sm text-slate-700 border-b pb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        Custom Payment Option Labels
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="labelCod">Cash on Delivery (COD) Label</Label>
                          <Input
                            id="labelCod"
                            value={labelCod}
                            onChange={(e) => setLabelCod(e.target.value)}
                            placeholder="e.g. Cash on Delivery (COD)"
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="labelUpiDirect">UPI Direct Pay Label</Label>
                          <Input
                            id="labelUpiDirect"
                            value={labelUpiDirect}
                            onChange={(e) => setLabelUpiDirect(e.target.value)}
                            placeholder="e.g. UPI Direct Mobile Pay"
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="labelQrPay">UPI QR Code Pay Label</Label>
                          <Input
                            id="labelQrPay"
                            value={labelQrPay}
                            onChange={(e) => setLabelQrPay(e.target.value)}
                            placeholder="e.g. UPI (Pay via QR Code)"
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="labelGateway">Online Gateway Pay Label</Label>
                          <Input
                            id="labelGateway"
                            value={labelGateway}
                            onChange={(e) => setLabelGateway(e.target.value)}
                            placeholder="e.g. Online Payment"
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* UPI Payment Configurations */}
                    <div className="space-y-4 border p-4 rounded-lg bg-white">
                      <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                        <Coins className="w-4 h-4 text-emerald-600" />
                        UPI Payment Configurations
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="upiId">Merchant UPI ID (for Direct Pay redirection)</Label>
                          <Input
                            id="upiId"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="e.g. merchant@upi"
                          />
                          <span className="text-[10px] text-gray-500 block leading-tight">
                            Generates direct deep-links that launch GPay/PhonePe automatically on mobile checkouts.
                          </span>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="upiMerchant">Payee Merchant/Display Name</Label>
                          <Input
                            id="upiMerchant"
                            value={upiMerchantName}
                            onChange={(e) => setUpiMerchantName(e.target.value)}
                            placeholder="e.g. Store Name"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 pt-2 border-t">
                        <Label htmlFor="qr">UPI Payment Scan QR Code Image URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="qr"
                            value={qrCodeUrl}
                            onChange={(e) => setQrCodeUrl(e.target.value)}
                            placeholder="e.g. https://img.com/upi-qr-code.jpg"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setGalleryTarget("qr_code");
                              setIsGalleryOpen(true);
                            }}
                          >
                            Gallery
                          </Button>
                        </div>
                        {qrCodeUrl && (
                          <div className="mt-2 w-20 h-20 border rounded overflow-hidden">
                            <img src={getPreviewUrl(qrCodeUrl)} className="w-full h-full object-cover" alt="QR code preview" />
                          </div>
                        )}
                        <span className="text-[10px] text-gray-500 block leading-tight">
                          Will send QR code image to shopper's chat for manual scanning.
                        </span>
                      </div>
                    </div>

                    {/* Online Gateways Integration */}
                    <div className="border p-4 rounded-lg space-y-4 bg-white">
                      <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        Online Gateways Integration
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Instamojo */}
                        <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
                          <h4 className="font-bold text-emerald-800 text-sm">Instamojo Configuration</h4>
                          <div className="space-y-1">
                            <Label htmlFor="instaKey">Instamojo API Key</Label>
                            <Input
                              id="instaKey"
                              type="password"
                              value={instaKey}
                              onChange={(e) => setInstaKey(e.target.value)}
                              placeholder="API Key"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="instaToken">Instamojo Auth Token</Label>
                            <Input
                              id="instaToken"
                              type="password"
                              value={instaToken}
                              onChange={(e) => setInstaToken(e.target.value)}
                              placeholder="Auth Token"
                            />
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            <Label className="text-sm font-semibold">Sandbox / Test Mode</Label>
                            <Switch checked={instaSandbox} onCheckedChange={setInstaSandbox} />
                          </div>
                        </div>

                        {/* Razorpay */}
                        <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
                          <h4 className="font-bold text-emerald-800 text-sm">Razorpay Configuration</h4>
                          <div className="space-y-1">
                            <Label htmlFor="rzpKey">Razorpay Key ID</Label>
                            <Input
                              id="rzpKey"
                              type="password"
                              value={rzpKeyId}
                              onChange={(e) => setRzpKeyId(e.target.value)}
                              placeholder="Key ID"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="rzpSecret">Razorpay Key Secret</Label>
                            <Input
                              id="rzpSecret"
                              type="password"
                              value={rzpKeySecret}
                              onChange={(e) => setRzpKeySecret(e.target.value)}
                              placeholder="Key Secret"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saveConfigMutation.isPending}>
                        {saveConfigMutation.isPending ? "Saving..." : "Save Checkout & Payments"}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Sub-Tab: WhatsApp Templates (Meta & QR) */}
                  <TabsContent value="templates" className="space-y-6 mt-0">
                    {/* Header Banner */}
                    <div className="border p-4 rounded-xl bg-gradient-to-r from-teal-50/80 via-emerald-50/50 to-blue-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-teal-100 shadow-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-teal-600 text-white shadow-sm">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                              WhatsApp Notification Templates
                              <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Category: UTILITY
                              </span>
                            </h3>
                            <p className="text-xs text-gray-600 mt-0.5">
                              Pre-formatted for guaranteed Meta Cloud API <strong className="text-teal-700 font-semibold">UTILITY</strong> approval. Automatically delivered as rich templates on Cloud API channels and plain formatted text on QR Code channels.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => refetchEcomTemplates()}
                          className="text-xs border-teal-200 text-teal-700 hover:bg-teal-50"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                          Refresh Status
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => provisionTemplatesMutation.mutate()}
                          disabled={provisionTemplatesMutation.isPending}
                          className="text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {provisionTemplatesMutation.isPending ? "Provisioning..." : "⚡ Auto-Provision & Sync All"}
                        </Button>
                      </div>
                    </div>

                    {/* Meta Guidelines & QR Compatibility Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/60 text-xs space-y-1.5 text-blue-900">
                        <div className="font-bold flex items-center gap-1.5 text-blue-800">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          Meta Cloud API (WABA) Standard
                        </div>
                        <p className="text-blue-700 text-[11px] leading-relaxed">
                          Templates are submitted in the <strong>UTILITY</strong> category with full variable samples so Meta approves them instantly. Edit the copy below and click <em>Save & Submit</em> to re-submit modified templates for live re-approval.
                        </p>
                      </div>
                      <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50/60 text-xs space-y-1.5 text-purple-900">
                        <div className="font-bold flex items-center gap-1.5 text-purple-800">
                          <Activity className="w-4 h-4 text-purple-600" />
                          QR Code (Baileys) Auto-Formatting
                        </div>
                        <p className="text-purple-700 text-[11px] leading-relaxed">
                          If you are using a QR-connected WhatsApp number, our engine automatically interpolates all variables into clean WhatsApp markdown with text call-to-actions (e.g. <em>Reply '1' to complete order</em>) without unsupported buttons.
                        </p>
                      </div>
                    </div>

                    {/* Templates List */}
                    <div className="space-y-6">
                      {(ecomTemplatesData?.templates || []).map((tpl: any) => {
                        const currentEdit = templateEdits[tpl.name] || {
                          header: tpl.header || tpl.defaultHeader || "",
                          body: tpl.body || tpl.defaultBody || "",
                          footer: tpl.footer || tpl.defaultFooter || "",
                        };

                        const isSubmitting = submittingTemplateName === tpl.name;

                        const renderStatusBadge = (status: string) => {
                          const s = (status || "").toUpperCase();
                          if (s === "APPROVED") {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                Meta Approved
                              </span>
                            );
                          }
                          if (s === "PENDING") {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Pending Meta Review
                              </span>
                            );
                          }
                          if (s === "REJECTED") {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                Rejected by Meta
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              <Sparkles className="w-3 h-3 text-slate-500" />
                              Not Submitted
                            </span>
                          );
                        };

                        return (
                          <div key={tpl.name} className="border rounded-xl bg-white shadow-sm overflow-hidden transition-all hover:border-teal-300">
                            <div className="p-4 bg-slate-50/70 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded">
                                    {tpl.name}
                                  </span>
                                  <h4 className="font-bold text-gray-900 text-sm">
                                    {tpl.title}
                                  </h4>
                                  {renderStatusBadge(tpl.status)}
                                  <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                    {tpl.category}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {tpl.description}
                                </p>
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
                                    footer: currentEdit.footer,
                                  });
                                }}
                                className="text-xs bg-teal-600 hover:bg-teal-700 text-white shrink-0 shadow-sm"
                              >
                                <Send className="w-3.5 h-3.5 mr-1.5" />
                                {isSubmitting ? "Submitting..." : "Save & Submit to Meta"}
                              </Button>
                            </div>

                            <div className="p-4 space-y-4">
                              {/* Dynamic Variables */}
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                  <span>Available Dynamic Variables (click to append to body):</span>
                                </Label>
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
                                        toast({
                                          title: "Variable Added",
                                          description: `Appended ${tag} (${v.label}) to template body.`,
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 border text-[11px] text-gray-700 font-medium transition-colors"
                                    >
                                      <span className="font-mono font-bold text-teal-600">{`{{${v.index}}}`}</span>
                                      <span>{v.label}</span>
                                      <span className="text-[10px] text-gray-400">({v.sample})</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Header & Footer */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-semibold text-gray-700">Template Header (Optional Text Header)</Label>
                                  <Input
                                    value={currentEdit.header}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTemplateEdits(prev => ({
                                        ...prev,
                                        [tpl.name]: { ...currentEdit, header: val }
                                      }));
                                    }}
                                    placeholder="e.g. Order Confirmation"
                                    className="h-9 text-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-semibold text-gray-700">Template Footer (Optional)</Label>
                                  <Input
                                    value={currentEdit.footer}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTemplateEdits(prev => ({
                                        ...prev,
                                        [tpl.name]: { ...currentEdit, footer: val }
                                      }));
                                    }}
                                    placeholder="e.g. Thank you for shopping with us"
                                    className="h-9 text-xs"
                                  />
                                </div>
                              </div>

                              {/* Body */}
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700">Template Body (Message Copy)</Label>
                                <Textarea
                                  rows={4}
                                  value={currentEdit.body}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTemplateEdits(prev => ({
                                      ...prev,
                                      [tpl.name]: { ...currentEdit, body: val }
                                    }));
                                  }}
                                  className="text-xs font-sans leading-relaxed resize-y"
                                  placeholder="Enter template body text..."
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>

                  {/* Sub-Tab 3: Abandoned Cart */}
                  <TabsContent value="abandoned_cart" className="space-y-6 mt-0">
                    <div className="space-y-4 border p-4 rounded-lg bg-white shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                            <RotateCcw className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                              {t("ecommerce.abandonedCartSettings.title")}
                              <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                24h Window
                              </span>
                            </h3>
                            <p className="text-xs text-gray-500">
                              {t("ecommerce.abandonedCartSettings.subtitle")}
                            </p>
                          </div>
                        </div>
                        <Switch checked={abandonedCartRecoveryEnabled} onCheckedChange={setAbandonedCartRecoveryEnabled} />
                      </div>

                      {abandonedCartRecoveryEnabled && (
                        <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in-50 duration-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Follow-up 1 Delay */}
                            <div className="space-y-1.5 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                              <Label className="font-semibold text-gray-700 text-xs flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                {t("ecommerce.abandonedCartSettings.delay1")}
                              </Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={5}
                                  max={1440}
                                  value={abandonedCartDelay1Minutes}
                                  onChange={(e) => setAbandonedCartDelay1Minutes(parseInt(e.target.value) || 60)}
                                  className="text-xs bg-white w-28"
                                />
                                <span className="text-xs text-gray-500">minutes</span>
                              </div>
                              <p className="text-[11px] text-gray-400">
                                {t("ecommerce.abandonedCartSettings.delay1Help")}
                              </p>
                            </div>

                            {/* Follow-up 2 Delay */}
                            <div className="space-y-1.5 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                              <Label className="font-semibold text-gray-700 text-xs flex items-center gap-1.5">
                                <Flame className="w-3.5 h-3.5 text-orange-600" />
                                {t("ecommerce.abandonedCartSettings.delay2")}
                              </Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  max={23}
                                  value={abandonedCartDelay2Hours}
                                  onChange={(e) => setAbandonedCartDelay2Hours(parseInt(e.target.value) || 18)}
                                  className="text-xs bg-white w-28"
                                />
                                <span className="text-xs text-gray-500">hours</span>
                              </div>
                              <p className="text-[11px] text-gray-400">
                                {t("ecommerce.abandonedCartSettings.delay2Help")}
                              </p>
                            </div>
                          </div>

                          {/* Optional Incentive Discount Code & % */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="font-semibold text-gray-700 text-xs flex items-center gap-1.5">
                                <Percent className="w-3.5 h-3.5 text-amber-600" />
                                {t("ecommerce.abandonedCartSettings.discountCode")}
                              </Label>
                              <Input
                                value={abandonedCartDiscountCode}
                                onChange={(e) => setAbandonedCartDiscountCode(e.target.value.toUpperCase())}
                                placeholder="e.g. SAVE10 or COMEBACK"
                                className="text-xs bg-white uppercase font-mono"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="font-semibold text-gray-700 text-xs flex items-center gap-1.5">
                                <Percent className="w-3.5 h-3.5 text-amber-600" />
                                {t("ecommerce.abandonedCartSettings.discountPercent")}
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                value={abandonedCartDiscountPercent}
                                onChange={(e) => setAbandonedCartDiscountPercent(e.target.value)}
                                placeholder="10"
                                className="text-xs bg-white"
                              />
                            </div>
                          </div>

                          {/* Message Templates */}
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <Label className="font-semibold text-gray-700 text-xs">
                                {t("ecommerce.abandonedCartSettings.message1Template")}
                              </Label>
                              <Textarea
                                rows={3}
                                value={abandonedCartMessage1}
                                onChange={(e) => setAbandonedCartMessage1(e.target.value)}
                                placeholder="👋 Hi {name}! We noticed you left *{product_name}* in your cart. Would you like to complete your order now?"
                                className="text-xs bg-white font-sans"
                              />
                              <p className="text-[10px] text-gray-400">
                                Available placeholders: <code className="text-gray-600">{"{name}"}</code>, <code className="text-gray-600">{"{product_name}"}</code>, <code className="text-gray-600">{"{price}"}</code>, <code className="text-gray-600">{"{quantity}"}</code>
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="font-semibold text-gray-700 text-xs">
                                {t("ecommerce.abandonedCartSettings.message2Template")}
                              </Label>
                              <Textarea
                                rows={3}
                                value={abandonedCartMessage2}
                                onChange={(e) => setAbandonedCartMessage2(e.target.value)}
                                placeholder="⏰ *Last chance!* Your cart containing *{product_name}* is about to expire.{discount_info} Click Complete Order below to grab it before stock runs out!"
                                className="text-xs bg-white font-sans"
                              />
                              <p className="text-[10px] text-gray-400">
                                Available placeholders: <code className="text-gray-600">{"{name}"}</code>, <code className="text-gray-600">{"{product_name}"}</code>, <code className="text-gray-600">{"{discount_info}"}</code>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saveConfigMutation.isPending}>
                        {saveConfigMutation.isPending ? "Saving..." : "Save Abandoned Cart Settings"}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Sub-Tab 4: Reports & Notifications */}
                  <TabsContent value="reports" className="space-y-6 mt-0">
                    {/* Daily Orders Summary Email Report Card */}
                    <div className="space-y-4 border p-4 rounded-lg bg-white shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                              Daily Orders Summary Email Report
                              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                Excel Attachment (.xlsx)
                              </span>
                            </h3>
                            <p className="text-xs text-gray-500">
                              Automatically email a daily summary of all orders with an attached Excel spreadsheet (.xlsx) to configured recipient emails at a scheduled time.
                            </p>
                          </div>
                        </div>
                        <Switch checked={dailyReportEnabled} onCheckedChange={setDailyReportEnabled} />
                      </div>

                      {dailyReportEnabled && (
                        <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in-50 duration-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Scheduled Send Time */}
                            <div className="space-y-2 p-3.5 rounded-lg border border-gray-100 bg-gray-50/50">
                              <Label className="font-semibold text-gray-700 text-xs flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                Scheduled Daily Report Time (24h)
                              </Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="time"
                                  value={dailyReportTime}
                                  onChange={(e) => setDailyReportTime(e.target.value)}
                                  className="text-xs bg-white w-36 font-mono"
                                />
                                <span className="text-[11px] text-gray-400">
                                  (Daily trigger time)
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500">
                                Orders will be automatically compiled and emailed every day at this exact time.
                              </p>
                            </div>

                            {/* Test Send Trigger */}
                            <div className="space-y-2 p-3.5 rounded-lg border border-emerald-100 bg-emerald-50/30 flex flex-col justify-between">
                              <div>
                                <Label className="font-semibold text-gray-700 text-xs flex items-center gap-1.5">
                                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                  On-Demand / Test Report
                                </Label>
                                <p className="text-[11px] text-gray-500 mt-1">
                                  Send today's orders list and Excel spreadsheet immediately to verify email setup.
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSendTestReportNow}
                                disabled={isSendingTestReport || dailyReportEmails.length === 0}
                                className="w-full text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-100/60 flex items-center justify-center gap-1.5 mt-2 bg-white shadow-sm"
                              >
                                {isSendingTestReport ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Compiling & Sending Email...
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                                    Send Test Report Now
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Recipient Emails Management */}
                          <div className="space-y-2">
                            <Label className="font-semibold text-gray-700 text-xs flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-emerald-600" />
                              Recipient Email Addresses (Multiple Allowed)
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                type="email"
                                value={dailyReportEmailInput}
                                onChange={(e) => setDailyReportEmailInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const trimmed = dailyReportEmailInput.trim().toLowerCase();
                                    if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                                      if (!dailyReportEmails.includes(trimmed)) {
                                        setDailyReportEmails([...dailyReportEmails, trimmed]);
                                        setDailyReportEmailInput("");
                                      } else {
                                        toast({ title: "Email already added", description: "This email address is already in the recipient list." });
                                      }
                                    } else if (trimmed) {
                                      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
                                    }
                                  }
                                }}
                                placeholder="e.g. storemanager@domain.com or orders@company.com"
                                className="text-xs bg-white flex-1"
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  const trimmed = dailyReportEmailInput.trim().toLowerCase();
                                  if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                                    if (!dailyReportEmails.includes(trimmed)) {
                                      setDailyReportEmails([...dailyReportEmails, trimmed]);
                                      setDailyReportEmailInput("");
                                    } else {
                                      toast({ title: "Email already added", description: "This email address is already in the recipient list." });
                                    }
                                  } else if (trimmed) {
                                    toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
                                  }
                                }}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Add Email
                              </Button>
                            </div>

                            {/* Recipients list chips */}
                            <div className="pt-1">
                              {dailyReportEmails.length === 0 ? (
                                <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 p-2 rounded-md">
                                  ⚠️ No recipient email addresses added. Please enter email addresses above to receive scheduled daily orders reports.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {dailyReportEmails.map((email, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 text-xs px-2.5 py-1 rounded-full transition-colors"
                                    >
                                      <Mail className="w-3 h-3 text-emerald-600" />
                                      <span className="font-mono text-[11px]">{email}</span>
                                      <button
                                        type="button"
                                        onClick={() => setDailyReportEmails(dailyReportEmails.filter((_, i) => i !== idx))}
                                        className="text-gray-400 hover:text-red-600 ml-1 rounded-full p-0.5"
                                      >
                                        <Trash className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Daily Orders Summary WhatsApp Forwarding Card */}
                    <div className="space-y-4 border p-4 rounded-lg bg-white shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-50 text-green-600 border border-green-100">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                              {t("ecommerce.dailyReportWa.title")}
                              <span className="text-[10px] font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                WhatsApp
                              </span>
                            </h3>
                            <p className="text-xs text-gray-500">
                              {t("ecommerce.dailyReportWa.subtitle")}
                            </p>
                          </div>
                        </div>
                        <Switch checked={dailyReportWaEnabled} onCheckedChange={setDailyReportWaEnabled} />
                      </div>

                      {dailyReportWaEnabled && (
                        <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in-50 duration-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Channel Selector */}
                            <div className="space-y-2 p-3.5 rounded-lg border border-gray-100 bg-gray-50/50">
                              <Label className="font-semibold text-gray-700 text-xs flex items-center gap-1.5">
                                <PhoneCall className="w-3.5 h-3.5 text-green-600" />
                                {t("ecommerce.dailyReportWa.selectChannel")}
                              </Label>
                              <Select
                                value={dailyReportWaChannelId || channelId || ""}
                                onValueChange={setDailyReportWaChannelId}
                              >
                                <SelectTrigger className="text-xs bg-white">
                                  <SelectValue placeholder={t("ecommerce.dailyReportWa.selectChannelPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {allChannels.map((c: any) => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs">
                                      {c.name || c.phoneNumber || c.id} ({c.connectionMethod === "qr_code" ? "QR Channel" : "Cloud API"})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-[11px] text-gray-500">
                                {t("ecommerce.dailyReportWa.selectChannelHelp")}
                              </p>
                            </div>

                            {/* Test Send Trigger */}
                            <div className="space-y-2 p-3.5 rounded-lg border border-green-100 bg-green-50/30 flex flex-col justify-between">
                              <div>
                                <Label className="font-semibold text-gray-700 text-xs flex items-center gap-1.5">
                                  <Send className="w-3.5 h-3.5 text-green-600" />
                                  {t("ecommerce.dailyReportWa.sendTestWa")}
                                </Label>
                                <p className="text-[11px] text-gray-500 mt-1">
                                  Send today's orders summary directly to configured WhatsApp numbers now for verification.
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSendTestWaReportNow}
                                disabled={isSendingTestWaReport || dailyReportWaNumbers.length === 0}
                                className="w-full text-xs font-semibold text-green-700 border-green-300 hover:bg-green-100/60 flex items-center justify-center gap-1.5 mt-2 bg-white shadow-sm"
                              >
                                {isSendingTestWaReport ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    {t("ecommerce.dailyReportWa.sendingTestWa")}
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5 text-green-600" />
                                    {t("ecommerce.dailyReportWa.sendTestWa")}
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Recipient WhatsApp Phone Numbers */}
                          <div className="space-y-2">
                            <Label className="font-semibold text-gray-700 text-xs flex items-center gap-1.5">
                              <PhoneCall className="w-3.5 h-3.5 text-green-600" />
                              {t("ecommerce.dailyReportWa.recipientNumbers")}
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                type="tel"
                                value={dailyReportWaNumberInput}
                                onChange={(e) => setDailyReportWaNumberInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const trimmed = dailyReportWaNumberInput.trim().replace(/[^0-9+]/g, "");
                                    if (trimmed && trimmed.length >= 7) {
                                      if (!dailyReportWaNumbers.includes(trimmed)) {
                                        setDailyReportWaNumbers([...dailyReportWaNumbers, trimmed]);
                                        setDailyReportWaNumberInput("");
                                      } else {
                                        toast({ title: "Number already added", description: "This phone number is already in the recipient list." });
                                      }
                                    } else if (trimmed) {
                                      toast({ title: "Invalid Phone Number", description: "Please enter a valid phone number with country code.", variant: "destructive" });
                                    }
                                  }
                                }}
                                placeholder={t("ecommerce.dailyReportWa.recipientPlaceholder")}
                                className="text-xs bg-white flex-1"
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  const trimmed = dailyReportWaNumberInput.trim().replace(/[^0-9+]/g, "");
                                  if (trimmed && trimmed.length >= 7) {
                                    if (!dailyReportWaNumbers.includes(trimmed)) {
                                      setDailyReportWaNumbers([...dailyReportWaNumbers, trimmed]);
                                      setDailyReportWaNumberInput("");
                                    } else {
                                      toast({ title: "Number already added", description: "This phone number is already in the recipient list." });
                                    }
                                  } else if (trimmed) {
                                    toast({ title: "Invalid Phone Number", description: "Please enter a valid phone number with country code.", variant: "destructive" });
                                  }
                                }}
                                className="text-xs bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                {t("ecommerce.dailyReportWa.addNumber")}
                              </Button>
                            </div>

                            {/* Numbers Chips */}
                            <div className="pt-1">
                              {dailyReportWaNumbers.length === 0 ? (
                                <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 p-2 rounded-md">
                                  ⚠️ {t("ecommerce.dailyReportWa.noNumbers")}
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {dailyReportWaNumbers.map((phone, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 text-xs px-2.5 py-1 rounded-full transition-colors"
                                    >
                                      <PhoneCall className="w-3 h-3 text-green-600" />
                                      <span className="font-mono text-[11px]">{phone}</span>
                                      <button
                                        type="button"
                                        onClick={() => setDailyReportWaNumbers(dailyReportWaNumbers.filter((_, i) => i !== idx))}
                                        className="text-gray-400 hover:text-red-600 ml-1 rounded-full p-0.5"
                                      >
                                        <Trash className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saveConfigMutation.isPending}>
                        {saveConfigMutation.isPending ? "Saving..." : "Save Reports Settings"}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Sub-Tab 5: AI & Team Routing */}
                  <TabsContent value="ai_team" className="space-y-6 mt-0">
                    {/* AI Chatbot Configuration */}
                    <div className="space-y-4 border p-4 rounded-lg bg-purple-50/20">
                      <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        Product AI Assistant Settings
                      </h3>
                      <p className="text-xs text-gray-500">
                        Train an AI assistant to chat with shoppers regarding product details, price, descriptions, and answer FAQs using your sites' training database.
                      </p>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="font-semibold text-gray-700">Enable Product Q&A AI Chatbot</Label>
                            <span className="text-[11px] text-gray-500 block leading-tight">
                              Allow AI chatbot to discuss products with customers when triggered.
                            </span>
                          </div>
                          <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                        </div>

                        {aiEnabled && (
                          <>
                            {/* API Key Provider Switcher */}
                            <div className="bg-white p-4 rounded-xl border border-purple-200/80 shadow-sm space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <Label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                    <Key className="w-4 h-4 text-purple-600" />
                                    API Key & Billing Mode
                                  </Label>
                                  <span className="text-xs text-gray-500 block">
                                    Choose whether to use your own API keys or use Platform keys with pay-as-you-go wallet billing.
                                  </span>
                                </div>
                                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                                  apiKeySource === "admin_key" 
                                    ? "bg-purple-100 text-purple-800 border-purple-300" 
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}>
                                  {apiKeySource === "admin_key" ? "Platform Admin Keys" : "Own API Keys (Free)"}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div
                                  onClick={() => setApiKeySource("own_key")}
                                  className={`cursor-pointer rounded-lg p-3 border transition-all ${
                                    apiKeySource === "own_key"
                                      ? "border-purple-600 bg-purple-50/60 ring-2 ring-purple-600/20 shadow-sm"
                                      : "border-gray-200 hover:border-gray-300 bg-white"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="apiKeySource"
                                      checked={apiKeySource === "own_key"}
                                      onChange={() => setApiKeySource("own_key")}
                                      className="text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="font-semibold text-xs text-gray-900">Use My Own API Keys</span>
                                  </div>
                                  <p className="text-[11px] text-gray-500 mt-1.5 pl-5 leading-relaxed">
                                    Uses OpenAI, Sarvam & Groq keys configured in your AI Settings. <strong>Zero wallet charges</strong>.
                                  </p>
                                </div>

                                <div
                                  onClick={() => setApiKeySource("admin_key")}
                                  className={`cursor-pointer rounded-lg p-3 border transition-all ${
                                    apiKeySource === "admin_key"
                                      ? "border-purple-600 bg-purple-50/60 ring-2 ring-purple-600/20 shadow-sm"
                                      : "border-gray-200 hover:border-gray-300 bg-white"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="apiKeySource"
                                      checked={apiKeySource === "admin_key"}
                                      onChange={() => setApiKeySource("admin_key")}
                                      className="text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="font-semibold text-xs text-gray-900">Use Platform Admin Keys</span>
                                  </div>
                                  <p className="text-[11px] text-gray-500 mt-1.5 pl-5 leading-relaxed">
                                    Zero API key setup needed. Pay-as-you-go based on AI token and voice usage directly from your wallet balance.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-purple-100">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="font-semibold text-gray-700 flex items-center gap-1.5">
                                  <Bot className="w-4 h-4 text-purple-600" />
                                  AI Store Takeover (All Inbox Messages)
                                </Label>
                                <span className="text-[11px] text-gray-500 block leading-tight">
                                  Automatically handle every incoming customer message and voice note with AI — not just after clicking trigger words or buttons. The AI agent will have full awareness of all products, prices, descriptions, and store information.
                                </span>
                              </div>
                              <Switch checked={aiTakeoverEnabled} onCheckedChange={setAiTakeoverEnabled} />
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="font-semibold text-gray-700">Offer "Talk to Agent" buttons / choices</Label>
                                <span className="text-[11px] text-gray-500 block leading-tight">
                                  Show a button / menu prompt next to products so users can opt to chat.
                                </span>
                              </div>
                              <Switch checked={aiAskButtonEnabled} onCheckedChange={setAiAskButtonEnabled} />
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="font-semibold text-gray-700 flex items-center gap-1.5">
                                  <Mic className="w-4 h-4 text-purple-600" />
                                  Respond with Audio / Voice Notes
                                </Label>
                                <span className="text-[11px] text-gray-500 block leading-tight">
                                  Reply to incoming customer voice notes with synthesized speech (or in native text if turned off).
                                </span>
                              </div>
                              <Switch checked={aiVoiceEnabled} onCheckedChange={setAiVoiceEnabled} />
                            </div>

                            {aiVoiceEnabled && (
                              <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border p-3 rounded-lg bg-purple-50/50 mt-1">
                                <div className="space-y-1.5">
                                  <Label className="font-semibold text-gray-700 text-xs">Active Voice Profile</Label>
                                  <Select value={configVoiceProfileId || "default"} onValueChange={(val) => setConfigVoiceProfileId(val === "default" ? "" : val)}>
                                    <SelectTrigger className="h-9 text-xs bg-white">
                                      <SelectValue placeholder="Select Voice Profile (Sarvam, OpenAI, Groq...)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="default">Default / First Available</SelectItem>
                                      {voiceProfiles.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.name} ({p.provider.toUpperCase()} - {p.voiceId} - {p.languageCode})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <span className="text-[10px] text-gray-500 block leading-tight">
                                    Select the AI Voice Profile (Sarvam Rahul, OpenAI Alloy, etc.) for this store.
                                  </span>
                                </div>

                                <div className="space-y-1.5">
                                  <Label className="font-semibold text-gray-700 text-xs">Voice Language Mode</Label>
                                  <Select value={configAiVoiceLanguageMode} onValueChange={setConfigAiVoiceLanguageMode}>
                                    <SelectTrigger className="h-9 text-xs bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="profile">Use Voice Profile Language (e.g. Malayalam)</SelectItem>
                                      <SelectItem value="auto">Auto-Detect Customer Language (Multi-lingual)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <span className="text-[10px] text-gray-500 block leading-tight">
                                    Whether AI responds in profile language or dynamically matches customer language.
                                  </span>
                                </div>
                              </div>
                            )}

                            <div className="space-y-1.5">
                              <Label htmlFor="aiTimeout" className="font-semibold text-gray-700">AI Session Timeout (Minutes)</Label>
                              <Input
                                id="aiTimeout"
                                type="number"
                                value={aiTimeoutMinutes}
                                onChange={(e) => setAiTimeoutMinutes(parseInt(e.target.value) || 30)}
                                placeholder="30"
                                min={1}
                                className="w-full h-9 text-xs"
                              />
                              <span className="text-[10px] text-gray-400 block leading-tight">
                                Automatically close AI chat and revert back to store catalog after inactivity.
                              </span>
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-1.5 pt-2 border-t border-purple-50">
                              <Label htmlFor="aiSystemPrompt" className="font-semibold text-gray-700">Custom AI System Prompt</Label>
                              <Textarea
                                id="aiSystemPrompt"
                                value={aiSystemPrompt}
                                onChange={(e) => setAiSystemPrompt(e.target.value)}
                                placeholder={`You are a helpful customer sales AI assistant for this store.
You are chatting with a customer regarding this product:
- Name: {product_name}
- Price: {product_price}
- Description: {product_description}`}
                                className="w-full min-h-[120px] text-xs font-mono"
                              />
                              <span className="text-[10px] text-gray-400 block leading-tight">
                                Configure custom rules/directives for the AI. Use placeholders like <strong>{"{product_name}"}</strong>, <strong>{"{product_price}"}</strong>, and <strong>{"{product_description}"}</strong> to inject product variables dynamically.
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                      </div>
                    </div>

                    {/* Team Auto-Assignment Settings */}
                    <div className="border p-4 rounded-lg space-y-4 bg-white shadow-xs">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-sm">Team Auto-Assignment & Conversation Routing</h3>
                            <p className="text-xs text-gray-500">
                              Automatically assign incoming store shoppers and conversations to team members so chats appear directly under their inbox login.
                            </p>
                          </div>
                        </div>
                        <Switch checked={autoAssignEnabled} onCheckedChange={setAutoAssignEnabled} />
                      </div>

                      {autoAssignEnabled && (
                        <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
                          {/* Mode Selector */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div
                              onClick={() => setAutoAssignMode("permanent")}
                              className={`cursor-pointer rounded-lg p-3.5 border transition-all ${
                                autoAssignMode === "permanent"
                                  ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20 shadow-sm"
                                  : "border-gray-200 hover:border-gray-300 bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="autoAssignMode"
                                  checked={autoAssignMode === "permanent"}
                                  onChange={() => setAutoAssignMode("permanent")}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                                  Permanent Team Member
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-1.5 pl-5 leading-relaxed">
                                Assign all incoming store chats strictly to one dedicated team member.
                              </p>
                            </div>

                            <div
                              onClick={() => setAutoAssignMode("round_robin")}
                              className={`cursor-pointer rounded-lg p-3.5 border transition-all ${
                                autoAssignMode === "round_robin"
                                  ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20 shadow-sm"
                                  : "border-gray-200 hover:border-gray-300 bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="autoAssignMode"
                                  checked={autoAssignMode === "round_robin"}
                                  onChange={() => setAutoAssignMode("round_robin")}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                                  <Shuffle className="w-3.5 h-3.5 text-blue-600" />
                                  Round Robin (Multi-Agent Distribution)
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-1.5 pl-5 leading-relaxed">
                                Evenly distribute incoming chats among available team members based on least recent activity.
                              </p>
                            </div>
                          </div>

                          {/* Mode Specific Settings */}
                          {autoAssignMode === "permanent" && (
                            <div className="p-3.5 rounded-lg border border-blue-100 bg-blue-50/30 space-y-2">
                              <Label className="font-semibold text-gray-700 text-xs flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                                Select Permanent Assignee
                              </Label>
                              {(() => {
                                const validMembers = Array.isArray(teamMembers) ? teamMembers.filter((m: any) => m && m.id) : [];
                                return (
                                  <Select 
                                    value={autoAssignUserId ? String(autoAssignUserId) : undefined} 
                                    onValueChange={(val) => setAutoAssignUserId(val || "")}
                                  >
                                    <SelectTrigger className="h-9 text-xs bg-white">
                                      <SelectValue placeholder="Select team member to assign all chats..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {validMembers.length === 0 ? (
                                        <SelectItem value="__none__" disabled>No team members available. Create members under Team settings.</SelectItem>
                                      ) : (
                                        validMembers.map((m: any) => (
                                          <SelectItem key={String(m.id)} value={String(m.id)}>
                                            {m.firstName ? `${m.firstName} ${m.lastName || ""}`.trim() : m.username || m.email || String(m.id)} ({m.email || m.username || "Member"})
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                );
                              })()}
                              <span className="text-[10px] text-gray-500 block">
                                All customer interactions in the store flow will be assigned to this user immediately.
                              </span>
                            </div>
                          )}

                          {autoAssignMode === "round_robin" && (
                            <div className="p-3.5 rounded-lg border border-blue-100 bg-blue-50/30 space-y-3">
                              <div>
                                <Label className="font-semibold text-gray-700 text-xs flex items-center gap-1.5">
                                  <Shuffle className="w-3.5 h-3.5 text-blue-600" />
                                  Round Robin Pool & Exclusions
                                </Label>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  Select any team members to <strong>exclude</strong> from the round-robin distribution pool (e.g. managers or offline members):
                                </p>
                              </div>

                              {(() => {
                                const validMembers = Array.isArray(teamMembers) ? teamMembers.filter((m: any) => m && m.id) : [];
                                if (validMembers.length === 0) {
                                  return (
                                    <div className="text-xs text-gray-400 italic bg-white p-3 rounded border text-center">
                                      No team members found. Round robin will fallback to account owner.
                                    </div>
                                  );
                                }

                                const currentExcluded = Array.isArray(autoAssignExcludedUserIds) ? autoAssignExcludedUserIds.map(String) : [];

                                return (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                                    {validMembers.map((m: any) => {
                                      const memberId = String(m.id);
                                      const isExcluded = currentExcluded.includes(memberId);
                                      const displayName = m.firstName ? `${m.firstName} ${m.lastName || ""}`.trim() : m.username || m.email || `Member ${memberId}`;
                                      const displayEmail = m.email || m.username || "";

                                      return (
                                        <button
                                          key={memberId}
                                          type="button"
                                          onClick={() => {
                                            if (isExcluded) {
                                              setAutoAssignExcludedUserIds(currentExcluded.filter((id) => String(id) !== memberId));
                                            } else {
                                              setAutoAssignExcludedUserIds([...currentExcluded, memberId]);
                                            }
                                          }}
                                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs text-left cursor-pointer select-none transition-all ${
                                            isExcluded
                                              ? "bg-red-50 border-red-200 text-red-700 ring-1 ring-red-300 shadow-xs"
                                              : "bg-white border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50/50"
                                          }`}
                                        >
                                          <div className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] font-bold shrink-0 ${
                                            isExcluded ? "bg-red-600 border-red-600 text-white" : "border-gray-300 bg-white text-transparent"
                                          }`}>
                                            ✓
                                          </div>
                                          <div className="flex-1 min-w-0 truncate">
                                            <div className="font-semibold truncate text-gray-900">{displayName}</div>
                                            {displayEmail && <div className="text-[10px] text-gray-400 truncate font-mono">{displayEmail}</div>}
                                          </div>
                                          {isExcluded ? (
                                            <span className="text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-1.5 py-0.5 rounded shrink-0">
                                              Excluded
                                            </span>
                                          ) : (
                                            <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                                              Active
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saveConfigMutation.isPending}>
                        {saveConfigMutation.isPending ? "Saving..." : "Save AI & Team Routing"}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. AI USAGE & WALLET BILLING LEDGER TAB */}
        <TabsContent value="ai_usage">
          <div className="space-y-6">
            {/* Header & Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-50 via-white to-indigo-50 p-4 rounded-xl border border-purple-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-indigo-600" />
                  AI Usage & Wallet Billing Ledger
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Real-time usage breakdown of LLM tokens, STT audio minutes, and TTS voice characters billed to your platform wallet.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchAiUsage()}
                  disabled={isFetchingAiUsage}
                  className="flex items-center gap-1.5 bg-white shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingAiUsage ? "animate-spin" : ""}`} />
                  Refresh Ledger
                </Button>
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Total AI Messages */}
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardContent className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">AI Messages</span>
                    <Bot className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {aiUsageReport?.summary?.totalMessages?.toLocaleString() || 0}
                  </div>
                  <span className="text-[10px] text-gray-400 block">Total Q&A replies</span>
                </CardContent>
              </Card>

              {/* Distinct Chats */}
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardContent className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Active Chats</span>
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {aiUsageReport?.summary?.totalChats?.toLocaleString() || 0}
                  </div>
                  <span className="text-[10px] text-gray-400 block">Unique customer chats</span>
                </CardContent>
              </Card>

              {/* LLM Tokens */}
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardContent className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">LLM Tokens</span>
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {aiUsageReport?.summary?.totalLlmTokens?.toLocaleString() || 0}
                  </div>
                  <span className="text-[10px] text-gray-400 block">Prompt & completion</span>
                </CardContent>
              </Card>

              {/* Voice Minutes (STT) */}
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardContent className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Voice STT</span>
                    <Mic className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {aiUsageReport?.summary?.totalSttMinutes || 0} <span className="text-xs font-normal text-gray-500">min</span>
                  </div>
                  <span className="text-[10px] text-gray-400 block">Audio transcribed</span>
                </CardContent>
              </Card>

              {/* Voice Characters (TTS) */}
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardContent className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Voice TTS</span>
                    <Volume2 className="w-4 h-4 text-pink-600" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {aiUsageReport?.summary?.totalTtsChars?.toLocaleString() || 0} <span className="text-xs font-normal text-gray-500">ch</span>
                  </div>
                  <span className="text-[10px] text-gray-400 block">Characters spoken</span>
                </CardContent>
              </Card>

              {/* Wallet Billed Amount */}
              <Card className="border-indigo-200 shadow-sm bg-indigo-50/40">
                <CardContent className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-indigo-700">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Wallet Billed</span>
                    <Coins className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xl font-bold text-indigo-950">
                    {aiUsageReport?.summary?.currency || "INR"} {aiUsageReport?.summary?.totalBilledAmount?.toFixed(2) || "0.00"}
                  </div>
                  <span className="text-[10px] text-indigo-600 font-medium block">
                    Bal: {aiUsageReport?.summary?.currency || "INR"} {aiUsageReport?.summary?.walletBalance?.toFixed(2) || "0.00"}
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Daily Usage Breakdown Table */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Daily Usage & Billing Breakdown
                </CardTitle>
                <CardDescription className="text-xs">
                  Detailed day-by-day record of customer chats, messages processed, token consumption, audio processing, and billed amounts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAiUsageLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-500 text-sm">
                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                    <span>Loading usage ledger...</span>
                  </div>
                ) : !aiUsageReport?.dailyBreakdown || aiUsageReport.dailyBreakdown.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    <Bot className="w-10 h-10 mx-auto mb-2 text-gray-300 stroke-[1.5]" />
                    No AI usage logs recorded in the last 30 days. When customers interact with your Product AI Assistant, daily logs and wallet deductions will show here.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/70">
                          <TableHead className="text-xs font-bold text-gray-700">Date</TableHead>
                          <TableHead className="text-xs font-bold text-gray-700 text-center">AI Messages</TableHead>
                          <TableHead className="text-xs font-bold text-gray-700 text-center">Chats / Conversations</TableHead>
                          <TableHead className="text-xs font-bold text-gray-700 text-right">LLM Tokens</TableHead>
                          <TableHead className="text-xs font-bold text-gray-700 text-right">Voice Note STT</TableHead>
                          <TableHead className="text-xs font-bold text-gray-700 text-right">Voice Note TTS</TableHead>
                          <TableHead className="text-xs font-bold text-gray-700 text-right">Billed Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aiUsageReport.dailyBreakdown.map((row: any, idx: number) => (
                          <TableRow key={idx} className="hover:bg-gray-50/80 transition-colors">
                            <TableCell className="font-semibold text-xs text-gray-900">
                              {row.date}
                            </TableCell>
                            <TableCell className="text-xs text-center text-gray-700">
                              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-100">
                                {row.totalMessages}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-center text-gray-700">
                              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                                {row.totalChats}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono text-gray-700">
                              {row.llmTokens.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono text-gray-700">
                              {row.sttMinutes} min
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono text-gray-700">
                              {row.ttsChars.toLocaleString()} chars
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-indigo-700">
                              {row.currency || "INR"} {row.billedAmount.toFixed(4)}
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
        </TabsContent>
      </Tabs>

      {/* Media Gallery Picker */}
      <MediaGalleryDialog
        open={isGalleryOpen}
        onOpenChange={setIsGalleryOpen}
        onSelect={(url) => {
          if (galleryTarget === "welcome_header") {
            setWelcomeHeaderUrl(url);
          } else if (galleryTarget === "qr_code") {
            setQrCodeUrl(url);
          } else if (galleryTarget === "product") {
            const trimmed = prodPhotos.trim();
            if (trimmed) {
              setProdPhotos(trimmed + ", " + url);
            } else {
              setProdPhotos(url);
            }
          } else if (galleryTarget.startsWith("welcome_seq_")) {
            const idx = parseInt(galleryTarget.replace("welcome_seq_", ""));
            if (!isNaN(idx) && idx >= 0 && idx < welcomeMessages.length) {
              const updated = [...welcomeMessages];
              updated[idx].mediaUrl = url;
              setWelcomeMessages(updated);
            }
          }
          setIsGalleryOpen(false);
        }}
        allowedTypes={["image"]}
      />

      {/* Edit Order Dialog */}
      <Dialog open={editingOrder !== null} onOpenChange={(open) => { if (!open) setEditingOrder(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order Details</DialogTitle>
            <DialogDescription>Modify customer data, total value, and status for order {editingOrder?.orderNumber}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="editOrderName">Customer Name</Label>
              <Input
                id="editOrderName"
                value={editOrderName}
                onChange={(e) => setEditOrderName(e.target.value)}
                placeholder="Customer Name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="editOrderPhone">Customer Phone</Label>
              <Input
                id="editOrderPhone"
                value={editOrderPhone}
                onChange={(e) => setEditOrderPhone(e.target.value)}
                placeholder="Phone (e.g. 919633348491)"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="editOrderAmount">Total Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-gray-500 font-semibold">{storeCurrency}</span>
                <Input
                  id="editOrderAmount"
                  type="number"
                  step="0.01"
                  value={editOrderAmount}
                  onChange={(e) => setEditOrderAmount(e.target.value)}
                  placeholder="Total Amount"
                  className="pl-12 text-xs h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="editOrderPrice">Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-gray-500 font-semibold">{storeCurrency}</span>
                  <Input
                    id="editOrderPrice"
                    type="number"
                    step="0.01"
                    value={editOrderPrice}
                    onChange={(e) => {
                      const newPrice = e.target.value;
                      setEditOrderPrice(newPrice);
                      const qtyVal = parseFloat(editOrderQty) || 1;
                      const priceVal = parseFloat(newPrice) || 0;
                      setEditOrderAmount(String((qtyVal * priceVal).toFixed(2)));
                    }}
                    placeholder="Price"
                    className="pl-12 text-xs h-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="editOrderQty">Quantity</Label>
                <Input
                  id="editOrderQty"
                  type="number"
                  value={editOrderQty}
                  onChange={(e) => {
                    const newQty = e.target.value;
                    setEditOrderQty(newQty);
                    const qtyVal = parseInt(newQty) || 1;
                    const priceVal = parseFloat(editOrderPrice) || 0;
                    setEditOrderAmount(String((qtyVal * priceVal).toFixed(2)));
                  }}
                  placeholder="Qty"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="editOrderAddress">Shipping Address</Label>
              <Textarea
                id="editOrderAddress"
                value={editOrderAddress}
                onChange={(e) => setEditOrderAddress(e.target.value)}
                placeholder="Shipping Address"
                className="min-h-[60px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="editOrderPin">PIN / Zip Code</Label>
              <Input
                id="editOrderPin"
                value={editOrderPin}
                onChange={(e) => setEditOrderPin(e.target.value)}
                placeholder="PIN / Zip Code"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="editOrderPaymentMethod">Payment Method</Label>
                <select
                  id="editOrderPaymentMethod"
                  value={editOrderPaymentMethod}
                  onChange={(e) => setEditOrderPaymentMethod(e.target.value)}
                  className="w-full h-9 text-xs border rounded p-1"
                >
                  <option value="cod">Cash on Delivery (COD)</option>
                  <option value="upi_direct">UPI Direct</option>
                  <option value="qr_pay">QR Pay</option>
                  <option value="gateway">Online Gateway</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="editOrderPaymentStatus">Payment Status</Label>
                <select
                  id="editOrderPaymentStatus"
                  value={editOrderPaymentStatus}
                  onChange={(e) => setEditOrderPaymentStatus(e.target.value)}
                  className="w-full h-9 text-xs border rounded p-1"
                >
                  <option value="pending">Pending</option>
                  <option value="pending_verification">Verification Req</option>
                  <option value="pending_payment">Link Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="editOrderStatus">Delivery / Order Status</Label>
              <select
                id="editOrderStatus"
                value={editOrderStatus}
                onChange={(e) => setEditOrderStatus(e.target.value)}
                className="w-full h-9 text-xs border rounded p-1 font-semibold text-emerald-800 bg-emerald-50"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOrder(null)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={editOrderMutation.isPending}
              onClick={() => {
                editOrderMutation.mutate({
                  id: editingOrder.id,
                  payload: {
                    customerName: editOrderName,
                    customerPhone: editOrderPhone,
                    totalAmount: editOrderAmount,
                    quantity: parseInt(editOrderQty) || 1,
                    price: editOrderPrice,
                    address: editOrderAddress,
                    pin: editOrderPin,
                    paymentMethod: editOrderPaymentMethod,
                    paymentStatus: editOrderPaymentStatus,
                    status: editOrderStatus
                  }
                });
              }}
            >
              {editOrderMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
