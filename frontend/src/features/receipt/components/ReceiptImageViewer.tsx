import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

type Props = { source: ImageSourcePropType; style: object };

export function ReceiptImageViewer({ source, style }: Props) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  const close = () => { setOpen(false); setZoom(1); };
  if (failed) return <View style={style}><Text>画像を表示できません</Text></View>;
  return (
    <>
      <Pressable style={style} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="レシート画像を拡大">
        <Image source={source} style={styles.preview} resizeMode="contain" onError={() => setFailed(true)} />
      </Pressable>
      <Modal visible={open} onRequestClose={close} animationType="slide">
        <View style={styles.container}>
          <View style={styles.controls}>
            <Pressable onPress={() => setZoom((value) => Math.max(1, value - 0.5))} accessibilityRole="button"><Text style={styles.button}>縮小</Text></Pressable>
            <Pressable onPress={() => setZoom((value) => Math.min(4, value + 0.5))} accessibilityRole="button"><Text style={styles.button}>拡大</Text></Pressable>
            <Pressable onPress={close} accessibilityRole="button"><Text style={styles.button}>閉じる</Text></Pressable>
          </View>
          <ScrollView horizontal contentContainerStyle={styles.scroll}>
            <ScrollView contentContainerStyle={styles.scroll}>
              <Image source={source} style={{ width: 350 * zoom, height: 900 * zoom }} resizeMode="contain" />
            </ScrollView>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', height: '100%' },
  container: { flex: 1, backgroundColor: '#111' },
  controls: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
  button: { color: '#fff', fontSize: 16, padding: 8 },
  scroll: { flexGrow: 1 },
});
