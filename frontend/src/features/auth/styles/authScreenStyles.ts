import { StyleSheet } from 'react-native';
import { borderRadius, spacing } from '../../../theme';

/** Issue #100-7 (#431): ログイン画面の共通スタイル（theme token + formStyles 準拠） */
export const authScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl + spacing.sm,
    paddingBottom: spacing.xl + spacing.md,
  },
  scrollContentCentered: {
    justifyContent: 'center',
  },
  scrollContentTotp: {
    justifyContent: 'flex-start',
    paddingTop: spacing.lg,
    paddingBottom: 160,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  familyLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  secretBox: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  secretLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  secretText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  inputWrapper: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: 'white',
    fontSize: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: 'white',
    width: '100%',
    padding: spacing.md + 2,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md - 4,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    width: '100%',
    padding: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
  },
  linkButton: {
    width: '100%',
    padding: spacing.md - 4,
    alignItems: 'center',
  },
  linkButtonText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  memberList: {
    maxHeight: 280,
    width: '100%',
    marginBottom: spacing.md,
  },
  memberListContent: {
    gap: spacing.md - 4,
  },
  memberButton: {
    backgroundColor: 'white',
    padding: spacing.md + 2,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  memberButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});
