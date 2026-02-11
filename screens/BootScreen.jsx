import React, { useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function BootScreen() {
  // Doodle circle animation
  const circleProgress = React.useRef(new Animated.Value(0)).current;
  
  // Letter H animation
  const letterHScale = React.useRef(new Animated.Value(0)).current;
  const letterHOpacity = React.useRef(new Animated.Value(0)).current;
  
  // Letters R and S animations
  const letterRScale = React.useRef(new Animated.Value(0.8)).current;
  const letterROpacity = React.useRef(new Animated.Value(0)).current;
  const letterRRotate = React.useRef(new Animated.Value(-10)).current;
  
  const letterSScale = React.useRef(new Animated.Value(0.8)).current;
  const letterSOpacity = React.useRef(new Animated.Value(0)).current;
  const letterSRotate = React.useRef(new Animated.Value(-10)).current;
  
  // Sub-text animations
  const subHOpacity = React.useRef(new Animated.Value(0)).current;
  const subHTranslate = React.useRef(new Animated.Value(-10)).current;
  const subROpacity = React.useRef(new Animated.Value(0)).current;
  const subRTranslate = React.useRef(new Animated.Value(-10)).current;
  const subSOpacity = React.useRef(new Animated.Value(0)).current;
  const subSTranslate = React.useRef(new Animated.Value(-10)).current;
  
  // Icon animations
  const icon1Opacity = React.useRef(new Animated.Value(0)).current;
  const icon1Translate = React.useRef(new Animated.Value(20)).current;
  const icon1Scale = React.useRef(new Animated.Value(0.5)).current;
  
  const icon2Opacity = React.useRef(new Animated.Value(0)).current;
  const icon2Translate = React.useRef(new Animated.Value(20)).current;
  const icon2Scale = React.useRef(new Animated.Value(0.5)).current;
  
  const icon3Opacity = React.useRef(new Animated.Value(0)).current;
  const icon3Translate = React.useRef(new Animated.Value(20)).current;
  const icon3Scale = React.useRef(new Animated.Value(0.5)).current;
  
  // Loading line animation
  const loaderProgress = React.useRef(new Animated.Value(0)).current;
  
  // Wiggle animation (continuous)
  const wiggleRotate = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start doodle circle animation
    Animated.timing(circleProgress, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();
    
    // Letter H pop and shake
    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(letterHOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(letterHScale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    // Letter R scribble in
    Animated.sequence([
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(letterROpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(letterRScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(letterRRotate, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    // Letter S scribble in
    Animated.sequence([
      Animated.delay(1400),
      Animated.parallel([
        Animated.timing(letterSOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(letterSScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(letterSRotate, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    // Sub-text animations
    Animated.sequence([
      Animated.delay(1000),
      Animated.parallel([
        Animated.timing(subHOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(subHTranslate, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
    
    Animated.sequence([
      Animated.delay(1600),
      Animated.parallel([
        Animated.timing(subROpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(subRTranslate, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
    
    Animated.sequence([
      Animated.delay(1800),
      Animated.parallel([
        Animated.timing(subSOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(subSTranslate, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
    
    // Icon jump animations
    const jumpIcon = (opacity, translate, scale, delay) => {
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(translate, { toValue: 0, duration: 600, useNativeDriver: true }),
          Animated.spring(scale, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    };
    
    jumpIcon(icon1Opacity, icon1Translate, icon1Scale, 2200);
    jumpIcon(icon2Opacity, icon2Translate, icon2Scale, 2400);
    jumpIcon(icon3Opacity, icon3Translate, icon3Scale, 2600);
    
    // Loading line animation
    Animated.timing(loaderProgress, {
      toValue: 1,
      duration: 3500,
      useNativeDriver: true,
    }).start();
    
    // Continuous wiggle effect
    const wiggleAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(wiggleRotate, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(wiggleRotate, { toValue: -1, duration: 1500, useNativeDriver: true }),
        Animated.timing(wiggleRotate, { toValue: 0, duration: 750, useNativeDriver: true }),
      ])
    );
    wiggleAnim.start();

    return () => {
      wiggleAnim.stop();
    };
  }, []);

  const wiggleRotateInterpolate = wiggleRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-1deg', '0deg', '1deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContainer}>
        
        {/* Main Logo Container with Wiggle */}
        <Animated.View 
          style={[
            styles.logoWrapper,
            { transform: [{ rotate: wiggleRotateInterpolate }] }
          ]}
        >
          
          {/* H Block with Doodle Circle */}
          <View style={styles.letterBlock}>
            {/* Doodle Circle SVG */}
            <Svg
              width={100}
              height={120}
              viewBox="0 0 100 100"
              style={styles.doodleCircle}
            >
              <AnimatedPath
                d="M50,10 C75,8 95,25 90,50 C85,80 60,95 40,90 C15,85 5,60 10,40 C15,20 35,12 50,10"
                fill="none"
                stroke="#2c3e50"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={1000}
                strokeDashoffset={circleProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1000, 0],
                })}
              />
            </Svg>
            
            <Animated.Text
              style={[
                styles.mainLetter,
                {
                  opacity: letterHOpacity,
                  transform: [{ scale: letterHScale }],
                },
              ]}
            >
              H
            </Animated.Text>
            
            <Animated.Text
              style={[
                styles.subText,
                styles.subTextOrange,
                {
                  opacity: subHOpacity,
                  transform: [{ translateY: subHTranslate }],
                },
              ]}
            >
              Hotel
            </Animated.Text>
          </View>

          {/* R Block */}
          <Animated.View
            style={[
              styles.letterBlock,
              {
                opacity: letterROpacity,
                transform: [
                  { scale: letterRScale },
                  { rotate: letterRRotate.interpolate({
                      inputRange: [-10, 0],
                      outputRange: ['-10deg', '0deg'],
                    })
                  },
                ],
              },
            ]}
          >
            <Animated.Text style={styles.mainLetter}>R</Animated.Text>
            
            <Animated.Text
              style={[
                styles.subText,
                styles.subTextBlue,
                {
                  opacity: subROpacity,
                  transform: [{ translateY: subRTranslate }],
                },
              ]}
            >
              Rooms
            </Animated.Text>
          </Animated.View>

          {/* S Block */}
          <Animated.View
            style={[
              styles.letterBlock,
              {
                opacity: letterSOpacity,
                transform: [
                  { scale: letterSScale },
                  { rotate: letterSRotate.interpolate({
                      inputRange: [-10, 0],
                      outputRange: ['-10deg', '0deg'],
                    })
                  },
                ],
              },
            ]}
          >
            <Animated.Text style={[styles.mainLetter, styles.letterSOrange]}>S</Animated.Text>
            
            <Animated.Text
              style={[
                styles.subText,
                styles.subTextOrange,
                {
                  opacity: subSOpacity,
                  transform: [{ translateY: subSTranslate }],
                },
              ]}
            >
              Stay
            </Animated.Text>
          </Animated.View>
          
        </Animated.View>

        {/* Icons Container */}
        <View style={styles.iconsContainer}>
          
          {/* Icon 1: Bed */}
          <Animated.View
            style={[
              styles.iconBox,
              {
                opacity: icon1Opacity,
                transform: [
                  { translateY: icon1Translate },
                  { scale: icon1Scale },
                ],
              },
            ]}
          >
            <View style={styles.iconCircle}>
              <View style={styles.iconScribbleBg} />
              <Ionicons name="bed-outline" size={28} color="#374151" />
            </View>
            <Text style={styles.iconLabel}>Comfort</Text>
          </Animated.View>

          {/* Icon 2: Map */}
          <Animated.View
            style={[
              styles.iconBox,
              {
                opacity: icon2Opacity,
                transform: [
                  { translateY: icon2Translate },
                  { scale: icon2Scale },
                ],
              },
            ]}
          >
            <View style={styles.iconCircle}>
              <View style={[styles.iconScribbleBg, styles.iconScribbleBgOrange]} />
              <Ionicons name="map-outline" size={28} color="#ea580c" />
            </View>
            <Text style={[styles.iconLabel, styles.iconLabelOrange]}>Tours</Text>
          </Animated.View>

          {/* Icon 3: Airplane */}
          <Animated.View
            style={[
              styles.iconBox,
              {
                opacity: icon3Opacity,
                transform: [
                  { translateY: icon3Translate },
                  { scale: icon3Scale },
                ],
              },
            ]}
          >
            <View style={styles.iconCircle}>
              <View style={styles.iconScribbleBg} />
              <Ionicons name="airplane-outline" size={28} color="#374151" />
            </View>
            <Text style={styles.iconLabel}>Travel</Text>
          </Animated.View>
          
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>Let's go somewhere!</Text>

        {/* Doodle Loading Line */}
        <View style={styles.loaderContainer}>
          <Svg width={256} height={24} viewBox="0 0 200 20">
            {/* Base line */}
            <Path
              d="M5,10 Q50,15 100,10 T195,10"
              fill="none"
              stroke="#eee"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Animated loading line */}
            <AnimatedPath
              d="M5,10 Q50,15 100,10 T195,10"
              fill="none"
              stroke="#333"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={200}
              strokeDashoffset={loaderProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [200, 0],
              })}
            />
          </Svg>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 12,
  },
  letterBlock: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 128,
    width: 80,
    paddingBottom: 4,
    position: 'relative',
  },
  doodleCircle: {
    position: 'absolute',
    top: -10,
    left: 0,
    right: 0,
  },
  mainLetter: {
    fontSize: 70,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    zIndex: 10,
  },
  letterSOrange: {
    color: '#f97316',
    transform: [{ rotate: '5deg' }],
  },
  subText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  subTextOrange: {
    color: '#ea580c',
  },
  subTextBlue: {
    color: '#2563eb',
  },
  iconsContainer: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 16,
    marginTop: 16,
  },
  iconBox: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconScribbleBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: 28,
    opacity: 0.5,
  },
  iconScribbleBgOrange: {
    backgroundColor: '#fed7aa',
    opacity: 0.8,
  },
  iconLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#111827',
  },
  iconLabelOrange: {
    color: '#ea580c',
  },
  tagline: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9ca3af',
    letterSpacing: 1,
    marginBottom: 32,
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 48,
    width: 256,
    height: 24,
  },
});
