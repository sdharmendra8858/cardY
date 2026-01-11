// app/add-card/components/NfcScanButton.tsx
import AppButton from "@/components/AppButton";

interface NfcScanButtonProps {
    onPress: () => void;
    title?: string;
}

export default function NfcScanButton({ onPress, title = "NFC Scan" }: NfcScanButtonProps) {
    return (
        <AppButton
            title={title}
            onPress={onPress}
            variant="secondary"
            icon="radio-outline"
            iconSize={20}
        />
    );
}
