import React from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "../state/cart";
import { tenant } from "../tenant";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Cart">;

export function CartScreen({ navigation }: Props) {
  const { lines, setQty, remove, subtotal } = useCart();
  const insets = useSafeAreaInsets();
  const t = tenant.theme;
  const tax = subtotal * 0.07;
  const total = subtotal + tax;
  const footerPad = Math.max(insets.bottom, 12) + 20;

  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <Text style={[styles.title, { color: t.text }]}>Your cart</Text>
      {lines.length === 0 ? (
        <Text style={{ color: t.muted }}>Cart is empty.</Text>
      ) : (
        <FlatList
          data={lines}
          keyExtractor={(l) => l.menuItemId + (l.specialInstructions ?? "")}
          contentContainerStyle={{ paddingBottom: 16 }}
          style={{ flex: 1 }}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: t.surface }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: "600" }}>{item.name}</Text>
                <Text style={{ color: t.muted }}>
                  ${item.unitPrice.toFixed(2)} × {item.quantity}
                </Text>
              </View>
              <View style={styles.qty}>
                <Pressable onPress={() => setQty(item.menuItemId, item.quantity - 1)}>
                  <Text style={[styles.qtyBtn, { color: t.text }]}>−</Text>
                </Pressable>
                <Text style={{ color: t.text, minWidth: 24, textAlign: "center" }}>
                  {item.quantity}
                </Text>
                <Pressable onPress={() => setQty(item.menuItemId, item.quantity + 1)}>
                  <Text style={[styles.qtyBtn, { color: t.text }]}>+</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => remove(item.menuItemId)}>
                <Text style={{ color: t.primary, marginLeft: 8 }}>Remove</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      <View style={[styles.footer, { paddingBottom: footerPad, backgroundColor: t.background }]}>
        <View style={styles.totals}>
          <Text style={{ color: t.muted }}>Subtotal ${subtotal.toFixed(2)}</Text>
          <Text style={{ color: t.muted }}>Tax ${tax.toFixed(2)}</Text>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: "700" }}>
            Total ${total.toFixed(2)}
          </Text>
        </View>

        <Pressable
          disabled={lines.length === 0}
          style={[
            styles.cta,
            { backgroundColor: lines.length ? t.primary : "#555" },
          ]}
          onPress={() => navigation.navigate("Checkout")}
        >
          <Text style={styles.ctaTxt}>Checkout · Pickup</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 16, paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  qty: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { fontSize: 22, paddingHorizontal: 8 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#333",
    paddingTop: 12,
  },
  totals: { gap: 4, marginBottom: 12 },
  cta: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
