import { describe, expect, it, vi } from 'vitest';
import { createSessionExpiryRecovery } from './sessionExpiryRecovery';

describe('createSessionExpiryRecovery', () => {
  it('clears the in-memory session and notifies only once for concurrent 401 responses', async () => {
    const clearInMemorySession = vi.fn();
    const clearPersistedSession = vi.fn().mockResolvedValue(undefined);
    const notifyUser = vi.fn();
    const recovery = createSessionExpiryRecovery({
      clearInMemorySession,
      clearPersistedSession,
      notifyUser,
    });

    expect(recovery.recover()).toBe(true);
    expect(recovery.recover()).toBe(false);

    expect(clearInMemorySession).toHaveBeenCalledTimes(1);
    expect(notifyUser).toHaveBeenCalledTimes(1);
    expect(clearPersistedSession).toHaveBeenCalledTimes(1);
  });

  it('can recover again after a subsequent successful login resets it', () => {
    const clearInMemorySession = vi.fn();
    const clearPersistedSession = vi.fn().mockResolvedValue(undefined);
    const notifyUser = vi.fn();
    const recovery = createSessionExpiryRecovery({
      clearInMemorySession,
      clearPersistedSession,
      notifyUser,
    });

    recovery.recover();
    recovery.reset();
    expect(recovery.recover()).toBe(true);
    expect(clearInMemorySession).toHaveBeenCalledTimes(2);
  });

  it('keeps the user recovery flow working even if persistent storage cleanup fails', async () => {
    const onPersistenceError = vi.fn();
    const recovery = createSessionExpiryRecovery({
      clearInMemorySession: vi.fn(),
      clearPersistedSession: vi.fn().mockRejectedValue(new Error('storage unavailable')),
      notifyUser: vi.fn(),
      onPersistenceError,
    });

    expect(recovery.recover()).toBe(true);
    await Promise.resolve();
    expect(onPersistenceError).toHaveBeenCalledOnce();
  });
});
