import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const normalizeText = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const splitPolicyValue = (value) => {
  const raw = String(value ?? "")
    .replace(/\r/g, "")
    .trim();
  if (!raw) return [];

  const separators = [/\n+/, /\s+\|\s+/, /\s*[\u2022\u25CF\u25AA]\s*/, /;\s+/];
  for (const separator of separators) {
    if (separator.test(raw)) {
      return raw
        .split(separator)
        .map((part) => normalizeText(part))
        .filter(Boolean);
    }
  }

  return [normalizeText(raw)];
};

const formatSectionTitle = (label) => {
  const normalized = normalizeText(label);
  if (/hotel policy/i.test(normalized)) return "Hotel Rules";
  if (/house rules/i.test(normalized)) return "Other Rules";
  return normalized;
};

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const POLICY_CONTENT_KEYS = [
  "value",
  "text",
  "description",
  "content",
  "details",
  "rules",
  "items",
  "points",
  "policies",
  "policy",
  "conditions",
  "terms",
];

const POLICY_META_KEYS = new Set([
  "_id",
  "id",
  "icon",
  "key",
  "label",
  "title",
  "heading",
  "name",
  "type",
  "code",
]);

const extractPointsFromAny = (value) => {
  if (value === undefined || value === null || value === "") return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractPointsFromAny(item));
  }

  if (isPlainObject(value)) {
    const preferredPoints = POLICY_CONTENT_KEYS.flatMap((key) =>
      extractPointsFromAny(value[key]),
    );
    if (preferredPoints.length) return preferredPoints;

    return Object.entries(value).flatMap(([key, nestedValue]) => {
      const nestedPoints = extractPointsFromAny(nestedValue);
      if (!nestedPoints.length) return [];
      if (isPlainObject(nestedValue) || Array.isArray(nestedValue)) {
        return nestedPoints;
      }
      const title = formatSectionTitle(key);
      return nestedPoints.map((point) => `${title}: ${point}`);
    });
  }

  if (typeof value === "boolean") return [value ? "Yes" : "No"];
  return splitPolicyValue(value);
};

const extractSectionsFromSource = (source, fallbackTitle = "") => {
  if (source === undefined || source === null || source === "") return [];

  if (Array.isArray(source)) {
    const onlyPrimitiveValues = source.every(
      (item) => !isPlainObject(item) && !Array.isArray(item),
    );

    if (onlyPrimitiveValues) {
      const points = source.flatMap((item) => extractPointsFromAny(item));
      if (!fallbackTitle || !points.length) return [];
      return [
        {
          key: fallbackTitle,
          title: formatSectionTitle(fallbackTitle),
          points,
        },
      ];
    }

    return source.flatMap((item, index) =>
      extractSectionsFromSource(item, fallbackTitle || `Policy ${index + 1}`),
    );
  }

  if (!isPlainObject(source)) {
    const points = extractPointsFromAny(source);
    if (!fallbackTitle || !points.length) return [];
    return [
      {
        key: fallbackTitle,
        title: formatSectionTitle(fallbackTitle),
        points,
      },
    ];
  }

  const titledLabel = normalizeText(
    source.label ||
      source.title ||
      source.heading ||
      source.name ||
      fallbackTitle,
  );
  const directPoints = POLICY_CONTENT_KEYS.flatMap((key) =>
    extractPointsFromAny(source[key]),
  );
  const sections = [];

  if (titledLabel && directPoints.length) {
    sections.push({
      key: source.key || titledLabel,
      title: formatSectionTitle(titledLabel),
      points: directPoints,
    });
  }

  Object.entries(source).forEach(([key, value]) => {
    if (POLICY_META_KEYS.has(key) || POLICY_CONTENT_KEYS.includes(key)) return;

    const nestedSections = extractSectionsFromSource(value, key);
    if (nestedSections.length) {
      sections.push(...nestedSections);
      return;
    }

    const points = extractPointsFromAny(value);
    if (!points.length) return;

    sections.push({
      key,
      title: formatSectionTitle(key),
      points,
    });
  });

  return sections;
};

const shouldUseCheckmark = (label, point) => {
  const text = `${label} ${point}`.toLowerCase();
  const positiveHints = [
    "infant",
    "included",
    "allow",
    "allowed",
    "available",
    "complimentary",
    "free",
    "welcome",
  ];
  const negativeHints = [
    "not allowed",
    "does not",
    "no ",
    "not be",
    "not permitted",
    "prohibited",
    "chargeable",
    "charged",
    "will be charged",
  ];

  return (
    positiveHints.some((keyword) => text.includes(keyword)) &&
    !negativeHints.some((keyword) => text.includes(keyword))
  );
};

const PolicyScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const hotelName = String(route?.params?.hotelName || "Hotel").trim();

  const policySections = useMemo(() => {
    const groupedSections = new Map();
    const appendSection = (section, index = 0) => {
      const title = formatSectionTitle(section?.title || section?.label || "");
      const points = extractPointsFromAny(section?.points || section?.value);
      if (!title || !points.length) return;

      const existingSection = groupedSections.get(title) || {
        key: section?.key || `${title}-${index}`,
        title,
        points: [],
      };
      const seenPoints = new Set(
        existingSection.points.map((point) =>
          normalizeText(point).toLowerCase(),
        ),
      );

      points.forEach((point) => {
        const normalizedPoint = normalizeText(point).toLowerCase();
        if (!normalizedPoint || seenPoints.has(normalizedPoint)) return;
        seenPoints.add(normalizedPoint);
        existingSection.points.push(point);
      });

      groupedSections.set(title, existingSection);
    };

    const incomingItems = Array.isArray(route?.params?.policyItems)
      ? route.params.policyItems
      : [];
    incomingItems.forEach((item, index) => {
      appendSection(
        {
          key: item?.key,
          title: item?.label,
          value: item?.value,
        },
        index,
      );
    });

    const sourceSections = extractSectionsFromSource(
      route?.params?.policySource,
    );
    sourceSections.forEach((section, index) => appendSection(section, index));

    return Array.from(groupedSections.values()).filter(
      (section) => section.points.length > 0,
    );
  }, [route?.params?.policyItems, route?.params?.policySource]);

  return (
    <SafeAreaView className="flex-1" edges={["left", "right", "bottom"]}>
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/40"
          onPress={() => navigation.goBack()}
        />

        <View
          className="bg-[#f2f2f2] rounded-t-[28px] overflow-hidden"
          style={{
            maxHeight: "88%",
            paddingBottom: Math.max(insets.bottom, 14),
          }}
        >
          <View className="items-center pt-3 pb-1.5">
            <View className="w-11 h-1.5 rounded-full bg-slate-300" />
          </View>

          <View className="px-4 pt-2 pb-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-[17px] font-black text-slate-900">
                All Policies
              </Text>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="w-9 h-9 items-center justify-center"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={28} color="#111827" />
              </TouchableOpacity>
            </View>
            {!!hotelName && (
              <Text
                numberOfLines={1}
                className="text-[12px] font-medium text-slate-500 mt-1"
              >
                {hotelName}
              </Text>
            )}
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingTop: 6,
              paddingBottom: 14,
            }}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {policySections.length === 0 ? (
              <View className="px-4 pt-3">
                <Text className="text-[13px] leading-5 text-slate-500">
                  Detailed policy information for {hotelName} is not available
                  yet.
                </Text>
              </View>
            ) : (
              policySections.map((item, idx) => (
                <View
                  key={`${item.key || "policy"}-${idx}`}
                  className={idx === 0 ? "px-4 pt-2" : "px-4 pt-6"}
                >
                  <Text className="text-[15px] font-black text-slate-900">
                    {item.title}
                  </Text>

                  <View className="mt-3" style={{ gap: 10 }}>
                    {item.points.map((point, pointIdx) => {
                      const useCheckmark = shouldUseCheckmark(
                        item.title,
                        point,
                      );
                      return (
                        <View
                          key={`${item.key || "policy"}-point-${pointIdx}`}
                          className="flex-row items-start"
                        >
                          <View className="w-4 items-center pt-[6px]">
                            {useCheckmark ? (
                              <Ionicons
                                name="checkmark"
                                size={15}
                                color="#0f9b8e"
                              />
                            ) : (
                              <View className="w-[6px] h-[6px] rounded-full bg-slate-500" />
                            )}
                          </View>
                          <Text className="flex-1 ml-2.5 text-[13px] leading-5 text-slate-500">
                            {point}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PolicyScreen;
