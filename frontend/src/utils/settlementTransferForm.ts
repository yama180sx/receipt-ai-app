import {
  hasNegativeAmountSign,
  parsePositiveYenAmount,
} from './parsePositiveYenAmount';

export interface TransferFormErrors {
  from?: string;
  to?: string;
  amount?: string;
}

export interface TransferFormInput {
  transferFrom: number | null;
  transferTo: number | null;
  transferAmount: string;
}

export function validateSettlementTransferForm(
  input: TransferFormInput
): TransferFormErrors {
  const errors: TransferFormErrors = {};
  const { transferFrom, transferTo, transferAmount } = input;

  if (!transferFrom) {
    errors.from = '送金元を選択してください';
  }
  if (!transferTo) {
    errors.to = '送金先を選択してください';
  }
  if (!transferAmount.trim()) {
    errors.amount = '金額を入力してください';
  } else if (transferFrom && transferTo && transferFrom === transferTo) {
    errors.to = '送金先は送金元と異なるメンバーを選んでください';
  } else if (hasNegativeAmountSign(transferAmount)) {
    errors.amount = '金額は0より大きい値を入力してください';
  } else if (parsePositiveYenAmount(transferAmount) === null) {
    errors.amount = '正しい金額を入力してください';
  }

  return errors;
}

export function isTransferFormValid(errors: TransferFormErrors): boolean {
  return Object.keys(errors).length === 0;
}
