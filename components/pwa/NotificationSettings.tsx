"use client";

import { useEffect, useState, useTransition } from "react";
import { setPushMutedAction, sendTestPushAction } from "@/app/(player)/help/push-actions";
import { Button } from "@/components/ui";
import { PUSH_CATEGORIES, PUSH_CATEGORY_LABELS, type PushCategory } from "@/lib/push/categories";
import { currentEndpoint, disablePush, enablePush } from "./push-client";
import { useMounted, usePwa } from "./pwa-store";

export type NotificationSettingsProps = {
  /** Categories this person turned off; empty means everything is received. */
  muted: PushCategory[];
  devices: { endpoint: string; userAgent: string | null; createdAt: Date }[];
  /** ORGANIZER of at least one edition: the third switch is only for them. */
  isOrganizer: boolean;
};

/** One sentence, whatever the browser has to say for itself. */
function Unavailable({ children }: { children: React.ReactNode }) {
  return <p className="meta">{children}</p>;
}

/**
 * « Notifications » in Aide: turn them on for this device, choose what they are
 * about, and check that they arrive.
 *
 * Everything here depends on the browser — permission, service worker, whether
 * *this* device is among the ones already signed up — so nothing is rendered
 * server-side. The switches are per account (they follow you from phone to
 * laptop); the button is per device.
 */
export function NotificationSettings({ muted, devices, isOrganizer }: NotificationSettingsProps) {
  const { pushSupported, permission, platform, standalone } = usePwa();
  const mounted = useMounted();

  /** `null` while the browser is still being asked about its subscription. */
  const [active, setActive] = useState<boolean | null>(null);
  const [off, setOff] = useState<PushCategory[]>(muted);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    void currentEndpoint().then((endpoint) => {
      if (!alive) return;
      // Known to the browser *and* recorded for this account: anything else is
      // an endpoint pointing at somebody else, and « Activer » will remap it.
      setActive(!!endpoint && devices.some((d) => d.endpoint === endpoint));
    });
    return () => {
      alive = false;
    };
  }, [devices]);

  if (!mounted) return null;

  // iOS only exposes the Push API to an app started from the home screen: the
  // answer is not « ton navigateur ne peut pas », it is « installe-la d'abord ».
  if (!pushSupported && platform === "ios" && !standalone) {
    return <Unavailable>Installe d’abord l’app (voir ci-dessus), puis reviens ici pour activer les notifications.</Unavailable>;
  }
  if (!pushSupported) return <Unavailable>Ce navigateur ne prend pas en charge les notifications.</Unavailable>;
  if (permission === "denied") {
    return <Unavailable>Les notifications sont bloquées pour Challenger. Réactive-les dans les réglages de ton téléphone.</Unavailable>;
  }

  function toggle(category: PushCategory, enabled: boolean) {
    const previous = off;
    // Optimistic: a switch that waits for the network feels broken.
    setOff(enabled ? previous.filter((c) => c !== category) : [...previous, category]);
    setError(null);
    startTransition(async () => {
      const result = await setPushMutedAction(category, enabled);
      if (!result.ok) {
        setOff(previous);
        setError(result.error);
      }
    });
  }

  function activate() {
    setError(null);
    setTest(null);
    startTransition(async () => {
      const result = await enablePush();
      if (result === "granted") setActive(true);
      else if (result === "denied") setError("Tu as refusé les notifications. Réactive-les dans les réglages de ton téléphone.");
      else if (result === "unsupported") setError("Ce navigateur ne prend pas en charge les notifications.");
      else setError("L’activation a échoué. Réessaie dans un instant.");
    });
  }

  function deactivate() {
    setError(null);
    setTest(null);
    startTransition(async () => {
      const ok = await disablePush();
      if (ok) setActive(false);
      else setError("La désactivation a échoué. Réessaie dans un instant.");
    });
  }

  function sendTest() {
    setError(null);
    setTest(null);
    startTransition(async () => {
      const result = await sendTestPushAction();
      if (!result.ok) setTest(result.error);
      else if (result.sent === 0) setTest("Aucun appareil n’a reçu le test. Active-les d’abord ci-dessus.");
      else setTest(`Envoyé à ${result.sent} appareil${result.sent > 1 ? "s" : ""}.`);
    });
  }

  const categories = PUSH_CATEGORIES.filter((c) => c !== "ORGANIZER" || isOrganizer);

  return (
    <>
      <p className="meta">{active ? "Activées sur cet appareil." : "Pas encore activées sur cet appareil."}</p>

      {active ? (
        <Button variant="ghost" size="sm" onClick={deactivate} disabled={pending} className="self-start">
          Désactiver sur cet appareil
        </Button>
      ) : (
        <Button size="sm" onClick={activate} disabled={pending} className="self-start">
          Activer sur cet appareil
        </Button>
      )}

      {error && (
        <p className="meta-xs" role="status">
          {error}
        </p>
      )}

      <ul className="switch-list">
        {categories.map((category) => {
          const { label, hint } = PUSH_CATEGORY_LABELS[category];
          const enabled = !off.includes(category);
          return (
            <li key={category} className="switch-row">
              <label className="switch">
                <span className="switch-text">
                  <strong>{label}</strong>
                  <span className="meta-xs">{hint}</span>
                </span>
                <input type="checkbox" role="switch" checked={enabled} onChange={(e) => toggle(category, e.target.checked)} />
                <span aria-hidden className="switch-track" />
              </label>
            </li>
          );
        })}
      </ul>

      <Button variant="ghost" size="sm" onClick={sendTest} disabled={pending} className="self-start">
        Envoyer un test
      </Button>
      {test && (
        <p className="meta-xs" role="status">
          {test}
        </p>
      )}
    </>
  );
}
