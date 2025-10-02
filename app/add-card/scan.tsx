// app/add-card/scan.tsx
import { Camera, CameraType, CameraView } from "expo-camera";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_ASPECT_RATIO = 85.6 / 53.98; // Debit card (width / height)
const SCREEN_BUFFER = 20;

export default function ScanScreen() {
  const router = useRouter();
  const { frontUri } = useLocalSearchParams<{ frontUri?: string }>(); // optional
  const [side] = useState<"front" | "back">(frontUri ? "back" : "front");

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Capture Card" });
  }, [navigation]);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const cameraRef = useRef<React.ComponentRef<typeof CameraView>>(null);
  const [facing] = useState<CameraType>("back");

  // Guide calculations — fixed to screen
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

  // Capture and navigate to crop screen with side param
  const handleCapture = async () => {
    if (!cameraRef.current) return;
  
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: true });
  
      router.push({
        pathname: "/add-card/crop",
        params: {
          uri: photo.uri, // raw photo URI
          cropX: Math.round(guideX),
          cropY: Math.round(guideY),
          cropWidth: Math.round(guideWidth),
          cropHeight: Math.round(guideHeight),
          side,
          ...(frontUri ? { frontUri } : {}), // optional frontUri
        },
      });
    } catch (err) {
      console.error("Capture error:", err);
    }
  };

  if (hasPermission === null) return <View style={styles.container} />;
  if (!hasPermission)
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center", marginTop: 20 }}>No access to camera</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      {/* Use Camera component from expo-camera */}
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
        pointerEvents="none"
      />

      <View style={styles.bottomContainer}>
        <Text style={styles.sideText}>{side === "front" ? "Capture Front of Card" : "Capture Back of Card"}</Text>
        <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
          <Text style={styles.captureText}>Capture</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  guide: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "lime",
    zIndex: 10,
    borderRadius: 6,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  sideText: {
    color: "#fff",
    marginBottom: 8,
    fontSize: 16,
  },
  captureButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  captureText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});