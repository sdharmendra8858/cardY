// app/add-card/scan.tsx
import AppButton from "@/components/AppButton";
import Hero from "@/components/Hero";
import { useFocusEffect } from "@react-navigation/native";
import { Camera, CameraType, CameraView } from "expo-camera";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_ASPECT_RATIO = 85.6 / 53.98; // Debit card (width / height)
const SCREEN_BUFFER = 20;

export default function ScanScreen() {
  const router = useRouter();
  const { frontUri } = useLocalSearchParams<{ frontUri?: string }>();
  const [side] = useState<"front" | "back">(frontUri ? "back" : "front");

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Capture Card" });
  }, [navigation]);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const cameraRef = useRef<React.ComponentRef<typeof CameraView>>(null);
  const [facing] = useState<CameraType>("back");
  const [captureDisabled, setCaptureDisabled] = useState(false);

  // Guide calculations — fixed to screen
  const guideWidth = SCREEN_WIDTH - SCREEN_BUFFER * 2;
  const guideHeight = guideWidth / CARD_ASPECT_RATIO;
  const guideX = SCREEN_BUFFER;
  const guideY = (SCREEN_HEIGHT - guideHeight) / 2;

  // Ask permission once
  useEffect(() => {
    (async () => {
      const { status } = await Camera.getCameraPermissionsAsync();
      if (status !== "granted") {
        const { status: reqStatus } =
          await Camera.requestCameraPermissionsAsync();
        setHasPermission(reqStatus === "granted");
      } else {
        setHasPermission(true);
      }
    })();
  }, []);

  // Resume/pause camera with screen focus
  useFocusEffect(
    useCallback(() => {
      console.log("ScanScreen focused, resuming camera");
      setCaptureDisabled(false);
      cameraRef.current?.resumePreview?.();

      return () => {
        console.log("ScanScreen lost focus, pausing camera");
        cameraRef.current?.pausePreview?.();
      };
    }, [])
  );

  // Capture and navigate
  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      console.log("Taking picture...");
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: true,
      });
      console.log("Photo taken:", photo.uri);

      setCaptureDisabled(true);

      // Navigate without unmounting camera
      setTimeout(() => {
        router.push({
          pathname: "/add-card/crop",
          params: {
            uri: photo.uri,
            cropX: Math.round(guideX),
            cropY: Math.round(guideY),
            cropWidth: Math.round(guideWidth),
            cropHeight: Math.round(guideHeight),
            side,
            ...(frontUri ? { frontUri } : {}),
          },
        });
      }, 0);
    } catch (err) {
      console.error("Capture error:", err);
    }
  };

  if (hasPermission === null) return <View style={styles.container} />;
  if (!hasPermission)
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          No access to camera
        </Text>
      </View>
    );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={{ alignSelf: "stretch" }}>
        <Hero title="Capture Card" subtitle="Align card within the guid" />
      </View>
      {/* Always keep camera mounted */}
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
        <Text style={styles.sideText}>
          {side === "front" ? "Capture Front of Card" : "Capture Back of Card"}
        </Text>
        <AppButton
          title="Capture"
          onPress={handleCapture}
          disabled={captureDisabled}
        />
      </View>
    </SafeAreaView>
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
});
