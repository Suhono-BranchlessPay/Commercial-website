import React from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { pickupAddressLine, tenant } from "../tenant";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Confirmation">;

export function ConfirmationScreen({ route, navigation }: Props) {
  const { orderId, total, bpExplorerUrl, bpAnchorStatus, chainTxHash } = route.params;
  const t = tenant.theme;

  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <Text style={[styles.title, { color: t.text }]}>Order confirmed</Text>
      <Text style={{ color: t.muted }}>
        Pickup at {tenant.appName} ({tenant.locationLabel})
      </Text>
      <Text style={{ color: t.muted, marginTop: 4 }}>{pickupAddressLine()}</Text>
      <Text style={[styles.id, { color: t.accent }]}>#{orderId.slice(0, 8).toUpperCase()}</Text>
      <Text style={{ color: t.text, fontSize: 18, marginTop: 8 }}>
        Total ${total.toFixed(2)}
      </Text>

      {(bpAnchorStatus || bpExplorerUrl || chainTxHash) && (
        <View style={[styles.badge, { borderColor: t.accent }]}>
          <Text style={{ color: t.text, fontWeight: "600" }}>
            Verified & permanently recorded
          </Text>
          {bpAnchorStatus ? (
            <Text style={{ color: t.muted, marginTop: 6 }}>Status: {bpAnchorStatus}</Text>
          ) : null}
          {chainTxHash ? (
            <Text style={{ color: t.muted, marginTop: 6, fontSize: 12 }} selectable>
              chain_tx_hash: {chainTxHash}
            </Text>
          ) : null}
          {bpExplorerUrl ? (
            <Pressable onPress={() => Linking.openURL(bpExplorerUrl)}>
              <Text style={{ color: t.primary, marginTop: 6 }}>View on explorer →</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <Pressable
        style={[styles.cta, { backgroundColor: t.primary }]}
        onPress={() => navigation.popToTop()}
      >
        <Text style={styles.ctaTxt}>Back to menu</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 80, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: "700" },
  id: { fontSize: 20, fontWeight: "700", marginTop: 16 },
  badge: {
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  cta: {
    marginTop: 32,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaTxt: { color: "#fff", fontWeight: "700" },
});
