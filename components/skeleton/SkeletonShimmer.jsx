import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, View } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function SkeletonShimmer({
  height = 12,
  width = "100%",
  radius = 8,
  baseColor = "rgba(226,232,240,0.6)",
  highlightColor = "rgba(255,255,255,0.35)",
  duration = 1200,
  style,
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [duration, shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View
      style={[
        {
          height,
          width,
          borderRadius: radius,
          backgroundColor: baseColor,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: "40%",
          transform: [{ translateX }],
          backgroundColor: highlightColor,
        }}
      />
    </View>
  );
}
