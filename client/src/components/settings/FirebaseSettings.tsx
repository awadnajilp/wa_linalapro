import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Globe,
  Database,
  Lock,
  Mail,
  Key,
  ShieldCheck,
  RefreshCw,
  Save,
  BellRing
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import { apiRequest } from "@/lib/queryClient";

interface FirebaseConfig {
  id?: string;
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
  privateKey?: string;
  clientEmail?: string;
  vapidKey?: string;
}

export default function FirebaseSettings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FirebaseConfig>({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: "",
    privateKey: "",
    clientEmail: "",
    vapidKey: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: firebaseConfigData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<FirebaseConfig | null>({
    queryKey: ["firebase-settings-config"],
    queryFn: async () => {
      const res = await fetch("/api/firebase-settings");
      if (!res.ok) throw new Error("Failed to fetch Firebase settings");
      return res.json();
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (firebaseConfigData) {
      setFormData({
        apiKey: firebaseConfigData.apiKey || "",
        authDomain: firebaseConfigData.authDomain || "",
        projectId: firebaseConfigData.projectId || "",
        storageBucket: firebaseConfigData.storageBucket || "",
        messagingSenderId: firebaseConfigData.messagingSenderId || "",
        appId: firebaseConfigData.appId || "",
        measurementId: firebaseConfigData.measurementId || "",
        privateKey: firebaseConfigData.privateKey || "",
        clientEmail: firebaseConfigData.clientEmail || "",
        vapidKey: firebaseConfigData.vapidKey || "",
      });
    }
  }, [firebaseConfigData]);

  const handleChange = (field: keyof FirebaseConfig, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await apiRequest("POST", "/api/firebase-settings/update", formData);
      const result = await res.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Firebase and FCM settings saved successfully!",
        });
        refetch();
      } else {
        throw new Error(result.message || "Failed to save settings");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to save Firebase configuration.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center justify-center py-10">
          <Loading />
          <p className="text-sm mt-3 text-gray-500">Loading Firebase configuration...</p>
        </CardContent>
      </Card>
    );
  }

  const fcmActive = Boolean(
    firebaseConfigData &&
    firebaseConfigData.projectId &&
    firebaseConfigData.clientEmail &&
    firebaseConfigData.privateKey
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Firebase & FCM Config
            </CardTitle>

            <div className="flex items-center gap-2">
              <Badge
                variant={fcmActive ? "default" : "secondary"}
                className={fcmActive ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-gray-100 text-gray-800"}
              >
                {fcmActive ? "FCM Active" : "FCM Inactive"}
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="text-xs"
                disabled={isFetching}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 mr-1 ${isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          <CardDescription>
            Manage Firebase project credentials and FCM Service Account config for push notifications
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Section 1: Web configuration */}
            <div className="border p-5 rounded-xl bg-gray-50/50 space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-gray-800">
                <Globe className="w-4 h-4 text-blue-500" />
                Firebase Web App Client Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="apiKey" className="text-xs font-semibold text-gray-700">API Key</Label>
                  <Input
                    id="apiKey"
                    value={formData.apiKey}
                    onChange={(e) => handleChange("apiKey", e.target.value)}
                    placeholder="AIzaSy..."
                    className="h-9 text-sm bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="authDomain" className="text-xs font-semibold text-gray-700">Auth Domain</Label>
                  <Input
                    id="authDomain"
                    value={formData.authDomain}
                    onChange={(e) => handleChange("authDomain", e.target.value)}
                    placeholder="project-id.firebaseapp.com"
                    className="h-9 text-sm bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="projectId" className="text-xs font-semibold text-gray-700">Project ID</Label>
                  <Input
                    id="projectId"
                    value={formData.projectId}
                    onChange={(e) => handleChange("projectId", e.target.value)}
                    placeholder="project-id"
                    className="h-9 text-sm bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="storageBucket" className="text-xs font-semibold text-gray-700">Storage Bucket</Label>
                  <Input
                    id="storageBucket"
                    value={formData.storageBucket}
                    onChange={(e) => handleChange("storageBucket", e.target.value)}
                    placeholder="project-id.appspot.com"
                    className="h-9 text-sm bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="messagingSenderId" className="text-xs font-semibold text-gray-700">Messaging Sender ID</Label>
                  <Input
                    id="messagingSenderId"
                    value={formData.messagingSenderId}
                    onChange={(e) => handleChange("messagingSenderId", e.target.value)}
                    placeholder="82910482902"
                    className="h-9 text-sm bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="appId" className="text-xs font-semibold text-gray-700">App ID</Label>
                  <Input
                    id="appId"
                    value={formData.appId}
                    onChange={(e) => handleChange("appId", e.target.value)}
                    placeholder="1:82910482902:web:a2b3c4d5e6f7"
                    className="h-9 text-sm bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="measurementId" className="text-xs font-semibold text-gray-700">Measurement ID</Label>
                  <Input
                    id="measurementId"
                    value={formData.measurementId}
                    onChange={(e) => handleChange("measurementId", e.target.value)}
                    placeholder="G-XXXXXX"
                    className="h-9 text-sm bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="vapidKey" className="text-xs font-semibold text-gray-700">VAPID Key (Web Push Public Key)</Label>
                  <Input
                    id="vapidKey"
                    value={formData.vapidKey}
                    onChange={(e) => handleChange("vapidKey", e.target.value)}
                    placeholder="BEl2..."
                    className="h-9 text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Admin Service Account for FCM notifications */}
            <div className="border p-5 rounded-xl bg-gray-50/50 space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-gray-800">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Firebase Admin FCM Service Account Credentials
              </h3>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="clientEmail" className="text-xs font-semibold text-gray-700">Client Email (Service Account Email)</Label>
                  <Input
                    id="clientEmail"
                    value={formData.clientEmail}
                    onChange={(e) => handleChange("clientEmail", e.target.value)}
                    placeholder="firebase-adminsdk-xxxxx@project-id.iam.gserviceaccount.com"
                    className="h-9 text-sm bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="privateKey" className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                    <span>Private Key</span>
                    {firebaseConfigData?.privateKey && (
                      <span className="text-[10px] text-emerald-600 font-medium">Configured</span>
                    )}
                  </Label>
                  <Textarea
                    id="privateKey"
                    value={formData.privateKey}
                    onChange={(e) => handleChange("privateKey", e.target.value)}
                    placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ..."
                    className="min-h-[120px] text-xs font-mono bg-white"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Firebase Settings
                  </>
                )}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
