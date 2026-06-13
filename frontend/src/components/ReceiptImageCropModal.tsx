import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  PanResponder,
  Platform,
  type LayoutChangeEvent,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { AppButton } from './ui';
import { theme } from '../theme';
import { registerWebImageFile, uriToWebImageFile } from '../utils/webImageFileRegistry';
import {
  computeContainedLayout,
  cropImageUriWeb,
  loadImageDimensions,
  mapSelectionToCrop,
} from '../utils/cropImageWeb';

type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };

type Props = {
  visible: boolean;
  imageUri: string;
  onConfirm: (uri: string) => void;
  onCancel: () => void;
};

function normalizeRect(start: Point, end: Point): Rect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return { x, y, width, height };
}

/**
 * Web 向けレシート切り取りモーダル（Issue #94-4）
 */
export function ReceiptImageCropModal({
  visible,
  imageUri,
  onConfirm,
  onCancel,
}: Props) {
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [selection, setSelection] = useState<Rect | null>(null);
  const [processing, setProcessing] = useState(false);
  const dragStart = useRef<Point | null>(null);

  useEffect(() => {
    setSelection(null);
    dragStart.current = null;
    setDisplaySize({ width: 0, height: 0 });
    setNaturalSize({ width: 0, height: 0 });
  }, [imageUri, visible]);

  const resetState = useCallback(() => {
    setSelection(null);
    dragStart.current = null;
    setProcessing(false);
  }, []);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDisplaySize({ width, height });
  };

  const handleImageLoad = (e: { nativeEvent: { source: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.source;
    setNaturalSize({ width, height });
  };

  const updateSelection = (start: Point, current: Point) => {
    setSelection(normalizeRect(start, current));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        dragStart.current = { x: locationX, y: locationY };
        setSelection({ x: locationX, y: locationY, width: 0, height: 0 });
      },
      onPanResponderMove: (evt: GestureResponderEvent, _gs: PanResponderGestureState) => {
        if (!dragStart.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        updateSelection(dragStart.current, { x: locationX, y: locationY });
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        if (!dragStart.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        updateSelection(dragStart.current, { x: locationX, y: locationY });
        dragStart.current = null;
      },
    })
  ).current;

  const getNaturalSize = async (): Promise<{ width: number; height: number }> => {
    if (naturalSize.width > 0 && naturalSize.height > 0) {
      return naturalSize;
    }
    if (Platform.OS === 'web') {
      return loadImageDimensions(imageUri);
    }
    return new Promise((resolve, reject) => {
      Image.getSize(
        imageUri,
        (width, height) => resolve({ width, height }),
        reject
      );
    });
  };

  const cropSelectedRegion = async (): Promise<string | null> => {
    if (!selection || selection.width < 8 || selection.height < 8) return null;
    if (!displaySize.width || !displaySize.height) return null;

    const natural = await getNaturalSize();
    const layout = computeContainedLayout(
      displaySize.width,
      displaySize.height,
      natural.width,
      natural.height
    );
    const crop = mapSelectionToCrop(selection, layout, natural.width, natural.height);
    if (!crop) return null;

    if (Platform.OS === 'web') {
      return cropImageUriWeb(imageUri, crop);
    }

    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ crop }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  };

  const finishConfirm = async (uri: string) => {
    if (Platform.OS === 'web') {
      try {
        const file = await uriToWebImageFile(uri, 'receipt_cropped.jpg');
        registerWebImageFile(uri, file);
      } catch (e) {
        console.error('[Crop] web file register failed', e);
      }
    }
    onConfirm(uri);
  };

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      const croppedUri = await cropSelectedRegion();
      await finishConfirm(croppedUri ?? imageUri);
    } catch (e) {
      console.error('[Crop] failed', e);
      await finishConfirm(imageUri);
    } finally {
      setProcessing(false);
    }
  };

  const handleSkipCrop = () => {
    resetState();
    void finishConfirm(imageUri);
  };

  const handleCancel = () => {
    resetState();
    onCancel();
  };

  if (!visible) return null;

  const content = (
    <View style={[styles.container, Platform.OS === 'web' && styles.webContainer]}>
      <Text style={styles.title}>レシートの範囲を選択</Text>
      <Text style={styles.hint}>ドラッグして切り取る範囲を指定してください</Text>

      <View style={styles.imageArea} onLayout={handleLayout} {...panResponder.panHandlers}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
          onLoad={handleImageLoad}
        />
        {selection && selection.width > 0 && selection.height > 0 ? (
          <View
            style={[
              styles.selection,
              {
                left: selection.x,
                top: selection.y,
                width: selection.width,
                height: selection.height,
              },
            ]}
            pointerEvents="none"
          />
        ) : null}
      </View>

      <View style={styles.actions}>
        <AppButton title="キャンセル" variant="outline" onPress={handleCancel} />
        <AppButton title="切り取らずに使う" variant="secondary" onPress={handleSkipCrop} />
        <AppButton
          title={processing ? '処理中...' : '切り取って解析'}
          onPress={() => void handleConfirm()}
          disabled={processing}
        />
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return content;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleCancel}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  } as object,
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
    paddingTop: 48,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text.main,
    marginBottom: 4,
  },
  hint: {
    fontSize: 14,
    color: theme.colors.text.muted,
    marginBottom: 16,
  },
  imageArea: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  selection: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    justifyContent: 'flex-end',
  },
});
