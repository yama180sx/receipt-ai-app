import React from 'react';
import { Text, View } from 'react-native';
import {
  AppButton,
  AppFormField,
  AppModal,
  AppSelect,
  AppTextInput,
  modalStyles,
} from '../../../components/ui';
import { BUTTON_LABELS } from '../../../constants/buttonLabels';
import { hasNegativeAmountSign } from '../../../utils/parsePositiveYenAmount';
import type { TransferFormErrors } from '../utils/settlementTransferForm';

interface MemberOption {
  label: string;
  value: number;
}

interface SettlementTransferModalProps {
  visible: boolean;
  memberSelectOptions: MemberOption[];
  transferFrom: number | null;
  transferTo: number | null;
  transferAmount: string;
  transferFieldErrors: TransferFormErrors;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onTransferFromChange: (value: number | null) => void;
  onTransferToChange: (value: number | null) => void;
  onTransferAmountChange: (value: string) => void;
  onClearFieldError: (field: keyof TransferFormErrors) => void;
}

export const SettlementTransferModal: React.FC<SettlementTransferModalProps> = ({
  visible,
  memberSelectOptions,
  transferFrom,
  transferTo,
  transferAmount,
  transferFieldErrors,
  isSubmitting,
  onClose,
  onSubmit,
  onTransferFromChange,
  onTransferToChange,
  onTransferAmountChange,
  onClearFieldError,
}) => (
  <AppModal
    visible={visible}
    onRequestClose={onClose}
    title="送金・受取の記録"
    description="実際に現金やPayPay等で精算した金額を記録します。"
    footer={
      <>
        <AppButton
          title={BUTTON_LABELS.cancel}
          onPress={onClose}
          variant="secondary"
          size="md"
        />
        <AppButton
          title={BUTTON_LABELS.save}
          onPress={onSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
          size="md"
          style={modalStyles.footerPrimaryButton}
        />
      </>
    }
  >
    <AppFormField label="送金元 (払った人)" error={transferFieldErrors.from}>
      <AppSelect<number | null>
        selectedValue={transferFrom}
        onValueChange={(v) => {
          onTransferFromChange(v);
          if (transferFieldErrors.from) onClearFieldError('from');
        }}
        options={memberSelectOptions}
        error={Boolean(transferFieldErrors.from)}
      />
    </AppFormField>

    <AppFormField label="送金先 (受け取った人)" error={transferFieldErrors.to}>
      <AppSelect<number | null>
        selectedValue={transferTo}
        onValueChange={(v) => {
          onTransferToChange(v);
          if (transferFieldErrors.to) onClearFieldError('to');
        }}
        options={memberSelectOptions}
        error={Boolean(transferFieldErrors.to)}
      />
    </AppFormField>

    <AppFormField label="送金額" error={transferFieldErrors.amount}>
      <View
        style={[
          modalStyles.inputWithUnit,
          transferFieldErrors.amount && modalStyles.selectWrapperError,
        ]}
      >
        <AppTextInput
          variant="inline"
          value={transferAmount}
          onChangeText={(v) => {
            if (hasNegativeAmountSign(v)) {
              return;
            }
            onTransferAmountChange(v.replace(/[^0-9]/g, ''));
            if (transferFieldErrors.amount) onClearFieldError('amount');
          }}
          keyboardType="number-pad"
          placeholder="例: 5000"
          error={Boolean(transferFieldErrors.amount)}
        />
        <Text style={modalStyles.unitSuffix}>円</Text>
      </View>
    </AppFormField>
  </AppModal>
);
