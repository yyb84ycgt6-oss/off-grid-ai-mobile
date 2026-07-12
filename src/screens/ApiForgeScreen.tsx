import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getForge } from '@/lib/apiForge/forgeService';
import { useTheme } from '@/theme';

/**
 * API Forge screen — initialises the forge singleton and exposes entity
 * management + live invocation on mobile.
 */

async function defaultChat(messages: { role: string; content: string }[]): Promise<{ content: string }> {
  // Mobile fallback: logs to console, returns ok. Production would route through
  // a native module or edge function. For now, query operations that don't route through
  // chat (bot script CRUD) work offline; mini-AI operations fail gracefully with fallback.
  console.log('[ApiForge] Chat called with', messages.length, 'messages');
  return { content: JSON.stringify({ ok: true, result: [] }) };
}

export default function ApiForgeScreen() {
  const { colors } = useTheme();
  const [forge, setForge] = useState<ReturnType<typeof getForge> | null>(null);
  const [state, setState] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const f = getForge({ chat: defaultChat });
    setForge(f);
    const unsubscribe = f.store.subscribe((s) => setState(s));
    return () => unsubscribe();
  }, []);

  const handleForge = async (entityName: string) => {
    if (!forge || busy) return;
    setBusy(true);
    try {
      await forge.forge(entityName);
    } catch (err) {
      console.error('[ApiForge] forge error:', err);
    } finally {
      setBusy(false);
    }
  };

  if (!forge || !state) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const entities = state.entities || [];
  const gaps = state.gaps || [];
  const artifacts = state.artifacts || {};

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>API Forge</Text>

      {/* Entities */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Entities ({entities.length})</Text>
      {entities.map((e: any) => (
        <View
          key={e.name}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>{e.name}</Text>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {e.fields.length} fields
          </Text>
          {!artifacts[e.name] && (
            <TouchableOpacity
              onPress={() => handleForge(e.name)}
              disabled={busy}
              style={[
                styles.button,
                {
                  backgroundColor: colors.primary,
                  opacity: busy ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>
                {busy ? 'Generating…' : 'Generate API'}
              </Text>
            </TouchableOpacity>
          )}
          {artifacts[e.name] && (
            <View style={[styles.badge, { backgroundColor: colors.success }]}>
              <Text style={[styles.badgeText, { color: colors.background }]}>✓ Generated</Text>
            </View>
          )}
        </View>
      ))}

      {/* Gaps */}
      {gaps.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Gaps ({gaps.length})</Text>
          {gaps.map((gap: any, idx: number) => (
            <View
              key={idx}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>{gap.entity}</Text>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                Missing: {gap.missingOperations.join(', ')}
              </Text>
            </View>
          ))}
        </>
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const SPACING = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.sm,
  },
  cardMeta: {
    fontSize: 12,
    marginBottom: SPACING.md,
  },
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  spacer: {
    height: SPACING.xl,
  },
});
