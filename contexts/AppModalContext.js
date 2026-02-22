import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const MODAL_THEMES = {
  info: {
    icon: "information-circle",
    accent: "#0d3b8f",
    softBg: "#e8f1ff",
    softText: "#0d3b8f",
  },
  success: {
    icon: "checkmark-circle",
    accent: "#15803d",
    softBg: "#e8f7ee",
    softText: "#15803d",
  },
  error: {
    icon: "close-circle",
    accent: "#dc2626",
    softBg: "#fef2f2",
    softText: "#dc2626",
  },
  warning: {
    icon: "alert-circle",
    accent: "#b45309",
    softBg: "#fffbeb",
    softText: "#b45309",
  },
};

const DEFAULT_MODAL_STATE = {
  visible: false,
  type: "info",
  title: "Info",
  message: "",
  primaryText: "OK",
  secondaryText: "",
  dismissible: true,
  onPrimary: null,
  onSecondary: null,
};

const AppModalContext = createContext(null);

const getModalState = (config = {}) => ({
  ...DEFAULT_MODAL_STATE,
  visible: true,
  ...config,
});

export function AppModalProvider({ children }) {
  const [modal, setModal] = useState(DEFAULT_MODAL_STATE);

  const closeModal = useCallback(() => {
    setModal((prev) => ({ ...prev, visible: false }));
  }, []);

  const openModal = useCallback((config = {}) => {
    setModal(getModalState(config));
  }, []);

  const runAfterClose = useCallback((fn) => {
    if (typeof fn !== "function") return;
    setTimeout(() => {
      fn();
    }, 140);
  }, []);

  const handlePrimary = useCallback(() => {
    const callback = modal?.onPrimary;
    closeModal();
    runAfterClose(callback);
  }, [modal, closeModal, runAfterClose]);

  const handleSecondary = useCallback(() => {
    const callback = modal?.onSecondary;
    closeModal();
    runAfterClose(callback);
  }, [modal, closeModal, runAfterClose]);

  const value = useMemo(
    () => ({
      openModal,
      closeModal,
      showInfo: (title, message, options = {}) =>
        openModal({
          type: "info",
          title,
          message,
          ...options,
        }),
      showSuccess: (title, message, options = {}) =>
        openModal({
          type: "success",
          title,
          message,
          ...options,
        }),
      showError: (title, message, options = {}) =>
        openModal({
          type: "error",
          title,
          message,
          ...options,
        }),
      showWarning: (title, message, options = {}) =>
        openModal({
          type: "warning",
          title,
          message,
          ...options,
        }),
      showConfirm: (title, message, options = {}) =>
        openModal({
          type: "warning",
          title,
          message,
          primaryText: "Confirm",
          secondaryText: "Cancel",
          ...options,
        }),
    }),
    [closeModal, openModal]
  );

  const theme = MODAL_THEMES[modal?.type] || MODAL_THEMES.info;

  return (
    <AppModalContext.Provider value={value}>
      {children}

      <Modal
        transparent
        animationType="fade"
        visible={modal.visible}
        onRequestClose={() => {
          if (modal.dismissible) closeModal();
        }}
      >
        <View className="flex-1 bg-black/45 px-5 items-center justify-center">
          <View className="w-full max-w-[360px] rounded-3xl bg-white border border-slate-200 overflow-hidden">
            <View className="px-5 pt-4 pb-3.5" style={{ backgroundColor: theme.softBg }}>
              <View className="flex-row items-center">
                <View
                  className="h-11 w-11 rounded-full items-center justify-center"
                  style={{ backgroundColor: "#ffffff" }}
                >
                  <Ionicons name={theme.icon} size={26} color={theme.accent} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-[17px] font-black text-slate-900">{modal.title || "Info"}</Text>
                  <Text className="text-[11px] font-semibold mt-0.5" style={{ color: theme.softText }}>
                    HRS Notification
                  </Text>
                </View>
              </View>
            </View>

            <View className="px-5 pt-4 pb-5">
              <Text className="text-[14px] leading-5 font-semibold text-slate-600">
                {modal.message || "Please check the details and try again."}
              </Text>

              <View className="flex-row justify-end mt-5">
                {!!modal.secondaryText && (
                  <TouchableOpacity
                    onPress={handleSecondary}
                    className="h-11 px-4 rounded-xl bg-slate-100 items-center justify-center mr-2"
                    activeOpacity={0.85}
                  >
                    <Text className="text-[13px] font-black text-slate-600">{modal.secondaryText}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handlePrimary}
                  className="h-11 px-5 rounded-xl items-center justify-center"
                  style={{ backgroundColor: theme.accent }}
                  activeOpacity={0.85}
                >
                  <Text className="text-[13px] font-black text-white">{modal.primaryText || "OK"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </AppModalContext.Provider>
  );
}

export const useAppModal = () => {
  const ctx = useContext(AppModalContext);

  if (ctx) return ctx;

  return {
    openModal: () => {},
    closeModal: () => {},
    showInfo: () => {},
    showSuccess: () => {},
    showError: () => {},
    showWarning: () => {},
    showConfirm: () => {},
  };
};
