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
import { ShoppingCart, Package, Settings, ClipboardList, Users, Plus, Trash, Edit, RefreshCw, FileText, CheckCircle, ExternalLink, MessageSquare, Sparkles, Download, Truck, Calendar as CalendarIcon, Coins, Key, Bot, Volume2, Mic, Activity, ArrowUpRight } from "lucide-react";
import { useChannelContext } from "@/contexts/channel-context";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { ChannelSwitcher } from "@/components/channel-switcher";
import { MediaGalleryDialog } from "@/components/media/MediaGalleryDialog";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedChannel } = useChannelContext();

  const channelId = selectedChannel?.id;

  // Active Tab
  const [activeTab, setActiveTab] = useState("products");

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
  const [aiVoiceEnabled, setAiVoiceEnabled] = useState(false);
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
  const [labelCod, setLabelCod] = useState("Cash on Delivery (COD)");
  const [labelUpiDirect, setLabelUpiDirect] = useState("UPI Direct Mobile Pay");
  const [labelQrPay, setLabelQrPay] = useState("UPI (Pay via QR Code)");
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

  // Fetch Voice Profiles
  const { data: voiceProfiles = [] } = useQuery<any[]>({
    queryKey: ["/api/voice-profiles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/voice-profiles");
      if (!res.ok) return [];
      return res.json();
    }
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
      setAiVoiceEnabled((config as any).aiVoiceEnabled !== undefined ? (config as any).aiVoiceEnabled : false);
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
      setLabelCod((config as any).labelCod || "Cash on Delivery (COD)");
      setLabelUpiDirect((config as any).labelUpiDirect || "UPI Direct Mobile Pay");
      setLabelQrPay((config as any).labelQrPay || "UPI (Pay via QR Code)");
      setLabelGateway((config as any).labelGateway || "Online Payment");

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
      aiVoiceEnabled,
      voiceProfileId: configVoiceProfileId || null,
      aiVoiceLanguageMode: configAiVoiceLanguageMode,
      aiTimeoutMinutes,
      aiAskButtonEnabled,
      aiSystemPrompt,
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
      isActive: configActive,
    };

    saveConfigMutation.mutate(payload);
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
            Ecommerce Module Store Manager
          </h1>
          <p className="text-gray-500 text-sm">
            Configure automated checkout flows, products list, and track customer orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 hidden sm:inline">Active Channel:</span>
            <ChannelSwitcher />
          </div>

          <Dialog open={isProductModalOpen} onOpenChange={(open) => {
            setIsProductModalOpen(open);
            if (!open) resetProductForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                <DialogDescription>
                  Provide details of the product to make it purchasable on WhatsApp.
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
            Products ({productsData?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Orders ({ordersData?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Customers ({customersData?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Store Settings
          </TabsTrigger>
          <TabsTrigger value="ai_usage" className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-indigo-600" />
            AI Usage & Billing
          </TabsTrigger>
        </TabsList>

        {/* 1. PRODUCTS TAB */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Catalog Products</CardTitle>
              <CardDescription>
                List of products that customers can buy. You can set individual triggers or list them in the store menu.
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

        {/* 4. CONFIG TAB */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Store Configuration</CardTitle>
              <CardDescription>Setup custom welcome keywords, payment gateways, and checkout form details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfigSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Store Identity Profile Section */}
                  <div className="col-span-1 md:col-span-2 space-y-4 border p-4 rounded-lg bg-gray-50/50">
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
                                  toast({ title: "Error", description: err.message || "Failed to upload logo", variant: "destructive" });
                                }
                              };
                              inputEl.click();
                            }}
                          >
                            Upload Logo
                          </Button>
                        </div>
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

                  {/* Delivery Fee Configuration Section */}
                  <div className="col-span-1 md:col-span-2 space-y-4 border p-4 rounded-lg bg-emerald-50/20 border-emerald-100">
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

                  {/* General Config */}
                  <div className="space-y-4 border p-4 rounded-lg">
                    <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-emerald-600" />
                      General Shop Flows
                    </h3>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Label className="font-semibold">Store-wise Catalog Flow</Label>
                        <span className="text-xs text-gray-500">Enable automatic product lists when customer triggers the keyword.</span>
                      </div>
                      <Switch checked={storeFlowActive} onCheckedChange={setStoreFlowActive} />
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

                    <div className="border-t border-emerald-100/50 pt-4 mt-4 space-y-3">
                      <h4 className="font-semibold text-sm text-slate-700">💳 Custom Payment Option Labels</h4>
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

                    <div className="space-y-1">
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
                  <div className="space-y-4 border p-4 rounded-lg bg-emerald-50/20">
                    <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      Welcome Messages Sequence (Multiple Messages)
                    </h3>
                    <p className="text-xs text-gray-500">
                      Define a sequence of messages sent one-by-one to shoppers when they trigger the catalog or individual products. Order them by Sequence Weight.
                    </p>

                    <div className="space-y-3">
                      {welcomeMessages.map((msg, idx) => (
                        <div key={msg.id || idx} className="border p-3 rounded-md bg-white space-y-3 relative shadow-sm">
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs font-bold text-emerald-700">Message #{idx + 1}</span>
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
                        className="w-full border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs"
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
                              <Label className="font-semibold text-gray-700">Offer "Ask AI" buttons / choices</Label>
                              <span className="text-[11px] text-gray-500 block leading-tight">
                                Show a button / menu prompt next to products so users can opt to chat.
                              </span>
                            </div>
                            <Switch checked={aiAskButtonEnabled} onCheckedChange={setAiAskButtonEnabled} />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="font-semibold text-gray-700">Respond with Audio / Voice Notes</Label>
                              <span className="text-[11px] text-gray-500 block leading-tight">
                                Reply to incoming customer voice notes with synthesized speech.
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

                  {/* Checkout & UPI Configuration */}
                  <div className="space-y-4 border p-4 rounded-lg">
                    <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-emerald-600" />
                      Checkout Questions Flow
                    </h3>

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

                    <div className="space-y-4 pt-2 border-t">
                      <Label className="font-bold text-gray-800">UPI Payment Configurations</Label>
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

                      <div className="space-y-1 pt-2">
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
                  </div>
                </div>

                {/* Gateways Config */}
                <div className="border p-4 rounded-lg space-y-4">
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
                    {saveConfigMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
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
