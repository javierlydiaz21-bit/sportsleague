import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

/** Hoja inferior modal (registro de eventos, cierre del acta, confirmaciones). */
export function Sheet({
  visible,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          {children ? (
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : null}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(23,23,28,0.45)' },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    maxHeight: '88%',
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.lg + 4,
    borderTopRightRadius: Radius.lg + 4,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.lineStrong,
    marginBottom: Spacing.md,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  description: { fontSize: 14, color: Colors.muted, marginTop: 4 },
  body: { marginTop: Spacing.md, flexGrow: 0 },
  bodyContent: { gap: Spacing.md, paddingBottom: Spacing.sm },
  footer: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
});
