import React from 'react';
import { Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { modalStyles } from '../../theme/modalStyles';
import { AppModalCloseButton } from './AppModalCloseButton';

export type AppModalVariant = 'dialog' | 'sheet';

/** sheet: fullscreen = モバイル全画面 / wide = 大画面中央カード */
export type AppModalSheetPresentation = 'fullscreen' | 'wide';

export interface AppModalProps {
  visible: boolean;
  onRequestClose: () => void;
  variant?: AppModalVariant;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  sheetPresentation?: AppModalSheetPresentation;
}

const SheetHeader: React.FC<{ title: string; onClose: () => void }> = ({ title, onClose }) => (
  <View style={modalStyles.sheetHeader}>
    <Text style={modalStyles.sheetHeaderTitle} numberOfLines={1}>
      {title}
    </Text>
    <AppModalCloseButton onPress={onClose} />
  </View>
);

/** dialog: 中央ダイアログ（送金記録等） / sheet: レシート詳細等 */
export const AppModal: React.FC<AppModalProps> = ({
  visible,
  onRequestClose,
  variant = 'dialog',
  title,
  description,
  children,
  footer,
  sheetPresentation = 'fullscreen',
}) => {
  if (variant === 'dialog') {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onRequestClose}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.dialog}>
            <Text style={modalStyles.title}>{title}</Text>
            {description ? (
              <Text style={modalStyles.description}>{description}</Text>
            ) : null}
            {children}
            {footer ? <View style={modalStyles.footer}>{footer}</View> : null}
          </View>
        </View>
      </Modal>
    );
  }

  const isWideSheet = sheetPresentation === 'wide';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={isWideSheet}
      onRequestClose={onRequestClose}
    >
      {isWideSheet ? (
        <View style={modalStyles.sheetOverlay}>
          <SafeAreaView style={modalStyles.sheetWide}>
            <SheetHeader title={title} onClose={onRequestClose} />
            <View style={modalStyles.sheetBody}>{children}</View>
          </SafeAreaView>
        </View>
      ) : (
        <SafeAreaView style={modalStyles.sheetContainer}>
          <SheetHeader title={title} onClose={onRequestClose} />
          <View style={modalStyles.sheetBody}>{children}</View>
        </SafeAreaView>
      )}
    </Modal>
  );
};
