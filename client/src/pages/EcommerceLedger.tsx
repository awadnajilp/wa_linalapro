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
import { ShoppingCart, Package, Settings, ClipboardList, Users, Plus, Trash, Edit, RefreshCw, FileText, CheckCircle, ExternalLink, MessageSquare, Sparkles } from "lucide-react";
import { useChannelContext } from "@/contexts/channel-context";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ChannelSwitcher } from "@/components/channel-switcher";
import { MediaGalleryDialog } from "@/components/media/MediaGalleryDialog";

interface Product {
  id: string;
  name: string;
  price: string;
  description: string | null;
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
  const [page, setPage] = useState(1);
  const limit = 10;

  // Product Form states
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPhotos, setProdPhotos] = useState("");
  const [prodCheckoutLink, setProdCheckoutLink] = useState("");
  const [prodTrigger, setProdTrigger] = useState("");
  const [prodTriggerEnabled, setProdTriggerEnabled] = useState(false);
  const [prodCurrency, setProdCurrency] = useState("INR");

  // Gallery Dialog states
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<"product" | "welcome_header" | "qr_code">("product");

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
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiTimeoutMinutes, setAiTimeoutMinutes] = useState(30);
  const [aiAskButtonEnabled, setAiAskButtonEnabled] = useState(true);
  const [welcomeMessages, setWelcomeMessages] = useState<{ id: string; text: string; mediaType: "none" | "image" | "video" | "audio"; mediaUrl: string; sortOrder: number }[]>([]);

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
      setAiEnabled((config as any).aiEnabled !== undefined ? (config as any).aiEnabled : false);
      setAiTimeoutMinutes((config as any).aiTimeoutMinutes !== undefined ? (config as any).aiTimeoutMinutes : 30);
      setAiAskButtonEnabled((config as any).aiAskButtonEnabled !== undefined ? (config as any).aiAskButtonEnabled : true);
      setWelcomeMessages(Array.isArray((config as any).welcomeMessages) ? (config as any).welcomeMessages : []);
      setConfigActive(config.isActive !== undefined ? config.isActive : true);

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
  const { data: products = [], isLoading: isProductsLoading } = useQuery<Product[]>({
    queryKey: ["/api/ecommerce/products"],
    queryFn: async () => {
      const res = await fetch("/api/ecommerce/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  // 3. Fetch Orders
  const { data: ordersData, isLoading: isOrdersLoading } = useQuery<{ orders: Order[]; total: number }>({
    queryKey: ["/api/ecommerce/orders", search, orderStatus, paymentStatus, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        status: orderStatus,
        paymentStatus,
      });
      const res = await fetch(`/api/ecommerce/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  // 4. Fetch Customers
  const { data: customers = [], isLoading: isCustomersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/ecommerce/customers"],
    queryFn: async () => {
      const res = await fetch("/api/ecommerce/customers");
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

  const resetProductForm = () => {
    setEditingProduct(null);
    setProdName("");
    setProdPrice("");
    setProdDesc("");
    setProdPhotos("");
    setProdCheckoutLink("");
    setProdTrigger("");
    setProdTriggerEnabled(false);
    setProdCurrency("INR");
  };

  const handleEditProductClick = (product: any) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdPrice(product.price);
    setProdDesc(product.description || "");
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
    setProdCurrency(product.currency || "INR");
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const photosArray = prodPhotos
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const payload: any = {
      name: prodName,
      price: prodPrice,
      description: prodDesc,
      photos: photosArray,
      checkoutLink: prodCheckoutLink,
      triggerKeyword: prodTrigger,
      isTriggerEnabled: prodTriggerEnabled,
      currency: prodCurrency,
    };

    if (editingProduct) {
      payload.id = editingProduct.id;
    }

    saveProductMutation.mutate(payload);
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
      aiEnabled,
      aiTimeoutMinutes,
      aiAskButtonEnabled,
      welcomeMessages,
      isActive: configActive,
    };

    saveConfigMutation.mutate(payload);
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
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-emerald-600" />
            Ecommerce Module Store Manager
          </h1>
          <p className="text-gray-500 text-sm">
            Configure automated checkout flows, products list, and track customer orders.
          </p>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="e.g. 29.99"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="prodCurrency">Currency *</Label>
                  <select
                    id="prodCurrency"
                    value={prodCurrency}
                    onChange={(e) => setProdCurrency(e.target.value)}
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

              <div className="space-y-1">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Short description..."
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

                {prodPhotos.split(",").map(p => p.trim()).filter(Boolean).length > 0 && (
                  <div className="flex flex-wrap gap-2 border p-2 rounded bg-gray-50 max-h-32 overflow-y-auto mt-1">
                    {prodPhotos.split(",").map(p => p.trim()).filter(Boolean).map((photoUrl, idx) => (
                      <div key={idx} className="relative w-14 h-14 border rounded overflow-hidden group">
                        <img src={photoUrl} className="w-full h-full object-cover" alt="product thumbnail" />
                        <button
                          type="button"
                          className="absolute top-0 right-0 bg-red-600 text-white rounded-full flex items-center justify-center p-0.5 opacity-80 hover:opacity-100 transition-opacity"
                          style={{ width: "16px", height: "16px", fontSize: "10px" }}
                          onClick={() => {
                            const list = prodPhotos.split(",").map(p => p.trim()).filter(Boolean);
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-lg border flex w-fit gap-1 mb-4">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Products ({products.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Orders ({ordersData?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Customers ({customers.length})
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Store Settings
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
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No products added yet. Click "Add Product" to create one.
                </div>
              ) : (
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
                    {products.map((prod) => {
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
                              <img src={firstPhoto} alt={prod.name} className="w-12 h-12 object-cover rounded-lg border" />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 flex items-center justify-center rounded-lg border">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">{prod.name}</TableCell>
                          <TableCell className="text-emerald-600 font-medium">
                            {(prod as any).currency || "INR"} {prod.price}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ORDERS TAB */}
        <TabsContent value="orders">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <div>
                <CardTitle>Orders Ledger</CardTitle>
                <CardDescription>Manage status updates, trace payment receipts, and dispatch notifications.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <Input
                  className="max-w-xs h-9"
                  placeholder="Search order no, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select value={orderStatus} onValueChange={setOrderStatus}>
                  <SelectTrigger className="w-[140px] h-9">
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
                  <SelectTrigger className="w-[140px] h-9">
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
                          <TableCell className="font-medium">${order.totalAmount}</TableCell>
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
                              <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
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
              ) : customers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No checkout customers found.</div>
              ) : (
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
                    {customers.map((cust) => (
                      <TableRow key={cust.phone}>
                        <TableCell className="font-mono">{cust.phone}</TableCell>
                        <TableCell>{cust.name || "Customer"}</TableCell>
                        <TableCell className="font-semibold text-gray-700">{cust.totalOrders}</TableCell>
                        <TableCell className="font-bold text-emerald-600">${parseFloat(cust.totalSpent || "0").toFixed(2)}</TableCell>
                        <TableCell className="text-gray-500 text-sm">{new Date(cust.lastOrderDate).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                            Gallery
                          </Button>
                        </div>
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
                                value={msg.mediaType}
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
                                  value={msg.mediaUrl}
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
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="space-y-1 md:col-span-3">
                              <Label className="text-xs font-semibold">Message Text Body</Label>
                              <Textarea
                                value={msg.text}
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
                        </div>
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
    </div>
  );
}
