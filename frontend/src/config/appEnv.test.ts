import { afterEach, describe, expect, it } from 'vitest';
import {
  getAppDisplayName,
  getAppEnv,
  getMemberMenuTitle,
  isDevAppEnv,
} from './appEnv';

describe('appEnv', () => {
  const original = process.env.EXPO_PUBLIC_APP_ENV;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.EXPO_PUBLIC_APP_ENV;
    } else {
      process.env.EXPO_PUBLIC_APP_ENV = original;
    }
  });

  it('treats missing env as stable', () => {
    delete process.env.EXPO_PUBLIC_APP_ENV;
    expect(getAppEnv()).toBe('stable');
    expect(isDevAppEnv()).toBe(false);
    expect(getAppDisplayName()).toBe('RecAIpt');
  });

  it('detects dev env', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'dev';
    expect(getAppEnv()).toBe('dev');
    expect(isDevAppEnv()).toBe(true);
    expect(getAppDisplayName()).toBe('RecAIpt (dev)');
  });

  it('builds member menu title', () => {
    expect(getMemberMenuTitle('山本')).toBe('山本のメニュー');
    expect(getMemberMenuTitle('')).toBe('RecAIpt メニュー');
    expect(getMemberMenuTitle(undefined)).toBe('RecAIpt メニュー');
  });
});
