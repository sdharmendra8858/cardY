import AppButton from "@/components/AppButton";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import React, { useEffect, useMemo } from "react";
import {
  BackHandler,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export type AlertBoxButtonStyle = "default" | "cancel" | "destructive";

export type AlertBoxButton = {
  text: string;
  onPress?: () => void;
  style?: AlertBoxButtonStyle;
};

export type AlertBoxProps = {
  visible: boolean;
  title?: string;
  message?: string;
  buttons?: AlertBoxButton[];
  cancelable?: boolean;
  onRequestClose?: () => void;
  onSelect?: (button?: AlertBoxButton) => void;
};

export default function AlertBox({
  visible,
  title,
  message,
  buttons,
  cancelable = true,
  onRequestClose,
  onSelect,
}: AlertBoxProps) {
  const overlayBg = "rgba(0,0,0,0.5)";
  const cardBg = useThemeColor({}, "background");

  const normalizedButtons: AlertBoxButton[] = useMemo(() => {
    if (buttons && buttons.length > 0) return buttons.slice(0, 3);
    return [{ text: "OK", style: "default" }];
  }, [buttons]);

  // Handle Android back press
  useEffect(() => {
    const backAction = () => {
      if (visible) {
        if (cancelable) {
          onRequestClose?.();
        }
        return true; // Always return true to consume the event and prevent dismissal
      }
      return false;
    };
    const handler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => handler.remove();
  }, [visible, cancelable, onRequestClose]);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={() => {
        if (cancelable) onRequestClose?.();
      }}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          if (cancelable) onRequestClose?.();
        }}
      >
        <View style={[styles.overlay, { backgroundColor: overlayBg }]}>
          <TouchableWithoutFeedback onPress={() => { }}>
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
                          onSelect?.(btn);
                        }
                      }}
                    />
                  );
                })}
              </View>
            </ThemedView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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