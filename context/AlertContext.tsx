import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Modal, StyleSheet, View } from "react-native";

import AppButton from "@/components/AppButton";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

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
      setPending({ ...options, resolve });
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
  onSelect,
  onRequestClose,
}: {
  visible: boolean;
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  cancelable?: boolean;
  onSelect: (button?: AlertButton) => void;
  onRequestClose: () => void;
}) {
  const overlayBg = "rgba(0,0,0,0.5)";
  const cardBg = useThemeColor({}, "background");

  const normalizedButtons: AlertButton[] = useMemo(() => {
    if (buttons && buttons.length > 0) return buttons.slice(0, 3);
    return [{ text: "OK", style: "default" }];
  }, [buttons]);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onRequestClose}
    >
      <View style={[styles.overlay, { backgroundColor: overlayBg }]}>
        <ThemedView style={[styles.card, { backgroundColor: cardBg }]}>
          {title ? (
            <ThemedText type="subtitle" style={styles.title}>
              {title}
            </ThemedText>
          ) : null}
          {message ? (
            <ThemedText style={styles.message}>{message}</ThemedText>
          ) : null}

          <View style={styles.buttonsRow}>
            {normalizedButtons.map((btn, index) => {
              const variant =
                btn.style === "destructive"
                  ? "danger"
                  : btn.style === "cancel"
                  ? "secondary"
                  : index === 0
                  ? "primary"
                  : "secondary";
              return (
                <AppButton
                  key={`${btn.text}-${index}`}
                  title={btn.text}
                  variant={variant as any}
                  fullWidth
                  style={styles.button}
                  onPress={() => {
                    try {
                      btn.onPress?.();
                    } finally {
                      onSelect(btn);
                    }
                  }}
                />
              );
            })}
          </View>

          {cancelable ? (
            <AppButton
              title="Close"
              variant="secondary"
              fullWidth
              style={{ marginTop: 8 }}
              onPress={() => onRequestClose()}
            />
          ) : null}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: {
    marginBottom: 8,
  },
  message: {
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: "column",
    gap: 8,
  },
  button: {
    alignSelf: "stretch",
  },
});
