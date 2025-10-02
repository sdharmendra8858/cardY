// app/add-card/crop.tsx
import * as ImageManipulator from "expo-image-manipulator";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type CropBox = { x: number; y: number; width: number; height: number };

export default function CropScreen() {
  const router = useRouter();

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Adjust Your Card" });
  }, [navigation]);

  const { uri, cropX, cropY, cropWidth, cropHeight } =
    useLocalSearchParams<{
      uri: string;
      cropX: string;
      cropY: string;
      cropWidth: string;
      cropHeight: string;
    }>();

  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const [cropBox, setCropBox] = useState<CropBox>({
    x: Number(cropX),
    y: Number(cropY),
    width: Number(cropWidth),
    height: Number(cropHeight),
  });

  // get actual image size
  useEffect(() => {
    if (!uri) return;
    Image.getSize(uri, (width, height) => setImageSize({ width, height }));
  }, [uri]);

  // utility: clamp box inside screen
  const clampBox = (box: CropBox): CropBox => {
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
  };

  // PanResponder generator for each handle
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

  // create all responders
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

    const displayedWidth = imageLayout.width;
    const displayedHeight = imageLayout.height;

    const imageAspect = imageSize.width / imageSize.height;
    const containerAspect = displayedWidth / displayedHeight;

    let offsetX = 0;
    let offsetY = 0;
    let scaleX = 1;
    let scaleY = 1;

    if (imageAspect > containerAspect) {
      const scaledHeight = displayedWidth / imageAspect;
      offsetY = (displayedHeight - scaledHeight) / 2;
      scaleX = imageSize.width / displayedWidth;
      scaleY = imageSize.height / scaledHeight;
    } else {
      const scaledWidth = displayedHeight * imageAspect;
      offsetX = (displayedWidth - scaledWidth) / 2;
      scaleX = imageSize.width / scaledWidth;
      scaleY = imageSize.height / displayedHeight;
    }

    const crop = {
      originX: Math.round((cropBox.x - offsetX) * scaleX),
      originY: Math.round((cropBox.y - offsetY) * scaleY),
      width: Math.round(cropBox.width * scaleX),
      height: Math.round(cropBox.height * scaleY),
    };

    const cropped = await ImageManipulator.manipulateAsync(
      uri,
      [{ crop }],
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    router.push(`/add-card/preview?uri=${encodeURIComponent(cropped.uri)}`);
  };

  return (
    <View style={styles.container}>
      {uri && (
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="contain"
          onLayout={(e) =>
            setImageLayout({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })
          }
        />
      )}

      {/* Crop rectangle */}
      <View
        style={[
          styles.cropBox,
          {
            top: cropBox.y,
            left: cropBox.x,
            width: cropBox.width,
            height: cropBox.height,
          },
        ]}
      >
        {/* corner handles */}
        <View style={[styles.handle, { top: -12, left: -12 }]} {...responders.topLeft.panHandlers} />
        <View style={[styles.handle, { top: -12, right: -12 }]} {...responders.topRight.panHandlers} />
        <View style={[styles.handle, { bottom: -12, left: -12 }]} {...responders.bottomLeft.panHandlers} />
        <View style={[styles.handle, { bottom: -12, right: -12 }]} {...responders.bottomRight.panHandlers} />

        {/* edge handles */}
        <View style={[styles.edgeHandle, { top: -10, left: "40%", right: "40%" }]} {...responders.top.panHandlers} />
        <View style={[styles.edgeHandle, { bottom: -10, left: "40%", right: "40%" }]} {...responders.bottom.panHandlers} />
        <View style={[styles.edgeHandle, { left: -10, top: "40%", bottom: "40%" }]} {...responders.left.panHandlers} />
        <View style={[styles.edgeHandle, { right: -10, top: "40%", bottom: "40%" }]} {...responders.right.panHandlers} />
      </View>

      <TouchableOpacity style={styles.cropButton} onPress={handleCrop}>
        <Text style={styles.cropText}>Crop & Preview</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  image: { flex: 1, width: "100%", height: "100%" },
  cropBox: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "lime",
  },
  handle: {
    position: "absolute",
    width: 24,
    height: 24,
    backgroundColor: "lime",
    borderRadius: 12,
  },
  edgeHandle: {
    position: "absolute",
    backgroundColor: "lime",
    height: 20,
    width: 40,
  },
  cropButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    padding: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  cropText: { color: "#fff", fontWeight: "bold" },
});