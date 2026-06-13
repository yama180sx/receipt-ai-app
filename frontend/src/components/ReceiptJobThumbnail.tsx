import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { useReceiptImageSource } from '../utils/receiptImageSource';

type Props = {
  imagePath: string | null | undefined;
  size?: number;
};

export function ReceiptJobThumbnail({ imagePath, size = 56 }: Props) {
  const source = useReceiptImageSource(imagePath);

  if (!imagePath) {
    return (
      <View style={[styles.placeholder, { width: size, height: size }]}>
        <Text style={styles.placeholderEmoji}>📄</Text>
      </View>
    );
  }

  if (!source) {
    return (
      <View style={[styles.placeholder, { width: size, height: size }]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={[styles.image, { width: size, height: size }]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.semantic.neutral.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: { fontSize: 22 },
  image: {
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.semantic.neutral.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
