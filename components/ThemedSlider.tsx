// import React, { useEffect, useRef, useState } from "react";
// import {
//     GestureResponderEvent,
//     LayoutChangeEvent,
//     PanResponder,
//     StyleSheet,
//     View,
// } from "react-native";

// interface ThemedSliderProps {
//   value: number;
//   min?: number;
//   max?: number;
//   step?: number;
//   onValueChange?: (value: number) => void;
//   trackColor?: string;
//   thumbColor?: string;
//   height?: number;
// }

// export default function ThemedSlider({
//   value,
//   min = 0,
//   max = 10,
//   step = 1,
//   onValueChange,
//   trackColor = "#ccc",
//   thumbColor = "#007AFF",
//   height = 6,
// }: ThemedSliderProps) {
//   const [layoutWidth, setLayoutWidth] = useState(0);
//   const [internalValue, setInternalValue] = useState(value);
//   const layoutRef = useRef(0);
//   const isDragging = useRef(false);

//   const totalSteps = (max - min) / step;

//   // Convert value → X
//   const getX = (val: number) => {
//     const ratio = (val - min) / (max - min);
//     return ratio * layoutRef.current;
//   };

//   // Convert X → value
//   const getVal = (x: number) => {
//     const clamped = Math.max(0, Math.min(x, layoutRef.current));
//     const ratio = clamped / layoutRef.current;
//     const raw = min + ratio * (max - min);
//     const snapped = Math.round(raw / step) * step;
//     return Math.max(min, Math.min(snapped, max));
//   };

//   const handleTouch = (evt: GestureResponderEvent) => {
//     const { locationX } = evt.nativeEvent;
//     const newVal = getVal(locationX);
//     setInternalValue(newVal); // visually move thumb instantly
//     onValueChange?.(newVal); // notify parent
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => true,
//       onPanResponderGrant: (e) => {
//         isDragging.current = true;
//         handleTouch(e);
//       },
//       onPanResponderMove: handleTouch,
//       onPanResponderRelease: () => {
//         isDragging.current = false;
//       },
//       onPanResponderTerminationRequest: () => false,
//     })
//   ).current;

//   const onLayout = (e: LayoutChangeEvent) => {
//     const width = e.nativeEvent.layout.width;
//     setLayoutWidth(width);
//     layoutRef.current = width;
//   };

//   // Sync external value only when not dragging
//   useEffect(() => {
//     if (!isDragging.current) setInternalValue(value);
//   }, [value]);

//   const thumbX = layoutWidth > 0 ? getX(internalValue) : 0;

//   return (
//     <View
//       style={[styles.container, { height }]}
//       onLayout={onLayout}
//       {...panResponder.panHandlers}
//     >
//       {/* Full track */}
//       <View
//         style={[
//           styles.track,
//           { backgroundColor: trackColor, height },
//         ]}
//       />
//       {/* Filled portion */}
//       <View
//         style={[
//           styles.filled,
//           {
//             backgroundColor: thumbColor,
//             height,
//             width: thumbX,
//           },
//         ]}
//       />
//       {/* Thumb */}
//       <View
//         style={[
//           styles.thumb,
//           {
//             backgroundColor: thumbColor,
//             left: thumbX - 10,
//             top: -(20 - height) / 2,
//           },
//         ]}
//       />

//       {/* Tap overlay — detects taps anywhere on track */}
//       <View
//         style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]}
//         pointerEvents="box-only"
//         onStartShouldSetResponder={() => true}
//         onResponderRelease={(e) => {
//           const x = e.nativeEvent.locationX;
//           const newVal = getVal(x);
//           setInternalValue(newVal);
//           onValueChange?.(newVal);
//         }}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     width: "100%",
//     justifyContent: "center",
//   },
//   track: {
//     position: "absolute",
//     width: "100%",
//     borderRadius: 3,
//     opacity: 0.25,
//   },
//   filled: {
//     position: "absolute",
//     borderRadius: 3,
//   },
//   thumb: {
//     position: "absolute",
//     width: 20,
//     height: 20,
//     borderRadius: 10,
//     borderWidth: 2,
//     borderColor: "#fff",
//     elevation: 2,
//   },
// });