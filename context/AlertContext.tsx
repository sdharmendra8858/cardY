import UnifiedModal, { UnifiedModalButton } from "@/components/UnifiedModal";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type AlertButtonStyle = "default" | "cancel" | "destructive";

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
};

export type ShowAlertOptions = {
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  cancelable?: boolean;
  type?: "default" | "error" | "warning" | "success";
};

type AlertContextValue = {
  showAlert: (options: ShowAlertOptions) => Promise<AlertButton | undefined>;
};

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

type PendingAlert = ShowAlertOptions & {
  resolve: (button?: AlertButton) => void;
};

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingAlert | undefined>(undefined);

  const showAlert = useCallback((options: ShowAlertOptions) => {
    return new Promise<AlertButton | undefined>((resolve) => {
      setPending({ cancelable: true, ...options, resolve });
    });
  }, []);

  const onClose = useCallback(
    (button?: AlertButton) => {
      if (!pending) return;
      const toResolve = pending.resolve;
      setPending(undefined);
      // resolve after state cleared to avoid UI flicker invoking new alert synchronously
      requestAnimationFrame(() => toResolve(button));
    },
    [pending]
  );

  const value = useMemo(() => ({ showAlert }), [showAlert]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AlertDialog
        visible={!!pending}
        title={pending?.title}
        message={pending?.message}
        buttons={pending?.buttons}
        cancelable={pending?.cancelable}
        type={pending?.type}
        onSelect={onClose}
        onRequestClose={() => {
          if (pending?.cancelable) onClose(undefined);
        }}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used within an AlertProvider");
  return ctx;
}

function AlertDialog({
  visible,
  title,
  message,
  buttons,
  cancelable,
  type,
  onSelect,
  onRequestClose,
}: {
  visible: boolean;
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  cancelable?: boolean;
  type?: "default" | "error" | "warning" | "success";
  onSelect: (button?: AlertButton) => void;
  onRequestClose: () => void;
}) {
  const normalizedButtons: UnifiedModalButton[] = useMemo(() => {
    if (buttons && buttons.length > 0) {
      return buttons.slice(0, 2).map((btn) => ({
        text: btn.text,
        onPress: () => {
          try {
            btn.onPress?.();
          } finally {
            onSelect(btn);
          }
        },
        style: btn.style,
      }));
    }
    // Always provide a default OK button if no buttons are provided
    return [{ text: "OK", onPress: () => onSelect(undefined), style: "default" }];
  }, [buttons, onSelect]);

  return (
    <UnifiedModal
      visible={visible}
      title={title || "Alert"}
      message={message || ""}
      buttons={normalizedButtons}
      dismissible={cancelable !== false}
      type={type}
      onRequestClose={onRequestClose}
    />
  );
}
