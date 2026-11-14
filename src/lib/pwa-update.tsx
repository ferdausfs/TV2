// PWA update prompt (feature 12): a small dismissible chip shown when a new
// service worker is waiting. "Reload" activates it and reloads the page once;
// a session flag prevents the chip from re-appearing in a loop after the
// reload if the same worker is still reported.
import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { safeSession } from "./safe-storage.ts";

const DISMISS_KEY = "tv2_sw_update_dismissed";

export function PwaUpdateChip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (safeSession.getItem(DISMISS_KEY) === "1") return;
    const show = () => setVisible(true);
    window.addEventListener("sw-waiting", show);
    return () => window.removeEventListener("sw-waiting", show);
  }, []);

  if (!visible) return null;

  const reload = () => {
    navigator.serviceWorker?.getRegistration().then((reg) => {
      reg?.waiting?.postMessage("SKIP_WAITING");
    });
    // controllerchange fires after the waiting worker takes over.
    navigator.serviceWorker?.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  };

  return (
    <div
      role="status"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+60px)] left-1/2 z-[80] -translate-x-1/2 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-2xl md:bottom-4"
    >
      <RefreshCw className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs font-medium">New version available</span>
      <button
        type="button"
        onClick={reload}
        className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground"
      >
        Reload
      </button>
      <button
        type="button"
        aria-label="Dismiss update prompt"
        onClick={() => {
          safeSession.setItem(DISMISS_KEY, "1");
          setVisible(false);
        }}
        className="p-0.5 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
