import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { receiptApi } from '../api';
import { buildReceiptUploadFormData } from '../utils/receiptUploadFormData';
import {
  consumePendingCropUri,
  persistPendingCropUri,
  registerWebImageFile,
  clearPendingCropUri,
} from '../utils/webImageFileRegistry';
import { showAlert } from '../utils/alertMessage';

const ACCEPTANCE_MESSAGE_MS = 3000;

interface UseReceiptUploadOptions {
  currentMemberId: number;
  onUploadAccepted: () => Promise<void>;
  registerLocalUploadFailure: (reason: string) => void;
}

export function useReceiptUpload({
  currentMemberId,
  onUploadAccepted,
  registerLocalUploadFailure,
}: UseReceiptUploadOptions) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const [acceptanceMessage, setAcceptanceMessage] = useState<string | null>(null);
  const [pendingCropUri, setPendingCropUri] = useState<string | null>(null);
  const [showImageSourcePicker, setShowImageSourcePicker] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const restored = consumePendingCropUri();
    if (restored) {
      setPendingCropUri(restored);
    }
  }, []);

  useEffect(() => {
    if (!acceptanceMessage) return;
    const timer = setTimeout(() => setAcceptanceMessage(null), ACCEPTANCE_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [acceptanceMessage]);

  const showAcceptanceFeedback = useCallback((message: string) => {
    setAcceptanceMessage(message);
  }, []);

  const uploadReceiptImage = useCallback(
    async (imageUri: string) => {
      setUploadingCount((count) => count + 1);
      try {
        const formData = await buildReceiptUploadFormData(imageUri, currentMemberId);
        const uploadRes = await receiptApi.uploadReceipt(formData, currentMemberId);

        if (uploadRes.success) {
          showAcceptanceFeedback('受付しました。解析結果は下の一覧に表示されます。');
          await onUploadAccepted();
          return;
        }

        registerLocalUploadFailure('サーバーが受付を拒否しました。');
        showAlert('エラー', 'レシートの受付に失敗しました。');
      } catch (err) {
        console.error('uploadReceiptImage', err);
        const message =
          err instanceof Error ? err.message : '画像のアップロードに失敗しました。';
        registerLocalUploadFailure(message);
        if (Platform.OS === 'web') {
          showAlert('エラー', message);
        } else {
          Alert.alert('エラー', message);
        }
      } finally {
        setUploadingCount((count) => Math.max(0, count - 1));
      }
    },
    [currentMemberId, onUploadAccepted, registerLocalUploadFailure, showAcceptanceFeedback]
  );

  const openWebCrop = useCallback((imageUri: string) => {
    if (Platform.OS === 'web') {
      persistPendingCropUri(imageUri);
    }
    setPendingCropUri(imageUri);
  }, []);

  const pickImageForWeb = useCallback(
    async (source: 'camera' | 'library') => {
      try {
        const picker =
          source === 'camera'
            ? ImagePicker.launchCameraAsync({ mediaTypes: 'images' as const, quality: 0.8 })
            : ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images' as const,
                quality: 0.8,
              });
        const result = await picker;
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        if (Platform.OS === 'web' && asset.file) {
          registerWebImageFile(asset.uri, asset.file);
        }
        openWebCrop(asset.uri);
      } catch (err) {
        console.error('pickImageForWeb', err);
        showAlert('エラー', '画像の取得に失敗しました。ギャラリーから選択をお試しください。');
      }
    },
    [openWebCrop]
  );

  const pickImageNative = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'カメラの使用を許可してください。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images' as const,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await uploadReceiptImage(result.assets[0].uri);
  }, [uploadReceiptImage]);

  const handleScan = useCallback(async () => {
    if (Platform.OS === 'web') {
      setShowImageSourcePicker(true);
      return;
    }

    try {
      await pickImageNative();
    } catch (err) {
      console.error('handleScan Error:', err);
      Alert.alert('エラー', '画像のアップロードに失敗しました。');
    }
  }, [pickImageNative]);

  const handleCropConfirm = useCallback(
    async (croppedUri: string) => {
      clearPendingCropUri();
      setPendingCropUri(null);
      await uploadReceiptImage(croppedUri);
    },
    [uploadReceiptImage]
  );

  const handleCropCancel = useCallback(() => {
    clearPendingCropUri();
    setPendingCropUri(null);
  }, []);

  return {
    uploadingCount,
    acceptanceMessage,
    pendingCropUri,
    showImageSourcePicker,
    setShowImageSourcePicker,
    handleScan,
    pickImageForWeb,
    handleCropConfirm,
    handleCropCancel,
  };
}
