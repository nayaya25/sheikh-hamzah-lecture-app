import { PlaceholderScreen } from "@/components/PlaceholderScreen";
import { useI18n } from "@/lib/i18n";

export default function LibraryScreen() {
  const { t, arabic } = useI18n();
  return <PlaceholderScreen title={t.library.title} arabic={arabic.library} />;
}
