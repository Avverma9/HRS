import React, { useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function BootScreen() {
  // Animated values for door rotation
  const doorRotation = React.useRef(new Animated.Value(0)).current;

  // Animated values for each logo character
  const charAnimations = React.useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    // Door open/close animation
    const doorAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(doorRotation, {
          toValue: 1,
          duration: 1250,
          useNativeDriver: true,
        }),
        Animated.timing(doorRotation, {
          toValue: 0,
          duration: 1250,
          useNativeDriver: true,
        }),
      ])
    );

    // Character float/shake animation with staggered delays
    const charAnims = charAnimations.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 3000,
            delay: index * 100,
            useNativeDriver: true,
          }),
        ])
      )
    );

    doorAnim.start();
    charAnims.forEach((anim) => anim.start());

    return () => {
      doorAnim.stop();
      charAnims.forEach((anim) => anim.stop());
    };
  }, []);

  // Door rotation interpolation (0 to -30 degrees and back)
  const doorRotateZ = doorRotation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '-30deg', '0deg'],
  });

  // Character animation interpolation (float and shake effect)
  const getCharTransform = (charAnim) => {
    const translateY = charAnim.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0, -4, 0, 4, 0],
    });

    const rotate = charAnim.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: ['0deg', '-1deg', '0deg', '1deg', '0deg'],
    });

    return { translateY, rotate };
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContainer}>
        {/* Text Content */}
        <View style={styles.textContainer}>
          {/* Logo with animated characters */}
          <View style={styles.logoContainer}>
            {/* रे character */}
            <Animated.Text
              style={[
                styles.logoText,
                styles.devanagariChar,
                {
                  transform: [
                    {
                      translateY: getCharTransform(charAnimations[0]).translateY,
                    },
                    {
                      rotate: getCharTransform(charAnimations[0]).rotate,
                    },
                  ],
                },
              ]}
            >
              रे
            </Animated.Text>

            {/* S character */}
            <Animated.Text
              style={[
                styles.logoText,
                {
                  transform: [
                    {
                      translateY: getCharTransform(charAnimations[1]).translateY,
                    },
                    {
                      rotate: getCharTransform(charAnimations[1]).rotate,
                    },
                  ],
                },
              ]}
            >
              S
            </Animated.Text>

            {/* T character */}
            <Animated.Text
              style={[
                styles.logoText,
                {
                  transform: [
                    {
                      translateY: getCharTransform(charAnimations[2]).translateY,
                    },
                    {
                      rotate: getCharTransform(charAnimations[2]).rotate,
                    },
                  ],
                },
              ]}
            >
              T
            </Animated.Text>

            {/* R character */}
            <Animated.Text
              style={[
                styles.logoText,
                {
                  transform: [
                    {
                      translateY: getCharTransform(charAnimations[3]).translateY,
                    },
                    {
                      rotate: getCharTransform(charAnimations[3]).rotate,
                    },
                  ],
                },
              ]}
            >
              R
            </Animated.Text>

            {/* A character */}
            <Animated.Text
              style={[
                styles.logoText,
                {
                  transform: [
                    {
                      translateY: getCharTransform(charAnimations[4]).translateY,
                    },
                    {
                      rotate: getCharTransform(charAnimations[4]).rotate,
                    },
                  ],
                },
              ]}
            >
              A
            </Animated.Text>
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>We care about you</Text>
        </View>

        {/* Animated Door Icon */}
        <View style={styles.doorContainer}>
          <View style={styles.doorFrame}>
            <Animated.View
              style={[
                styles.door,
                {
                  transform: [
                    {
                      perspective: 1200,
                    },
                    {
                      rotateY: doorRotateZ,
                    },
                  ],
                },
              ]}
            >
              {/* Door details - window panel */}
              <View style={styles.doorDetails} />

              {/* Door handle */}
              <View style={styles.doorHandle} />
            </Animated.View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBBF24', // yellow-300
  },
  mainContainer: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: Platform.OS === 'web' ? 64 : 40,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: width > 400 ? 72 : 60,
    fontWeight: '900',
    color: '#312E81', // indigo-900
    letterSpacing: 4,
  },
  devanagariChar: {
    fontFamily: Platform.OS === 'ios' ? 'NotoSansDevanagari-Bold' : 'Noto Sans Devanagari',
  },
  tagline: {
    fontSize: width > 400 ? 28 : 22,
    color: '#312E81', // indigo-900
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Door Styles
  doorContainer: {
    width: 140,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    perspective: 1200,
  },
  doorFrame: {
    width: 110,
    height: 160,
    borderWidth: 5,
    borderColor: '#4338CA', // indigo-700
    borderRadius: 16,
    padding: 8,
    alignItems: 'flex-start',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  door: {
    width: '100%',
    height: '100%',
    backgroundColor: '#A5B4FC', // indigo-300
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  doorDetails: {
    width: 18,
    height: 50,
    borderWidth: 3,
    borderColor: '#C7D2FE', // indigo-200
    borderRadius: 4,
    position: 'absolute',
    top: 25,
    left: 12,
  },
  doorHandle: {
    width: 7,
    height: 7,
    backgroundColor: '#312E81', // indigo-900
    borderRadius: 3.5,
    position: 'absolute',
    top: '50%',
    right: 10,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});