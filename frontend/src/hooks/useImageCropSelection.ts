import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Platform,
  type LayoutChangeEvent,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { registerWebImageFile, uriToWebImageFile } from '../utils/webImageFileRegistry';
import {
  computeContainedLayout,
  cropImageUriWeb,
  loadImageDimensions,
  mapSelectionToCrop,
} from '../utils/cropImageWeb';

type Point = { x: number; y: number };
export type CropRect = { x: number; y: number; width: number; height: number };

function normalizeRect(start: Point, end: Point): CropRect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return { x, y, width, height };
}

type UseImageCropSelectionOptions = {
  visible: boolean;
  imageUri: string;
  onConfirm: (uri: string) => void;
  onCancel: () => void;
};

export function useImageCropSelection({
  visible,
  imageUri,
  onConfirm,
  onCancel,
}: UseImageCropSelectionOptions) {
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [selection, setSelection] = useState<CropRect | null>(null);
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

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDisplaySize({ width, height });
  }, []);

  const handleImageLoad = useCallback(
    (e: { nativeEvent: { source: { width: number; height: number } } }) => {
      const { width, height } = e.nativeEvent.source;
      setNaturalSize({ width, height });
    },
    []
  );

  const updateSelection = useCallback((start: Point, current: Point) => {
    setSelection(normalizeRect(start, current));
  }, []);

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

  const getNaturalSize = useCallback(async (): Promise<{ width: number; height: number }> => {
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
  }, [imageUri, naturalSize.height, naturalSize.width]);

  const cropSelectedRegion = useCallback(async (): Promise<string | null> => {
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
  }, [displaySize.height, displaySize.width, getNaturalSize, imageUri, selection]);

  const finishConfirm = useCallback(
    async (uri: string) => {
      if (Platform.OS === 'web') {
        try {
          const file = await uriToWebImageFile(uri, 'receipt_cropped.jpg');
          registerWebImageFile(uri, file);
        } catch (e) {
          console.error('[Crop] web file register failed', e);
        }
      }
      onConfirm(uri);
    },
    [onConfirm]
  );

  const handleConfirm = useCallback(async () => {
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
  }, [cropSelectedRegion, finishConfirm, imageUri]);

  const handleSkipCrop = useCallback(() => {
    resetState();
    void finishConfirm(imageUri);
  }, [finishConfirm, imageUri, resetState]);

  const handleCancel = useCallback(() => {
    resetState();
    onCancel();
  }, [onCancel, resetState]);

  return {
    selection,
    processing,
    panHandlers: panResponder.panHandlers,
    handleLayout,
    handleImageLoad,
    handleConfirm,
    handleSkipCrop,
    handleCancel,
  };
}
