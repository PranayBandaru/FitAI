import { format } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import FoodConfirmCard from "../../components/chat/FoodConfirmCard";
import { supabase } from "../../lib/supabase";
import {
    ParsedFoodItem,
    ResolvedFoodItem,
    resolveNutrition,
} from "../../lib/usda";
import { useFoodLogStore } from "../../stores/foodLogStore";
import { ChatMessage, MealType } from "../../types";

// ─── LLM call (direct API) ───────────────────────────────────────────────────

const LLM_API_URL = process.env.EXPO_PUBLIC_LLM_API_URL ?? "";
const LLM_API_KEY = process.env.EXPO_PUBLIC_LLM_API_KEY ?? "";
const LLM_MODEL = process.env.EXPO_PUBLIC_LLM_MODEL ?? "gpt-oss-120b";

const SYSTEM_PROMPT = `You are FitAI, a personal nutrition assistant.
When a user mentions eating or drinking something, extract EVERY item and respond ONLY with this JSON:
{"mode":"extraction","items":[{"food_name":"<name>","quantity":<number>,"unit":"<unit>"}],"message":"<confirmation>"}
When no food is mentioned, respond with:
{"mode":"conversation","message":"<your response>"}
Always respond with raw JSON only — no markdown fences.`;

async function callLLM(
  sessionHistory: { role: string; content: string }[],
  userMessage: string,
): Promise<any> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...sessionHistory,
    { role: "user", content: userMessage },
  ];

  const res = await fetch(LLM_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({ model: LLM_MODEL, messages, temperature: 0.2 }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM API error ${res.status}: ${errText}`);
  }

  const llmData = await res.json();
  const rawContent: string = llmData.choices?.[0]?.message?.content ?? "";

  // Strip markdown fences if present
  const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawContent.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    return { mode: "conversation", message: rawContent };
  }
}

// ─── LLM fallback for nutrition estimation ────────────────────────────────────

async function llmNutritionFallback(
  item: ParsedFoodItem,
): Promise<ResolvedFoodItem> {
  const prompt = `Estimate the nutritional content of: ${item.quantity} ${item.unit} of ${item.food_name}. Respond ONLY with JSON: {"calories_kcal": <number>, "protein_g": <number>, "carbs_g": <number>, "fat_g": <number>, "fiber_g": <number>}`;
  try {
    const res = await fetch(LLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });
    if (!res.ok) throw new Error(`LLM nutrition error ${res.status}`);
    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? "{}");
    if (typeof parsed.calories_kcal === "number") {
      return {
        ...item,
        fiber_g: 0,
        ...parsed,
        source: "llm_estimate" as const,
      };
    }
  } catch (e) {
    console.warn("[llmFallback] error", e);
  }
  // hard fallback
  return {
    ...item,
    calories_kcal: 100,
    protein_g: 5,
    carbs_g: 10,
    fat_g: 3,
    fiber_g: 1,
    source: "llm_estimate",
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type PendingFood = { items: ResolvedFoodItem[]; messageId: string };

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "0",
      role: "assistant",
      content:
        "Hi! Tell me what you've eaten and I'll log it for you. You can also ask me nutrition questions.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingFood, setPendingFood] = useState<PendingFood | null>(null);
  const [mealType, setMealType] = useState<MealType>("snack");
  const listRef = useRef<FlatList>(null);
  const addFoodLogs = useFoodLogStore((s) => s.addFoodLogs);
  const today = format(new Date(), "yyyy-MM-dd");

  // ── Persist chat session to Supabase ─────────────────────────────────────
  const saveSession = useCallback(
    async (msgs: ChatMessage[]) => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud?.user) return;
      await supabase
        .from("chat_sessions")
        .upsert(
          { user_id: ud.user.id, date: today, messages: msgs },
          { onConflict: "user_id,date" },
        );
    },
    [today],
  );

  useEffect(() => {
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud?.user) return;
      const { data } = await supabase
        .from("chat_sessions")
        .select("messages")
        .eq("user_id", ud.user.id)
        .eq("date", today)
        .single();
      if (data?.messages?.length) {
        setMessages(data.messages as ChatMessage[]);
      }
    })();
  }, [today]);

  const sessionHistory = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const appendMessage = (msg: ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      saveSession(next);
      return next;
    });
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    appendMessage(userMsg);

    try {
      const response = await callLLM(sessionHistory, text);

      if (response.mode === "extraction" && response.items?.length) {
        // Resolve nutrition for each extracted item
        const resolved = await resolveNutrition(
          response.items as ParsedFoodItem[],
          llmNutritionFallback,
        );

        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.message ?? "Here's what I found:",
          timestamp: new Date().toISOString(),
          foodItems: resolved,
        };
        appendMessage(assistantMsg);
        setPendingFood({ items: resolved, messageId: assistantMsg.id });
      } else {
        appendMessage({
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            response.message ?? "Sorry, I had trouble understanding that.",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (e: any) {
      appendMessage({
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${e?.message ?? "Something went wrong. Please try again."}`,
        timestamp: new Date().toISOString(),
      });
    }
    setLoading(false);
  }, [input, loading, sessionHistory]);

  const handleConfirmFood = async (
    items: ResolvedFoodItem[],
    confirmedMealType: MealType,
  ) => {
    await addFoodLogs(
      items,
      confirmedMealType,
      pendingFood?.items.map((i) => i.food_name).join(", ") ?? "",
    );
    const totalCals = items.reduce((s, i) => s + i.calories_kcal, 0);
    appendMessage({
      id: Date.now().toString(),
      role: "assistant",
      content: `✓ Logged ${items.length} item${items.length > 1 ? "s" : ""} (${confirmedMealType}) · ${totalCals} kcal added to today's log.`,
      timestamp: new Date().toISOString(),
    });
    setPendingFood(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.msgList}
          renderItem={({ item: msg }) => (
            <View>
              <View
                style={[
                  styles.bubble,
                  msg.role === "user"
                    ? styles.userBubble
                    : styles.assistantBubble,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    msg.role === "user" && styles.userText,
                  ]}
                >
                  {msg.content}
                </Text>
                <Text style={styles.timestamp}>
                  {format(new Date(msg.timestamp), "HH:mm")}
                </Text>
              </View>
              {/* FoodConfirmCard shown inline below relevant assistant message */}
              {pendingFood?.messageId === msg.id && pendingFood && (
                <FoodConfirmCard
                  items={pendingFood.items}
                  mealType={mealType}
                  onMealTypeChange={setMealType}
                  onConfirm={handleConfirmFood}
                  onCancel={() => {
                    appendMessage({
                      id: Date.now().toString(),
                      role: "assistant",
                      content: "✕ Cancelled — nothing was logged.",
                      timestamp: new Date().toISOString(),
                    });
                    setPendingFood(null);
                  }}
                />
              )}
            </View>
          )}
        />

        {loading && (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color="#4ADE80" />
            <Text style={styles.typingText}>FitAI is thinking…</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="e.g. I had eggs and toast for breakfast…"
            placeholderTextColor="#555"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!input.trim() || loading) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f0f0f" },
  flex: { flex: 1 },
  msgList: { padding: 16, gap: 8, paddingBottom: 20 },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  userBubble: {
    backgroundColor: "#4ADE80",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#1c1c1e",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, color: "#fff", lineHeight: 20 },
  userText: { color: "#0f0f0f" },
  timestamp: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    alignSelf: "flex-end",
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  typingText: { fontSize: 13, color: "#888" },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#1c1c1e",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: "#1c1c1e",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#fff",
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#4ADE80",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#2c2c2e" },
  sendText: { fontSize: 20, fontWeight: "800", color: "#0f0f0f" },
});
