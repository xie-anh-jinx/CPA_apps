/**
 * CPA Platform — Mobile PADI AI Chat Assistant
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Header } from "../../components/common/Header";
import { useThemeStore } from "../../stores/useThemeStore";
import { aiChatService } from "../../services/aiChatService";
import { colors } from "../../theme";
import { Send, Sparkles, Bot, User, Paperclip } from "lucide-react-native";
import { ChatMessage } from "@shared/types";
import * as ImagePicker from "expo-image-picker";

export default function AIChatScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      role: "assistant",
      content:
        "Halo! Saya PADI AI Assistant untuk CPA Analytics. Tanyakan apa saja tentang stok gudang, status pengiriman DO, performa penjualan, atau analisis piutang customer.",
      timestamp: new Date().toLocaleTimeString("id", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const flatListRef = useRef<FlatList>(null);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `${Date.now()}-u`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("id", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await aiChatService.sendMessage({
        messages: history,
        context: { platform: "mobile", screen: "ai_chat" },
      });

      const assistantMsg: ChatMessage = {
        id: `${Date.now()}-a`,
        role: "assistant",
        content: res.content,
        timestamp: new Date().toLocaleTimeString("id", { hour: "2-digit", minute: "2-digit" }),
        toolCalls: res.tool_calls,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errReply: ChatMessage = {
        id: `${Date.now()}-err`,
        role: "assistant",
        content: "Maaf, terjadi gangguan koneksi ke server AI. Silakan coba kembali.",
        timestamp: new Date().toLocaleTimeString("id", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errReply]);
    } finally {
      setLoading(false);
    }
  };

  const handlePickAttachment = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) {
      setInput((prev) => `${prev} [Lampiran Foto: ${res.assets[0].fileName || "Gambar"}]`);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Header title="PADI AI Assistant" subtitle="Analitik Cerdas & Integrasi MCP" />

      {/* Quick Prompts */}
      <View style={styles.quickPromptsWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            "Berapa total stok barang kritis?",
            "Cek status DO 244/DO/CPA/X/2026",
            "Siapa customer dengan piutang tertinggi?",
            "Ringkasan omzet bulan ini",
          ]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSend(item)}
              style={[styles.quickPill, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Sparkles size={12} color="#0ea5e9" />
              <Text style={[styles.quickPillText, { color: theme.textSecondary }]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isUser = item.role === "user";
          return (
            <View
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowAssistant,
              ]}
            >
              {!isUser && (
                <View style={[styles.avatar, { backgroundColor: "rgba(14, 165, 233, 0.15)" }]}>
                  <Bot size={16} color="#0ea5e9" />
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isUser
                    ? [styles.bubbleUser, { backgroundColor: "#0ea5e9" }]
                    : [styles.bubbleAssistant, { backgroundColor: theme.surface, borderColor: theme.border }],
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    { color: isUser ? "#ffffff" : theme.textPrimary },
                  ]}
                >
                  {item.content}
                </Text>
                <Text
                  style={[
                    styles.timeText,
                    { color: isUser ? "rgba(255,255,255,0.7)" : theme.textMuted },
                  ]}
                >
                  {item.timestamp}
                </Text>
              </View>

              {isUser && (
                <View style={[styles.avatar, { backgroundColor: theme.card }]}>
                  <User size={16} color={theme.textSecondary} />
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Input Bar */}
      <View style={[styles.inputBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity onPress={handlePickAttachment} style={styles.attachBtn}>
          <Paperclip size={20} color={theme.textMuted} />
        </TouchableOpacity>

        <TextInput
          style={[styles.textInput, { color: theme.textPrimary, backgroundColor: theme.card, borderColor: theme.border }]}
          placeholder="Tanyakan ke PADI AI..."
          placeholderTextColor={theme.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => handleSend()}
        />

        <TouchableOpacity
          onPress={() => handleSend()}
          disabled={loading || !input.trim()}
          style={[
            styles.sendBtn,
            { backgroundColor: input.trim() && !loading ? "#0ea5e9" : "rgba(148, 163, 184, 0.3)" },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  quickPromptsWrap: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  quickPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  quickPillText: {
    fontSize: 12,
  },
  messageList: {
    padding: 16,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 8,
    alignItems: "flex-end",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAssistant: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 14,
  },
  bubbleUser: {
    borderBottomRightRadius: 2,
  },
  bubbleAssistant: {
    borderWidth: 1,
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  attachBtn: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 40,
    fontSize: 13,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
