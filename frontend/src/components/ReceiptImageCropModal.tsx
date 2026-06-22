import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { AppButton } from './ui';
import { theme } from '../theme';
import { useImageCropSelection } from '../hooks/useImageCropSelection';

type Props = {
  visible: boolean;
  imageUri: string;
  onConfirm: (uri: string) => void;
  onCancel: () => void;
};

/**
 * レシート切り取りモーダル（Issue #94-4 / #101-2）
 */
export function ReceiptImageCropModal({
  visible,
  imageUri,
  onConfirm,
  onCancel,
}: Props) {
  const crop = useImageCropSelection({ visible, imageUri, onConfirm, onCancel });

  if (!visible) return null;

  const content = (
    <View style={[styles.container, Platform.OS === 'web' && styles.webContainer]}>
      <Text style={styles.title}>レシートの範囲を選択</Text>
      <Text style={styles.hint}>ドラッグして切り取る範囲を指定してください</Text>

      <View style={styles.imageArea} onLayout={crop.handleLayout} {...crop.panHandlers}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
          onLoad={crop.handleImageLoad}
        />
        {crop.selection && crop.selection.width > 0 && crop.selection.height > 0 ? (
          <View
            style={[
              styles.selection,
              {
                left: crop.selection.x,
                top: crop.selection.y,
                width: crop.selection.width,
                height: crop.selection.height,
              },
            ]}
            pointerEvents="none"
          />
        ) : null}
      </View>

      <View style={styles.actions}>
        <AppButton title="キャンセル" variant="outline" onPress={crop.handleCancel} />
        <AppButton title="切り取らずに使う" variant="secondary" onPress={crop.handleSkipCrop} />
        <AppButton
          title={crop.processing ? '処理中...' : '切り取って解析'}
          onPress={() => void crop.handleConfirm()}
          disabled={crop.processing}
        />
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return content;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={crop.handleCancel}>
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
