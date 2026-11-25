import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import type { DuplicateCandidate } from '../../../api/generated';
import { useReceiptImageSource } from '../../../utils/receiptImageSource';
import { ReceiptImageViewer } from './ReceiptImageViewer';

type Props = { candidates: DuplicateCandidate[]; currentImage: ImageSourcePropType | null; currentStore: string; currentDate: string; currentTotal: number; onClose: () => void; onConfirm: () => void };

function CandidateImage({ path }: { path: string | null }) {
  const source = useReceiptImageSource(path);
  return source ? <ReceiptImageViewer source={source} style={styles.image} /> : <Text>画像を表示できません</Text>;
}

export function DuplicateReceiptReview({ candidates, currentImage, currentStore, currentDate, currentTotal, onClose, onConfirm }: Props) {
  const [index, setIndex] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [seen, setSeen] = useState<number[]>([]);
  const scroll = useRef<React.ElementRef<typeof ScrollView>>(null);
  const candidate = candidates[index];
  if (!candidate) return null;
  const reviewed = Array.from(new Set([...seen, candidate.id]));
  return (
    <Modal visible onRequestClose={onClose} animationType="slide">
      <View style={styles.page}>
        <Text style={styles.title}>登録済みのレシートと比べる</Text>
        <Text>候補 {index + 1} / {candidates.length}　{candidate.storeName}　{candidate.totalAmount}円</Text>
        <Text>登録日時: {new Date(candidate.date).toLocaleString()}</Text>
        <Text>今回: {currentStore}　{currentDate}　{currentTotal}円</Text>
        <View style={styles.row}>
          <Pressable onPress={() => scroll.current?.scrollTo({ y: 0, animated: true })}><Text style={styles.action}>前の画像へ</Text></Pressable>
          <Pressable onPress={() => scroll.current?.scrollTo({ y: currentY, animated: true })}><Text style={styles.action}>今回の画像へ</Text></Pressable>
        </View>
        <ScrollView ref={scroll}>
          <Text>前のレシート（タップで拡大）</Text>
          <CandidateImage key={candidate.id} path={candidate.imagePath} />
          <View onLayout={(event) => setCurrentY(event.nativeEvent.layout.y)}>
            <Text>今回のレシート（タップで拡大）</Text>
            {currentImage ? <ReceiptImageViewer source={currentImage} style={styles.image} /> : <Text>画像を表示できません</Text>}
          </View>
        </ScrollView>
        <View style={styles.row}>
          <Pressable onPress={onClose}><Text style={styles.action}>登録せず戻る</Text></Pressable>
          {index > 0 && <Pressable onPress={() => { setSeen(reviewed); setIndex(index - 1); }}><Text style={styles.action}>前の候補</Text></Pressable>}
          {index < candidates.length - 1 ? <Pressable onPress={() => { setSeen(reviewed); setIndex(index + 1); }}><Text style={styles.action}>次の候補</Text></Pressable> : <Pressable onPress={onConfirm} disabled={reviewed.length !== candidates.length}><Text style={styles.action}>別のレシートとして登録</Text></Pressable>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, backgroundColor: 'white' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  action: { color: '#1765a0', padding: 12 },
  image: { width: '100%', height: 350, backgroundColor: '#eee' },
});
