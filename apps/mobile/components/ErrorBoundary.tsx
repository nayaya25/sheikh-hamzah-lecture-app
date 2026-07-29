import { Component, type ErrorInfo, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Root render-error boundary. A crash in the tree below shows readable,
 * selectable error text (message + the first few stack lines) instead of the
 * native "keeps stopping" dialog, so field crashes can be diagnosed on-device.
 * Styling is intentionally self-contained (no theme/i18n) so it renders even if
 * a provider is what failed.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface to Metro / device logs for release triage.
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const stack = (error.stack ?? "").split("\n").slice(0, 8).join("\n");

    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading} selectable>
            Something went wrong
          </Text>
          <Text style={styles.message} selectable>
            {error.message || String(error)}
          </Text>
          {stack ? (
            <Text style={styles.stack} selectable>
              {stack}
            </Text>
          ) : null}
          <Text style={styles.reload} onPress={this.handleReload} suppressHighlighting>
            Tap here to try again
          </Text>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#08382A" },
  content: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 14 },
  heading: { color: "#F5D98B", fontSize: 22, fontWeight: "700" },
  message: { color: "#FFFFFF", fontSize: 15, lineHeight: 22 },
  stack: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "monospace",
  },
  reload: {
    color: "#F5D98B",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
});
