import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Trash2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const AccDeletionPage = () => {
  const { toast } = useToast();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usernameOrEmail: usernameOrEmail.trim(),
          password,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process account deletion request.");
      }

      setIsSuccess(true);
      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently removed.",
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      toast({
        title: "Error",
        description: err.message || "Failed to delete account.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-red-950/20 dark:via-background dark:to-orange-950/10">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Trash2 className="mx-auto h-12 w-12 text-red-500 animate-pulse" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Account Deletion
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            We are sorry to see you go. This action is irreversible.
          </p>
        </div>

        <Card className="border-red-100 dark:border-red-900/50 shadow-xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-xl text-red-600 dark:text-red-400">Permanently Delete Account</CardTitle>
            <CardDescription>
              Please verify your identity to proceed with account deletion. All your channels, conversations, and data will be permanently wiped.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="text-center py-6 space-y-4">
                <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Account Deleted Successfully
                </h3>
                <p className="text-sm text-gray-500">
                  Your session has been cleared and your account is completely removed from our systems.
                </p>
                <Button className="w-full mt-4" onClick={() => (window.location.href = "/")}>
                  Go to Homepage
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="usernameOrEmail">Username or Email Address</Label>
                  <Input
                    id="usernameOrEmail"
                    type="text"
                    required
                    placeholder="Enter your username or email"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for leaving (Optional)</Label>
                  <textarea
                    id="reason"
                    placeholder="Please tell us why you are deleting your account..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full mt-6"
                  disabled={isLoading}
                >
                  {isLoading ? "Deleting..." : "Permanently Delete My Account"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
