import React from 'react';
import { Modal, Text, View } from 'react-native';
import { modalStyles } from '../../theme/modalStyles';

export interface AppModalProps {
  visible: boolean;
  onRequestClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

/** 中央ダイアログ型モーダル（送金記録等） */
export const AppModal: React.FC<AppModalProps> = ({
  visible,
  onRequestClose,
  title,
  description,
  children,
  footer,
}) => (
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
