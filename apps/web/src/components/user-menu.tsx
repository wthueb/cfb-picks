import { LogOut, Settings } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { api } from "~/utils/api";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Skeleton } from "./ui/skeleton";
import { Switch } from "./ui/switch";

export function UserMenu() {
  const session = useSession();
  const utils = api.useUtils();
  const preferences = api.user.preferences.useQuery(undefined, {
    enabled: session.status === "authenticated",
  });
  const updatePreferences = api.user.updatePreferences.useMutation({
    onSuccess: async () => {
      await utils.user.preferences.invalidate();
    },
  });

  if (session.status === "loading") return <Skeleton className="h-8 w-9 sm:w-28" />;
  if (!session.data) return <Button variant="ghost">Sign in</Button>;

  const userName = session.data.user.name ?? "User";
  const checked = updatePreferences.isPending
    ? updatePreferences.variables.sendNotifications
    : (preferences.data?.sendNotifications ?? false);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Open settings for ${userName}`}>
          <Settings aria-hidden="true" />
          <span className="hidden max-w-36 truncate sm:inline">{userName}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>{userName}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-6 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="locked-pick-emails">Locked-pick emails</Label>
            <p className="text-muted-foreground text-sm">
              Receive an email when new picks get locked in
            </p>
          </div>
          <Switch
            id="locked-pick-emails"
            checked={checked}
            disabled={
              preferences.isLoading ||
              updatePreferences.isPending ||
              !preferences.data?.emailNotificationsAvailable
            }
            onCheckedChange={(sendNotifications) => updatePreferences.mutate({ sendNotifications })}
          />
        </div>
        {preferences.data && !preferences.data.emailNotificationsAvailable && (
          <p className="text-muted-foreground text-sm">
            Email notifications are not configured for this deployment.
          </p>
        )}
        {updatePreferences.isSuccess && (
          <p className="text-sm text-emerald-400" role="status">
            Preference saved.
          </p>
        )}
        {updatePreferences.isError && (
          <p className="text-destructive text-sm" role="alert">
            {updatePreferences.error.message || "Unable to save your preference."}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
