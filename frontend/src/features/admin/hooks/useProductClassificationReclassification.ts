import { useCallback, useState } from 'react';
import {
  adminApi,
  type CreateProductClassificationReclassificationRunRequest,
  type ProductClassificationReclassificationRun,
} from '../../../api';
import { showApiErrorAlert } from '../../../utils/apiError';

type ReclassificationStatus = 'unclassified' | 'needs_review';

const DEFAULT_STATUSES: ReclassificationStatus[] = ['unclassified', 'needs_review'];

export function useProductClassificationReclassification() {
  const [statuses, setStatuses] = useState<ReclassificationStatus[]>(DEFAULT_STATUSES);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState('100');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ProductClassificationReclassificationRun | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const toggleStatus = useCallback((status: ReclassificationStatus) => {
    setStatuses((current) =>
      current.includes(status)
        ? current.filter((value) => value !== status)
        : [...current, status]
    );
  }, []);

  const run = useCallback(async () => {
    const parsedLimit = Number(limit);
    if (statuses.length === 0) {
      setValidationError('対象状態を1つ以上選択してください。');
      return;
    }
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 500) {
      setValidationError('最大件数は1から500で入力してください。');
      return;
    }
    if (startDate && endDate && startDate >= endDate) {
      setValidationError('終了日は開始日より後の日付にしてください。');
      return;
    }

    const input: CreateProductClassificationReclassificationRunRequest = {
      statuses,
      limit: parsedLimit,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    };
    setRunning(true);
    setValidationError(null);
    try {
      const response = await adminApi.createProductClassificationReclassificationRun(input);
      setResult(response.data);
    } catch (error: unknown) {
      showApiErrorAlert('再分類に失敗しました', error, '既存明細の再分類に失敗しました。');
    } finally {
      setRunning(false);
    }
  }, [endDate, limit, startDate, statuses]);

  return {
    statuses,
    toggleStatus,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    limit,
    setLimit,
    running,
    result,
    validationError,
    run,
  };
}
