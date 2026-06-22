import React from 'react';
import { View, Text } from 'react-native';
import type { PromptTemplate } from '../../../api';
import { AppButton } from '../../../components/ui';
import { BUTTON_LABELS } from '../../../constants/buttonLabels';
import { cardStyles } from '../../../theme/cardStyles';
import { promptEditorStyles as styles } from '../styles/promptEditorStyles';

type Props = {
  templates: PromptTemplate[];
  onCreate: () => void;
  onEdit: (template: PromptTemplate) => void;
  onActivate: (id: number) => void;
  onDelete: (id: number) => void;
};

export const PromptEditorList: React.FC<Props> = ({
  templates,
  onCreate,
  onEdit,
  onActivate,
  onDelete,
}) => (
  <View>
    <AppButton
      title={`＋ ${BUTTON_LABELS.create}`}
      onPress={onCreate}
      variant="success"
      fullWidth
      style={{ marginBottom: 16 }}
    />

    {templates.map((tpl) => (
      <View
        key={tpl.id}
        style={[cardStyles.listCard, styles.card, tpl.isActive && styles.activeCard]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {tpl.name}{' '}
              <Text style={styles.versionText}>(v{tpl.version})</Text>
            </Text>
          </View>
          {tpl.isActive ? (
            <View style={styles.badgeContainer}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>使用中</Text>
              </View>
            </View>
          ) : null}
        </View>

        {tpl.description ? <Text style={styles.cardDesc}>{tpl.description}</Text> : null}

        <View style={styles.cardActions}>
          {!tpl.isActive ? (
            <AppButton
              title={BUTTON_LABELS.setDefault}
              onPress={() => onActivate(tpl.id)}
              variant="outline"
              size="sm"
            />
          ) : null}
          <AppButton title={BUTTON_LABELS.edit} onPress={() => onEdit(tpl)} size="sm" />
          {!tpl.isActive ? (
            <AppButton
              title={BUTTON_LABELS.delete}
              onPress={() => onDelete(tpl.id)}
              variant="danger"
              size="sm"
            />
          ) : null}
        </View>
      </View>
    ))}
  </View>
);
