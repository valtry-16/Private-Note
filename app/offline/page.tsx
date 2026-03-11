import { WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <WifiOff className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
          <CardTitle>You&apos;re Offline</CardTitle>
          <CardDescription>
            ZeroVault requires an internet connection to securely sync your data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Previously viewed pages may still be available from cache.
            Your data remains encrypted and safe.
          </p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
