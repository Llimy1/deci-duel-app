import React, { Component, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C, FONTS, FS, S } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>앱 오류가 발생했습니다</Text>
          <Text style={styles.message}>{this.state.error?.message ?? '알 수 없는 오류'}</Text>
          <Pressable style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>다시 시도</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S[6],
    gap: S[4],
  },
  title: {
    fontFamily: FONTS.headBold,
    fontSize: FS.lg,
    color: C.text,
    textAlign: 'center',
  },
  message: {
    fontFamily: FONTS.body,
    fontSize: FS.sm,
    color: C.textDim,
    textAlign: 'center',
  },
  button: {
    marginTop: S[4],
    paddingHorizontal: S[6],
    paddingVertical: S[3],
    backgroundColor: C.pink,
    borderRadius: 12,
  },
  buttonText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: '#fff',
  },
});
