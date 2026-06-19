/** Backend 標準 success envelope */
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiMessageResponse = {
  success: true;
  message: string;
};
