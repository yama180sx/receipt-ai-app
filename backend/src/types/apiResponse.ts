/**
 * 標準 API レスポンス envelope（OpenAPI ApiSuccessEnvelope / ApiMessageEnvelope）
 */
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiMessageResponse = {
  success: true;
  message: string;
};
