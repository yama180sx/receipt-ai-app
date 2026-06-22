import React from 'react';
import { Text, View } from 'react-native';
import { AppSelect, AppTextInput } from '../../../components/ui';
import type { ReceiptDetail, ReceiptItemDetail } from '../../../types/receipt';
import { receiptDetailStyles as styles } from '../styles/receiptDetailStyles';

type CategoryOption = { label: string; value: number };

type Props = {
  isEditing: boolean;
  receipt: ReceiptDetail;
  editData: ReceiptDetail;
  categorySelectOptions: CategoryOption[];
  onCategoryChange: (itemId: number, categoryId: number | null) => void;
  onUpdateItem: (
    index: number,
    key: keyof ReceiptItemDetail,
    value: ReceiptItemDetail[keyof ReceiptItemDetail] | string
  ) => void;
  onUpdateField: (key: keyof ReceiptDetail, value: ReceiptDetail[keyof ReceiptDetail] | string) => void;
};

export const ReceiptDetailItemList: React.FC<Props> = ({
  isEditing,
  receipt,
  editData,
  categorySelectOptions,
  onCategoryChange,
  onUpdateItem,
  onUpdateField,
}) => (
  <View style={styles.itemsSection}>
    <Text style={styles.itemsSectionTitle}>明細・カテゴリ設定</Text>
    {(isEditing ? editData.items : receipt.items)?.map((item: ReceiptItemDetail, idx: number) => (
      <View key={item.id || idx} style={styles.detailItemRow}>
        <View style={styles.detailItemTop}>
          {isEditing ? (
            <AppTextInput
              style={styles.itemNameInput}
              value={item.name}
              onChangeText={(val) => onUpdateItem(idx, 'name', val)}
            />
          ) : (
            <Text style={styles.detailItemName}>{item.name}</Text>
          )}

          <View style={styles.detailPriceContainer}>
            {isEditing ? (
              <View style={styles.editPriceRow}>
                <Text style={styles.currencySymbol}>¥</Text>
                <AppTextInput
                  style={styles.priceInput}
                  value={String(item.price)}
                  keyboardType="decimal-pad"
                  onChangeText={(val) => onUpdateItem(idx, 'price', val)}
                />
                <Text style={styles.multiplier}>×</Text>
                <AppTextInput
                  style={styles.quantityInput}
                  value={String(item.quantity)}
                  keyboardType="decimal-pad"
                  onChangeText={(val) => onUpdateItem(idx, 'quantity', val)}
                />
              </View>
            ) : (
              <>
                <Text style={styles.detailItemPrice}>
                  ¥
                  {Math.round(
                    (parseFloat(String(item.price)) || 0) * (parseFloat(String(item.quantity)) || 0)
                  ).toLocaleString()}
                </Text>
                <Text style={styles.detailItemSub}>
                  （¥{(parseFloat(String(item.price)) || 0).toLocaleString()} ×{' '}
                  {String(parseFloat(String(item.quantity || 0)))}）
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.detailItemBottom}>
          <AppSelect<number | null>
            selectedValue={item.categoryId ?? null}
            onValueChange={(val) =>
              isEditing ? onUpdateItem(idx, 'categoryId', val) : onCategoryChange(item.id, val)
            }
            options={categorySelectOptions}
            placeholder="カテゴリーを選択..."
            style={styles.categorySelect}
          />
        </View>
      </View>
    ))}

    <View style={styles.taxSection}>
      <View style={styles.taxRow}>
        <Text style={styles.taxLabel}>消費税 (外税・加算額)</Text>
        {isEditing ? (
          <View style={styles.editTaxRow}>
            <Text style={styles.currencySymbol}>+ ¥</Text>
            <AppTextInput
              style={styles.taxInput}
              value={String(editData.taxAmount)}
              keyboardType="decimal-pad"
              onChangeText={(val) => onUpdateField('taxAmount', val)}
            />
          </View>
        ) : (
          <Text style={styles.taxValue}>+ ¥{(receipt.taxAmount || 0).toLocaleString()}</Text>
        )}
      </View>
    </View>
  </View>
);
