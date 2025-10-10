// app/add-card/components/ScanButton.tsx
import AppButton from "@/components/AppButton";

interface ScanButtonProps {
  onPress: () => void;
  title?: string;
}

export default function ScanButton({ onPress, title = "Scan Card" }: ScanButtonProps) {
  return <AppButton title={title} onPress={onPress} variant="primary"/>
}