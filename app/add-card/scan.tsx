// app/add-card/scan.tsx
import { Camera, CameraType, CameraView } from "expo-camera";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_ASPECT_RATIO = 85.6 / 53.98; // Debit card
const SCREEN_BUFFER = 20;

export default function ScanScreen() {
  const router = useRouter();

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Scan Your card" });
  }, [navigation]);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const cameraRef = useRef<React.ComponentRef<typeof CameraView>>(null);
  const [facing] = useState<CameraType>("back");

  // Fixed rectangle guide dimensions
  const guideWidth = SCREEN_WIDTH - SCREEN_BUFFER * 2;
  const guideHeight = guideWidth / CARD_ASPECT_RATIO;
  const guideX = SCREEN_BUFFER;
  const guideY = (SCREEN_HEIGHT - guideHeight) / 2;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    const photo = await cameraRef.current.takePictureAsync({ skipProcessing: true });

    router.push(
      `/add-card/crop?uri=${encodeURIComponent(photo.uri)}&cropX=${guideX}&cropY=${guideY}&cropWidth=${guideWidth}&cropHeight=${guideHeight}`
    );
  };

  if (hasPermission === null) return <View />;
  if (!hasPermission)
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
      </View>
    );

  return (
    <View style={styles.container}>
     <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

      {/* Fixed rectangle guide */}
      <View
        style={[
          styles.guide,
          {
            top: guideY,
            left: guideX,
            width: guideWidth,
            height: guideHeight,
          },
        ]}
      />

      <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
        <Text style={styles.captureText}>Capture Card</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  guide: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "lime",
    zIndex: 10,
  },
  captureButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    padding: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  captureText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});