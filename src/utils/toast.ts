export type ToastType = 'error' | 'success' | 'info';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

type Listener = (options: ToastOptions) => void;

let _listener: Listener | null = null;

export const Toast = {
  show(options: ToastOptions) {
    _listener?.(options);
  },
  error(message: string, duration?: number) {
    _listener?.({ message, type: 'error', duration });
  },
  success(message: string, duration?: number) {
    _listener?.({ message, type: 'success', duration });
  },
  info(message: string, duration?: number) {
    _listener?.({ message, type: 'info', duration });
  },
  _register(fn: Listener) {
    _listener = fn;
  },
  _unregister() {
    _listener = null;
  },
};
