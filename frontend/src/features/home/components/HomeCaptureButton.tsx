import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { homeScreenStyles } from '../styles/homeScreenStyles';

type Props = {
  acceptanceMessage: string | null;
  uploadingCount: number;
  pendingBadgeCount: number;
  trayItemCount: number;
  onPress: () => void;
};

export const HomeCaptureButton: React.FC<Props> = ({
  acceptanceMessage,
  uploadingCount,
  pendingBadgeCount,
  trayItemCount,
  onPress,
}) => (
  <>
    {acceptanceMessage ? (
      <View style={homeScreenStyles.acceptanceBanner}>
        <Text style={homeScreenStyles.acceptanceBannerText}>{acceptanceMessage}</Text>
      </View>
    ) : null}

    <TouchableOpacity style={homeScreenStyles.captureButton} activeOpacity={0.8} onPress={onPress}>
      <View style={homeScreenStyles.iconCircle}>
        {uploadingCount > 0 ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ fontSize: 20 }}>📷</Text>
        )}
      </View>
      <View style={homeScreenStyles.captureButtonBody}>
        <Text style={homeScreenStyles.captureButtonText}>レシートを撮影・解析</Text>
        {pendingBadgeCount > 0 ? (
          <Text style={homeScreenStyles.captureSubText}>
            解析中 {pendingBadgeCount} 件 — 続けて撮影できます
          </Text>
        ) : null}
      </View>
      {trayItemCount > 0 ? (
        <View style={homeScreenStyles.captureCountBadge}>
          <Text style={homeScreenStyles.captureCountBadgeText}>{trayItemCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  </>
);
