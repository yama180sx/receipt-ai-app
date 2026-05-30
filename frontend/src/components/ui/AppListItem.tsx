import React from 'react';
import {
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { listItemStyles } from '../../theme/tableStyles';

export type AppListItemVariant = 'default' | 'nav';

export interface AppListItemProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
  variant?: AppListItemVariant;
  style?: StyleProp<ViewStyle>;
}

/** カテゴリー色などリスト左端のドット */
export const AppListColorDot: React.FC<{ color: string }> = ({ color }) => (
  <View style={[listItemStyles.colorDot, { backgroundColor: color }]} />
);

export const AppListItem: React.FC<AppListItemProps> = ({
  title,
  subtitle,
  onPress,
  left,
  right,
  children,
  variant = 'default',
  style,
}) => {
  const trailing =
    right ?? (variant === 'nav' ? <Text style={listItemStyles.chevron}>›</Text> : null);

  const content = (
    <>
      {left}
      <View style={listItemStyles.main}>
        <Text style={listItemStyles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={listItemStyles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </View>
      {trailing}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[listItemStyles.row, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[listItemStyles.row, style]}>{content}</View>;
};
