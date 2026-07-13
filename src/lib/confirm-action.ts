import { Alert, Platform } from 'react-native';

type ConfirmActionOptions = {
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
};

export function confirmAction({
  title,
  message,
  cancelLabel,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmActionOptions) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n\n${message}`)) void onConfirm();
    else onCancel?.();
    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel', onPress: onCancel },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => void onConfirm() },
  ], { cancelable: true, onDismiss: onCancel });
}
