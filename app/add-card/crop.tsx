// app/add-card/crop.tsx
import AppButton from "@/components/AppButton";
import BottomActions from "@/components/BottomActions";
import Hero from "@/components/Hero";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import {
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  View
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type CropBox = { x: number; y: number; width: number; height: number };

export default function CropScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Adjust Your Card" });
  }, [navigation]);

  const { uri, cropX, cropY, cropWidth, cropHeight, side, frontUri } =
    useLocalSearchParams<{
      uri: string;
      cropX: string;
      cropY: string;
      cropWidth: string;
      cropHeight: string;
      side: string;
      frontUri: string;
    }>();

  const [imageLayout, setImageLayout] = useState({
    width: screenWidth,
    height: screenHeight,
  });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerTop, setContainerTop] = useState(0);
  const [containerMeasured, setContainerMeasured] = useState(false);
  const [hasAdjusted, setHasAdjusted] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!uri) return;
    Image.getSize(uri, (width, height) => setImageSize({ width, height }));
  }, [uri]);

  // Keep green box exactly same as previous screen
  const [cropBox, setCropBox] = useState<CropBox>({
    x: Number(cropX),
    y: Number(cropY),
    width: Number(cropWidth),
    height: Number(cropHeight),
  });

  const clampBox = useCallback(
    (box: CropBox): CropBox => {
      const minSize = 60;
      let newBox = { ...box };
      if (newBox.width < minSize) newBox.width = minSize;
      if (newBox.height < minSize) newBox.height = minSize;
      if (newBox.x < 0) newBox.x = 0;
      if (newBox.y < 0) newBox.y = 0;
      if (newBox.x + newBox.width > imageLayout.width)
        newBox.width = imageLayout.width - newBox.x;
      if (newBox.y + newBox.height > imageLayout.height)
        newBox.height = imageLayout.height - newBox.y;
      return newBox;
    },
    [imageLayout]
  );

  // Adjust initial cropBox to account for the vertical offset introduced by Hero/SafeAreaView
  useEffect(() => {
    if (hasAdjusted || !containerMeasured) return;
    if (
      typeof cropY === "string" &&
      typeof cropX === "string" &&
      typeof cropWidth === "string" &&
      typeof cropHeight === "string"
    ) {
      const adjusted: CropBox = {
        x: Number(cropX),
        y: Math.max(0, Number(cropY) - containerTop - (insets?.top ?? 0)),
        width: Number(cropWidth),
        height: Number(cropHeight),
      };
      setCropBox(clampBox(adjusted));
      setHasAdjusted(true);
    }
  }, [
    containerMeasured,
    containerTop,
    hasAdjusted,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    clampBox,
    insets,
  ]);

  const createHandleResponder = (corner: string) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, { dx, dy }) => {
        let newBox = { ...cropBox };
        switch (corner) {
          case "topLeft":
            newBox.x += dx;
            newBox.y += dy;
            newBox.width -= dx;
            newBox.height -= dy;
            break;
          case "topRight":
            newBox.y += dy;
            newBox.width += dx;
            newBox.height -= dy;
            break;
          case "bottomLeft":
            newBox.x += dx;
            newBox.width -= dx;
            newBox.height += dy;
            break;
          case "bottomRight":
            newBox.width += dx;
            newBox.height += dy;
            break;
          case "top":
            newBox.y += dy;
            newBox.height -= dy;
            break;
          case "bottom":
            newBox.height += dy;
            break;
          case "left":
            newBox.x += dx;
            newBox.width -= dx;
            break;
          case "right":
            newBox.width += dx;
            break;
        }
        setCropBox(clampBox(newBox));
      },
    });

  const responders = {
    topLeft: createHandleResponder("topLeft"),
    topRight: createHandleResponder("topRight"),
    bottomLeft: createHandleResponder("bottomLeft"),
    bottomRight: createHandleResponder("bottomRight"),
    top: createHandleResponder("top"),
    bottom: createHandleResponder("bottom"),
    left: createHandleResponder("left"),
    right: createHandleResponder("right"),
  };

  const handleCrop = async () => {
    if (!uri) return;
    const { width: imgW, height: imgH } = imageSize;
    const { width: containerW, height: containerH } = imageLayout;

    const imageAspect = imgW / imgH;
    const containerAspect = containerW / containerH;

    let renderW,
      renderH,
      offsetX = 0,
      offsetY = 0;

    if (imageAspect > containerAspect) {
      renderH = containerH;
      renderW = renderH * imageAspect;
      offsetX = (containerW - renderW) / 2;
      offsetY = 0;
    } else {
      renderW = containerW;
      renderH = renderW / imageAspect;
      offsetX = 0;
      offsetY = (containerH - renderH) / 2;
    }

    const scaleX = imgW / renderW;
    const scaleY = imgH / renderH;

    const crop = {
      originX: Math.round((cropBox.x - offsetX) * scaleX),
      originY: Math.round((cropBox.y - offsetY) * scaleY),
      width: Math.round(cropBox.width * scaleX),
      height: Math.round(cropBox.height * scaleY),
    };

    const result = await ImageManipulator.manipulateAsync(
      uri, 
      [
        { crop },
        { resize: {width: 1200} }
      ], 
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    //Delete the original raw capture; the cropped image is used next
    FileSystem.deleteAsync(uri, {idempotent: true}).catch(() => {})

    router.push({
      pathname: "/add-card/preview",
      params: { uri: result.uri, side, frontUri },
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={["top"]}
    >
      <Hero title="Adjust Your Card" subtitle="Resize the crop box precisely" />

      {uri && (
        <View
          style={styles.imageContainer}
          onLayout={(e) => {
            setContainerTop(e.nativeEvent.layout.y);
            setContainerMeasured(true);
          }}
        >
          <Image
            source={{ uri }}
            style={[
              styles.image,
              {
                resizeMode: "cover",
              },
            ]}
            onLayout={(e) =>
              setImageLayout({
                width: e.nativeEvent.layout.width,
                height: e.nativeEvent.layout.height,
              })
            }
          />

          {/* Green Crop Overlay */}
          {hasAdjusted && (
            <View style={styles.overlay}>
              <View
                style={{
                  position: "absolute",
                  top: cropBox.y,
                  left: cropBox.x,
                  width: cropBox.width,
                  height: cropBox.height,
                  borderWidth: 2,
                  borderColor: "lime",
                }}
              >
                {/* Handles */}
                <View
                  style={[styles.handle, { top: -12, left: -12 }]}
                  {...responders.topLeft.panHandlers}
                />
                <View
                  style={[styles.handle, { top: -12, right: -12 }]}
                  {...responders.topRight.panHandlers}
                />
                <View
                  style={[styles.handle, { bottom: -12, left: -12 }]}
                  {...responders.bottomLeft.panHandlers}
                />
                <View
                  style={[styles.handle, { bottom: -12, right: -12 }]}
                  {...responders.bottomRight.panHandlers}
                />
              </View>
            </View>
          )}
        </View>
      )}

      <BottomActions style={{bottom: 12}}>
        <AppButton title="Crop & Preview" onPress={handleCrop} fullWidth/>
      </BottomActions>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  imageContainer: { flex: 1 },
  image: { flex: 1, width: "100%", height: "100%" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  handle: {
    position: "absolute",
    width: 24,
    height: 24,
    backgroundColor: "lime",
    borderRadius: 12,
  },
  cropText: { color: "#fff", fontWeight: "bold" },
  debugBox: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#0008",
    padding: 6,
    borderRadius: 6,
  },
  debugText: { color: "#0f0", fontSize: 10 },
});
